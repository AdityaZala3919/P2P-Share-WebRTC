/**
 * Web Crypto API AES-256-GCM encryption & PBKDF2 key derivation.
 */
const PBKDF2_ITERATIONS = 100000;

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

function saltToHex(salt) {
  return Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hexToU8(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));
}

export async function encryptText(plaintext, passphrase) {
  const salt = generateSalt();
  const key = await deriveKey(passphrase, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer))),
    iv: saltToHex(iv),
    salt: saltToHex(salt),
  };
}

export async function decryptText(ciphertext, ivHex, saltHex, passphrase) {
  const salt = hexToU8(saltHex);
  const iv = hexToU8(ivHex);
  const key = await deriveKey(passphrase, salt);
  const cipherBuffer = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBuffer);
  return new TextDecoder().decode(decrypted);
}

export async function encryptBinary(data, passphrase) {
  const salt = generateSalt();
  const key = await deriveKey(passphrase, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer))),
    iv: saltToHex(iv),
    salt: saltToHex(salt),
  };
}

export async function decryptBinary(ciphertext, ivHex, saltHex, passphrase) {
  const salt = hexToU8(saltHex);
  const iv = hexToU8(ivHex);
  const key = await deriveKey(passphrase, salt);
  const cipherBuffer = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBuffer);
}