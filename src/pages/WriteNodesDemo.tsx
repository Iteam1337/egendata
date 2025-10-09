import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WriteNodePanel } from '@/components/WriteNodePanel';
import { AggregationPanel } from '@/components/AggregationPanel';
import { IPFSStatus } from '@/components/IPFSStatus';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  IPFSStorage,
  EgendataClient,
  AuthorizedServicesManager,
  Aggregator,
  ServiceDefinition,
  AggregationKeystone,
  type KeyPair
} from '@/lib/egendata';
import { Network, Layers, Book } from 'lucide-react';

export default function WriteNodesDemo() {
  const ipfsStorageRef = useRef<IPFSStorage>();
  const egendataRef = useRef<EgendataClient>();
  const authorizedServicesManagerRef = useRef<AuthorizedServicesManager>();

  if (!ipfsStorageRef.current) {
    ipfsStorageRef.current = new IPFSStorage();
  }
  if (!egendataRef.current) {
    egendataRef.current = new EgendataClient(ipfsStorageRef.current);
  }
  if (!authorizedServicesManagerRef.current) {
    authorizedServicesManagerRef.current = new AuthorizedServicesManager();
  }

  const ipfsStorage = ipfsStorageRef.current;
  const egendata = egendataRef.current;
  const authorizedServicesManager = authorizedServicesManagerRef.current;

  const [ipfsReady, setIpfsReady] = useState(false);
  const [ipfsInitializing, setIpfsInitializing] = useState(false);
  const [ipfsError, setIpfsError] = useState<string>();

  const [ownerKeyPair, setOwnerKeyPair] = useState<KeyPair | null>(null);
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [authorizedServicesCid, setAuthorizedServicesCid] = useState<string>('');
  const [lastAggregation, setLastAggregation] = useState<AggregationKeystone | null>(null);
  const [isAggregating, setIsAggregating] = useState(false);

  // Initialize IPFS
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setIpfsInitializing(true);
      try {
        await ipfsStorage.initialize();
        if (mounted) {
          await ipfsStorage.restore();
          setIpfsReady(true);
          
          // Generate owner keypair
          const ownerKeys = await egendata.generateKeyPair('Owner');
          setOwnerKeyPair(ownerKeys);
          
          toast.success('IPFS initialized and owner keys generated');
        }
      } catch (error) {
        console.error('IPFS init failed:', error);
        if (mounted) {
          setIpfsError(error instanceof Error ? error.message : 'IPFS failed to start');
        }
      } finally {
        if (mounted) {
          setIpfsInitializing(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAuthorizedServicesUpdate = async (updatedServices: ServiceDefinition[]) => {
    setServices(updatedServices);

    if (!ownerKeyPair) return;

    // Create Authorized Services registry
    let authorizedServices = authorizedServicesManager.createAuthorizedServices('did:key:owner');
    
    for (const service of updatedServices) {
      authorizedServices = authorizedServicesManager.addService(authorizedServices, service);
    }

    // Store Authorized Services in IPFS
    const tempKey = `authorized-services-${Date.now()}`;
    await ipfsStorage.set(tempKey, authorizedServices as any);
    const cid = ipfsStorage.getCID(tempKey);
    
    if (cid) {
      setAuthorizedServicesCid(cid);
      toast.success(`Authorized Services updated: ${cid.substring(0, 20)}...`);
    }
  };

  const handleAggregate = async () => {
    if (!authorizedServicesCid) {
      toast.error('Create an Authorized Services registry first by adding Write Nodes');
      return;
    }

    if (!ownerKeyPair) {
      toast.error('Owner keypair not initialized');
      return;
    }

    setIsAggregating(true);

    try {
      const aggregator = new Aggregator(ipfsStorage, authorizedServicesCid);
      aggregator.setResolutionTimeout(10000); // 10 seconds

      const { keystone, cid } = await aggregator.aggregate([
        { name: 'Owner', publicKey: ownerKeyPair.publicKey }
      ]);

      setLastAggregation(keystone);

      // Publish to Root IPNS (mock for now)
      await ipfsStorage.publishToIPNS(cid, 'root');

      toast.success(`Aggregation complete! CID: ${cid.substring(0, 20)}...`);
    } catch (error) {
      console.error('Aggregation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Aggregation failed');
    } finally {
      setIsAggregating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onOpenExplorer={() => {}} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Write Nodes & Aggregation</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Enable third-party services to publish data on your behalf using Write Nodes, 
              then aggregate all data sources into a single encrypted keystone.
            </p>
          </div>

          {/* IPFS Status */}
          <IPFSStatus
            isInitialized={ipfsReady}
            isInitializing={ipfsInitializing}
            error={ipfsError}
          />

          {/* Main Content */}
          {ipfsReady && ownerKeyPair && (
            <Tabs defaultValue="write-nodes" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="write-nodes">
                  <Network className="w-4 h-4 mr-2" />
                  Write Nodes
                </TabsTrigger>
                <TabsTrigger value="aggregation">
                  <Layers className="w-4 h-4 mr-2" />
                  Aggregation
                </TabsTrigger>
                <TabsTrigger value="docs">
                  <Book className="w-4 h-4 mr-2" />
                  Documentation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="write-nodes" className="space-y-4">
                <WriteNodePanel
                  authorizedServicesManager={authorizedServicesManager}
                  onAuthorizedServicesUpdate={handleAuthorizedServicesUpdate}
                />
              </TabsContent>

              <TabsContent value="aggregation" className="space-y-4">
                <AggregationPanel
                  onAggregate={handleAggregate}
                  lastAggregation={lastAggregation}
                  isAggregating={isAggregating}
                />
              </TabsContent>

              <TabsContent value="docs" className="space-y-4">
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-4">About Write Nodes</h2>
                  
                  <div className="space-y-4 text-sm">
                    <section>
                      <h3 className="font-semibold text-base mb-2">What are Write Nodes?</h3>
                      <p className="text-muted-foreground">
                        Write Nodes enable external services to publish data to your IPFS network without 
                        accessing your Root IPNS private key. Each service controls its own IPNS identity 
                        and publishes Service Keystones that can be aggregated by the owner.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mb-2">Security Model</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Root IPNS key never leaves owner's control</li>
                        <li>Each Write Node has its own IPNS keypair</li>
                        <li>Owner's Authorized Services registry lists authorized services</li>
                        <li>Aggregator only reads from authorized services</li>
                        <li>Revocation = remove from Authorized Services + rotate DEK</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mb-2">Data Flow</h3>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Service generates IPNS keypair</li>
                        <li>Owner adds service to Scope Index</li>
                        <li>Service publishes Service Keystone to its IPNS</li>
                        <li>Owner aggregates all services into Aggregation Keystone</li>
                        <li>Owner publishes to Root IPNS</li>
                        <li>Clients resolve Root IPNS → Aggregation Keystone</li>
                      </ol>
                    </section>

                    <section>
                      <h3 className="font-semibold text-base mb-2">Use Cases</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Email connectors (Gmail, Outlook) publishing inbox data</li>
                        <li>Calendar services syncing events</li>
                        <li>Health tracking apps contributing fitness data</li>
                        <li>Financial services providing transaction history</li>
                        <li>IoT devices publishing sensor readings</li>
                      </ul>
                    </section>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {!ipfsReady && !ipfsInitializing && !ipfsError && (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Initializing...</p>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
