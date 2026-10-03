/**
 * Client-Side Cryptographic Utilities for Jal-Satark
 * Standard Browser-Native Web Crypto API (window.crypto.subtle)
 * Hybrid Encryption Architecture: RSA-OAEP (2048-bit) + AES-GCM (256-bit)
 */

// Helper: Convert ArrayBuffer to Base64 String
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 String to ArrayBuffer / Uint8Array
export function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper: Format SPKI ArrayBuffer as standard PEM string
export function spkiToPem(spkiBuffer) {
  const base64 = arrayBufferToBase64(spkiBuffer);
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

// Helper: Parse standard PEM string into clean SPKI ArrayBuffer
export function pemToSpki(pemString) {
  const cleaned = pemString
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');
  return base64ToArrayBuffer(cleaned);
}

// Helper: Format PKCS8 ArrayBuffer as standard Private Key PEM string
export function pkcs8ToPem(pkcs8Buffer) {
  const base64 = arrayBufferToBase64(pkcs8Buffer);
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
}

// Helper: Parse PKCS8 PEM string into ArrayBuffer
export function pemToPkcs8(pemString) {
  const cleaned = pemString
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  return base64ToArrayBuffer(cleaned);
}

// Helper: Calculate SHA-256 fingerprint from SPKI buffer
export async function calculateKeyFingerprint(spkiBuffer) {
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', spkiBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `SHA256:${hex.slice(0, 8)}:${hex.slice(8, 16)}:${hex.slice(16, 24)}:${hex.slice(24, 32)}`;
}

/**
 * Generates an RSA-OAEP 2048-bit key pair for a government admin / district officer.
 */
export async function generateAdminKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );

  const spkiBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const pkcs8Buffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  const publicKeyPem = spkiToPem(spkiBuffer);
  const privateKeyPem = pkcs8ToPem(pkcs8Buffer);
  const keyFingerprint = await calculateKeyFingerprint(spkiBuffer);

  return {
    publicKeyPem,
    privateKeyPem,
    keyFingerprint,
    keyPair
  };
}

/**
 * Encrypts a citizen message or structured report client-side using hybrid encryption:
 * 1. Generates ephemeral AES-GCM 256-bit key.
 * 2. Encrypts plaintext payload with AES-GCM.
 * 3. Wraps AES key with recipient admin's RSA-OAEP public key.
 */
export async function encryptForAdmin(plaintextData, adminPublicKeyPem) {
  if (!adminPublicKeyPem) {
    throw new Error('Recipient district public key is missing or not registered.');
  }

  const payloadString =
    typeof plaintextData === 'string' ? plaintextData : JSON.stringify(plaintextData);
  const encodedPayload = new TextEncoder().encode(payloadString);

  // 1. Generate ephemeral AES-GCM 256-bit key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 2. Generate 12-byte Initialization Vector (IV)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 3. Encrypt payload with AES-GCM
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encodedPayload
  );

  // 4. Import recipient admin RSA public key
  const spkiBuffer = pemToSpki(adminPublicKeyPem);
  const rsaPublicKey = await window.crypto.subtle.importKey(
    'spki',
    spkiBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['wrapKey']
  );

  // 5. Wrap AES key using RSA-OAEP public key
  const wrappedKeyBuffer = await window.crypto.subtle.wrapKey(
    'raw',
    aesKey,
    rsaPublicKey,
    { name: 'RSA-OAEP' }
  );

  return {
    encrypted_payload: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv),
    encrypted_symmetric_key: arrayBufferToBase64(wrappedKeyBuffer)
  };
}

/**
 * Decrypts an encrypted citizen report in-memory using the official's RSA private key:
 * 1. Unwraps the AES-GCM 256-bit key with RSA-OAEP private key.
 * 2. Decrypts the ciphertext using AES-GCM.
 */
export async function decryptReport(
  encryptedPayloadBase64,
  ivBase64,
  wrappedKeyBase64,
  adminPrivateKeyPem
) {
  if (!adminPrivateKeyPem) {
    throw new Error('Official private key is required to decrypt this classified report.');
  }

  // 1. Import RSA private key
  const pkcs8Buffer = pemToPkcs8(adminPrivateKeyPem);
  const rsaPrivateKey = await window.crypto.subtle.importKey(
    'pkcs8',
    pkcs8Buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['unwrapKey']
  );

  // 2. Unwrap AES key
  const wrappedKeyBuffer = base64ToArrayBuffer(wrappedKeyBase64);
  const aesKey = await window.crypto.subtle.unwrapKey(
    'raw',
    wrappedKeyBuffer,
    rsaPrivateKey,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // 3. Decrypt ciphertext with unwrapped AES key
  const ciphertextBuffer = base64ToArrayBuffer(encryptedPayloadBase64);
  const ivBuffer = base64ToArrayBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    aesKey,
    ciphertextBuffer
  );

  const decryptedText = new TextDecoder().decode(decryptedBuffer);

  try {
    return JSON.parse(decryptedText);
  } catch {
    return decryptedText;
  }
}

// Local Cryptographic Key Storage for Officer Session
const ADMIN_PRIVATE_KEY_KEY = 'jal_satark_admin_private_key';
const ADMIN_PUBLIC_KEY_KEY = 'jal_satark_admin_public_key';
const ADMIN_KEY_FINGERPRINT_KEY = 'jal_satark_admin_fingerprint';

export function getStoredAdminKeys() {
  return {
    privateKeyPem: localStorage.getItem(ADMIN_PRIVATE_KEY_KEY) || null,
    publicKeyPem: localStorage.getItem(ADMIN_PUBLIC_KEY_KEY) || null,
    fingerprint: localStorage.getItem(ADMIN_KEY_FINGERPRINT_KEY) || null
  };
}

export function saveAdminKeys(publicKeyPem, privateKeyPem, fingerprint) {
  localStorage.setItem(ADMIN_PUBLIC_KEY_KEY, publicKeyPem);
  localStorage.setItem(ADMIN_PRIVATE_KEY_KEY, privateKeyPem);
  localStorage.setItem(ADMIN_KEY_FINGERPRINT_KEY, fingerprint);
}

export function clearAdminKeys() {
  localStorage.removeItem(ADMIN_PUBLIC_KEY_KEY);
  localStorage.removeItem(ADMIN_PRIVATE_KEY_KEY);
  localStorage.removeItem(ADMIN_KEY_FINGERPRINT_KEY);
}
