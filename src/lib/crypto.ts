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
  // Generate a symmetric Data Encryption Key (DEK) using Web Crypto API
  const dek = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Generate a random IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the actual data with the DEK using AES-GCM
  const encodedData = new TextEncoder().encode(JSON.stringify(data));
  const encryptedDataBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    dek,
    encodedData
  );
  
  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + encryptedDataBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedDataBuffer), iv.length);
  const encryptedData = btoa(String.fromCharCode(...combined));
  
  // Export DEK to raw format for encryption
  const dekRaw = await crypto.subtle.exportKey('raw', dek);
  
  // Encrypt the DEK for each recipient using jose
  const recipientKeys = await Promise.all(
    recipients.map(async (recipient) => {
      const encryptedDEK = await new jose.CompactEncrypt(
        new Uint8Array(dekRaw)
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
    encryptedData,
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
  const { plaintext: dekRaw } = await jose.compactDecrypt(
    recipientKey.encryptedDEK,
    privateKey
  );
  
  // Import the DEK
  const dek = await crypto.subtle.importKey(
    'raw',
    dekRaw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  // Decode the base64 encrypted data
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  // Extract IV (first 12 bytes) and encrypted data
  const iv = combined.slice(0, 12);
  const encryptedDataBuffer = combined.slice(12);
  
  // Decrypt the actual data using the DEK
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    dek,
    encryptedDataBuffer
  );
  
  const decryptedText = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decryptedText);
}

// Revoke access by removing a recipient from the keystone
export function revokeAccess(keystone: Keystone, recipientName: string): Keystone {
  return {
    ...keystone,
    recipients: keystone.recipients.filter(r => r.name !== recipientName)
  };
}
