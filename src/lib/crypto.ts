import * as jose from 'jose';

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyJWK: jose.JWK;
}

export interface Keystone {
  encryptedKey: string;
  recipients: {
    name: string;
    encryptedDEK: string;
  }[];
}

// Generate a key pair for a user
export async function generateKeyPair(name: string): Promise<KeyPair> {
  const { publicKey, privateKey } = await jose.generateKeyPair('RSA-OAEP-256');
  const publicKeyJWK = await jose.exportJWK(publicKey);
  
  return {
    publicKey,
    privateKey,
    publicKeyJWK
  };
}

// Encrypt data with shared access
export async function encryptWithSharedAccess(
  data: object,
  recipients: { name: string; publicKey: CryptoKey }[]
): Promise<{ encryptedData: string; keystone: Keystone }> {
  // Generate a Data Encryption Key (DEK)
  const dek = await jose.generateSecret('A256GCM');
  
  // Encrypt the actual data with the DEK
  const jwe = await new jose.CompactEncrypt(
    new TextEncoder().encode(JSON.stringify(data))
  )
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(dek);
  
  // Export DEK to encrypt it for each recipient
  const dekJWK = await jose.exportJWK(dek);
  
  // Encrypt the DEK for each recipient
  const recipientKeys = await Promise.all(
    recipients.map(async (recipient) => {
      const encryptedDEK = await new jose.CompactEncrypt(
        new TextEncoder().encode(JSON.stringify(dekJWK))
      )
        .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
        .encrypt(recipient.publicKey);
      
      return {
        name: recipient.name,
        encryptedDEK
      };
    })
  );
  
  return {
    encryptedData: jwe,
    keystone: {
      encryptedKey: 'keystone-v1',
      recipients: recipientKeys
    }
  };
}

// Decrypt data using a recipient's private key
export async function decryptData(
  encryptedData: string,
  keystone: Keystone,
  recipientName: string,
  privateKey: CryptoKey
): Promise<object> {
  // Find the encrypted DEK for this recipient
  const recipientKey = keystone.recipients.find(r => r.name === recipientName);
  if (!recipientKey) {
    throw new Error(`No access key found for ${recipientName}`);
  }
  
  // Decrypt the DEK using the recipient's private key
  const { plaintext: dekData } = await jose.compactDecrypt(
    recipientKey.encryptedDEK,
    privateKey
  );
  
  const dekJWK = JSON.parse(new TextDecoder().decode(dekData));
  const dek = await jose.importJWK(dekJWK, 'A256GCM');
  
  // Decrypt the actual data using the DEK
  const { plaintext } = await jose.compactDecrypt(encryptedData, dek);
  
  return JSON.parse(new TextDecoder().decode(plaintext));
}

// Revoke access by removing a recipient from the keystone
export function revokeAccess(keystone: Keystone, recipientName: string): Keystone {
  return {
    ...keystone,
    recipients: keystone.recipients.filter(r => r.name !== recipientName)
  };
}
