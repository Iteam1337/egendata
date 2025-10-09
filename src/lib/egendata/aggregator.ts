import { AggregationKeystone, AuthorizedServices, ServiceKeystone } from './types';
import { IPFSStorage } from './ipfs-storage';
import * as jose from 'jose';

/**
 * Aggregates Service Keystones into a single Aggregation Keystone
 */
export class Aggregator {
  private storage: IPFSStorage;
  private authorizedServicesCid: string;
  private version: number = 0;
  private resolutionTimeout: number = 30000; // 30 seconds

  constructor(storage: IPFSStorage, authorizedServicesCid: string) {
    this.storage = storage;
    this.authorizedServicesCid = authorizedServicesCid;
  }

  /**
   * Set IPNS resolution timeout (in milliseconds)
   */
  setResolutionTimeout(timeout: number): void {
    this.resolutionTimeout = timeout;
  }

  /**
   * Aggregate all Service Keystones into Aggregation Keystone
   */
  async aggregate(
    recipients: { name: string; publicKey: CryptoKey }[]
  ): Promise<{ keystone: AggregationKeystone; cid: string }> {
    console.log('🔄 Starting aggregation...');

    // Fetch Authorized Services
    const authorizedServices = await this.fetchAuthorizedServices();
    if (!authorizedServices) {
      throw new Error('Failed to fetch Authorized Services');
    }

    console.log(`📋 Authorized Services loaded: ${authorizedServices.services.length} services`);

    // Fetch all Service Keystones
    const serviceResults = await Promise.allSettled(
      authorizedServices.services.map(service => this.fetchServiceKeystone(service.serviceIpns))
    );

    const servicesIncluded: string[] = [];
    const missingServices: string[] = [];
    const aggregatedData: Record<string, any> = {};

    authorizedServices.services.forEach((service, index) => {
      const result = serviceResults[index];
      if (result.status === 'fulfilled' && result.value) {
        servicesIncluded.push(service.id);
        aggregatedData[service.id] = result.value.data;
        console.log(`✅ Included service: ${service.id}`);
      } else {
        missingServices.push(service.id);
        console.warn(`⚠️ Missing service: ${service.id}`);
      }
    });

    // Generate DEK for aggregated data
    const dek = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Encrypt aggregated data
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(aggregatedData));
    const encryptedDataBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      dek,
      encodedData
    );

    const combined = new Uint8Array(iv.length + encryptedDataBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedDataBuffer), iv.length);
    const payload = btoa(String.fromCharCode(...combined));

    // Wrap DEK for recipients
    const dekRaw = await crypto.subtle.exportKey('raw', dek);
    const keyring = await Promise.all(
      recipients.map(async (recipient) => {
        const wrappedKey = await new jose.CompactEncrypt(
          new Uint8Array(dekRaw)
        )
          .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
          .encrypt(recipient.publicKey);

        return {
          name: recipient.name,
          wrappedKey
        };
      })
    );

    this.version++;

    const aggregationKeystone: AggregationKeystone = {
      type: 'egendata.keystone.aggregation',
      schema: '1.0',
      keyring,
      payload,
      metadata: {
        version: this.version,
        created: new Date().toISOString(),
        aggregation: {
          authorizedServicesCid: this.authorizedServicesCid,
          servicesIncluded,
          missingServices
        }
      }
    };

    // Store in IPFS
    const tempKey = `aggregation-${this.version}`;
    await this.storage.set(tempKey, aggregationKeystone as any);
    const cid = this.storage.getCID(tempKey);

    if (!cid) {
      throw new Error('Failed to get CID after storing aggregation');
    }

    console.log(`✅ Aggregation complete: ${servicesIncluded.length} services, ${missingServices.length} missing`);

    return { keystone: aggregationKeystone, cid };
  }

  /**
   * Fetch Authorized Services from IPFS
   */
  private async fetchAuthorizedServices(): Promise<AuthorizedServices | null> {
    try {
      const data = await this.storage.getByCID(this.authorizedServicesCid);
      return data as unknown as AuthorizedServices;
    } catch (error) {
      console.error('❌ Error fetching Authorized Services:', error);
      return null;
    }
  }

  /**
   * Fetch Service Keystone from Service IPNS
   */
  private async fetchServiceKeystone(serviceIpns: string): Promise<{ data: any } | null> {
    try {
      // Extract IPNS name from path (e.g., /ipns/k51... -> k51...)
      const ipnsName = serviceIpns.replace('/ipns/', '');
      
      // Resolve IPNS to CID with timeout
      const cidPromise = this.storage.resolveIPNS(ipnsName);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('IPNS resolution timeout')), this.resolutionTimeout)
      );
      
      const cid = await Promise.race([cidPromise, timeoutPromise]);
      
      // Fetch the Service Keystone
      const keystone = await this.storage.getByCID(cid);
      
      // For now, return mock decrypted data (in real impl, would decrypt)
      return { data: keystone };
    } catch (error) {
      console.error(`❌ Error fetching service keystone from ${serviceIpns}:`, error);
      return null;
    }
  }
}
