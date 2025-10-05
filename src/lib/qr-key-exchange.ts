import { encode as cborEncode, decode as cborDecode } from 'cbor-x';
import baseX from 'base-x';

// Base45 alphabet (samma som EU Digital COVID Certificate)
const BASE45_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const base45 = baseX(BASE45_ALPHABET);

export interface QRKeyData {
  n: string;      // namn (förkortat från name)
  k: {            // key (förkortat från publicKeyJWK, endast nödvändiga fält)
    kty: string;  // key type
    n: string;    // modulus
    e: string;    // exponent
  };
  t: number;      // timestamp (förkortat från timestamp)
}

/**
 * Konverterar en publik nyckel till QR-kod-format (CBOR + Base45)
 * Minimerad version med endast nödvändiga fält
 */
export function encodeKeyForQR(name: string, publicKeyJWK: any): string {
  // Extrahera endast nödvändiga fält från JWK för att minimera storlek
  const keyData: QRKeyData = {
    n: name,
    k: {
      kty: publicKeyJWK.kty,
      n: publicKeyJWK.n,
      e: publicKeyJWK.e
    },
    t: Date.now()
  };
  
  // Encode to CBOR (kompakt binärt format)
  const cborData = cborEncode(keyData);
  
  // Convert to Uint8Array if needed
  const uint8Array = cborData instanceof Uint8Array ? cborData : new Uint8Array(cborData);
  
  // Encode to Base45 (effektivare än Base64 för QR-koder)
  const base45Data = base45.encode(uint8Array);
  
  // Add prefix and remove any whitespace
  return `KEY1:${base45Data}`.replace(/\s/g, '');
}

/**
 * Dekoderar en QR-kod tillbaka till nyckeldata
 */
export function decodeKeyFromQR(qrData: string): QRKeyData {
  // Ta bort alla mellanslag och prefix
  const cleanData = qrData.replace(/\s/g, '');
  
  if (!cleanData.startsWith('KEY1:')) {
    throw new Error('Invalid QR code format');
  }
  
  const base45Data = cleanData.substring(5);
  
  // Decode from Base45
  const cborData = base45.decode(base45Data);
  
  // Decode from CBOR
  const keyData = cborDecode(cborData) as QRKeyData;
  
  return keyData;
}

/**
 * Validerar att nyckeldata är giltig
 */
export function validateKeyData(keyData: QRKeyData): boolean {
  if (!keyData.n || typeof keyData.n !== 'string') {
    return false;
  }
  
  if (!keyData.k || typeof keyData.k !== 'object') {
    return false;
  }
  
  // Validera att nödvändiga JWK-fält finns
  if (!keyData.k.kty || !keyData.k.n || !keyData.k.e) {
    return false;
  }
  
  if (!keyData.t || typeof keyData.t !== 'number') {
    return false;
  }
  
  // Kolla att nyckeln inte är för gammal (24 timmar)
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  if (Date.now() - keyData.t > maxAge) {
    return false;
  }
  
  return true;
}

/**
 * Konverterar minimerad QRKeyData tillbaka till full JWK-format
 */
export function qrKeyDataToJWK(keyData: QRKeyData): { name: string; publicKeyJWK: any } {
  return {
    name: keyData.n,
    publicKeyJWK: {
      kty: keyData.k.kty,
      n: keyData.k.n,
      e: keyData.k.e,
      alg: 'RSA-OAEP-256',
      ext: true
    }
  };
}
