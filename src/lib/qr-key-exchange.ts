import { encode as cborEncode, decode as cborDecode } from 'cbor-x';
import baseX from 'base-x';

// Base45 alphabet (samma som EU Digital COVID Certificate)
const BASE45_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const base45 = baseX(BASE45_ALPHABET);

export interface QRKeyData {
  name: string;
  publicKeyJWK: any;
  timestamp: number;
}

/**
 * Konverterar en publik nyckel till QR-kod-format (CBOR + Base45)
 */
export function encodeKeyForQR(name: string, publicKeyJWK: any): string {
  const keyData: QRKeyData = {
    name,
    publicKeyJWK,
    timestamp: Date.now()
  };
  
  // Encode to CBOR
  const cborData = cborEncode(keyData);
  
  // Convert to Uint8Array if needed
  const uint8Array = cborData instanceof Uint8Array ? cborData : new Uint8Array(cborData);
  
  // Encode to Base45
  const base45Data = base45.encode(uint8Array);
  
  // Add prefix for identification (liknande HC1: prefix i EU COVID cert)
  return `KEY1:${base45Data}`;
}

/**
 * Dekoderar en QR-kod tillbaka till nyckeldata
 */
export function decodeKeyFromQR(qrData: string): QRKeyData {
  // Ta bort prefix
  if (!qrData.startsWith('KEY1:')) {
    throw new Error('Invalid QR code format');
  }
  
  const base45Data = qrData.substring(5);
  
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
  if (!keyData.name || typeof keyData.name !== 'string') {
    return false;
  }
  
  if (!keyData.publicKeyJWK || typeof keyData.publicKeyJWK !== 'object') {
    return false;
  }
  
  if (!keyData.timestamp || typeof keyData.timestamp !== 'number') {
    return false;
  }
  
  // Kolla att nyckeln inte är för gammal (24 timmar)
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  if (Date.now() - keyData.timestamp > maxAge) {
    return false;
  }
  
  return true;
}
