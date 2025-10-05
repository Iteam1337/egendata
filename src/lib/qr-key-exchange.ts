import { encode as cborEncode, decode as cborDecode } from 'cbor-x';
import baseX from 'base-x';

// Base45 alphabet (för QR-koder - optimerat för alphanumeric mode)
const BASE45_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ=$%*+-./:';
const base45 = baseX(BASE45_ALPHABET);

export interface QRKeyData {
  n: string;      // namn
  k: {            // key (endast nödvändiga fält)
    kty: string;  // key type
    n: string;    // modulus
    e: string;    // exponent
  };
  t: number;      // timestamp
}

/**
 * Konverterar en publik nyckel till QR-kod-format (CBOR + Base45)
 * Base45 är optimerat för QR-kodens alphanumeric mode
 */
export function encodeKeyForQR(name: string, publicKeyJWK: any): string {
  const keyData: QRKeyData = {
    n: name,
    k: {
      kty: publicKeyJWK.kty,
      n: publicKeyJWK.n,
      e: publicKeyJWK.e
    },
    t: Date.now()
  };
  
  const cborData = cborEncode(keyData);
  const uint8Array = cborData instanceof Uint8Array ? cborData : new Uint8Array(cborData);
  return base45.encode(uint8Array);
}

/**
 * Konverterar en publik nyckel till copy/paste-format (samma som QR)
 */
export function encodeKeyForCopy(name: string, publicKeyJWK: any): string {
  return encodeKeyForQR(name, publicKeyJWK);
}

/**
 * Dekoderar en nyckel tillbaka till nyckeldata
 */
export function decodeKeyFromQR(keyString: string): QRKeyData {
  const cleanData = keyString.replace(/\s/g, '');
  const cborData = base45.decode(cleanData);
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
  
  if (!keyData.k.kty || !keyData.k.n || !keyData.k.e) {
    return false;
  }
  
  if (!keyData.t || typeof keyData.t !== 'number') {
    return false;
  }
  
  // Kolla att nyckeln inte är för gammal (24 timmar)
  const maxAge = 24 * 60 * 60 * 1000;
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
