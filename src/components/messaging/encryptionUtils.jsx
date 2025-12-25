// Simulation de chiffrement AES-256-GCM côté client
// En production, utiliser Web Crypto API avec clés dérivées

const ENCRYPTION_PREFIX = 'ENC:v1:';

// Encode message to base64 (simulation de chiffrement)
// En production réelle, utiliser SubtleCrypto avec AES-GCM
export function encryptMessage(plainText) {
  if (!plainText) return '';
  
  try {
    // Simulation: en production, utiliser Web Crypto API
    // const key = await deriveKey(userKey, salt);
    // const iv = crypto.getRandomValues(new Uint8Array(12));
    // const encrypted = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, data);
    
    const encoded = btoa(unescape(encodeURIComponent(plainText)));
    const timestamp = Date.now().toString(36);
    return `${ENCRYPTION_PREFIX}${timestamp}:${encoded}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return plainText;
  }
}

// Decode message from base64 (simulation de déchiffrement)
export function decryptMessage(encryptedText) {
  if (!encryptedText) return '';
  
  try {
    if (!encryptedText.startsWith(ENCRYPTION_PREFIX)) {
      return encryptedText; // Message non chiffré (legacy)
    }
    
    const withoutPrefix = encryptedText.slice(ENCRYPTION_PREFIX.length);
    const parts = withoutPrefix.split(':');
    const encoded = parts.slice(1).join(':');
    
    return decodeURIComponent(escape(atob(encoded)));
  } catch (error) {
    console.error('Decryption error:', error);
    return '[Message illisible]';
  }
}

// Générer une clé de conversation unique
export function generateConversationKey() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Vérifier si un message est chiffré
export function isEncrypted(text) {
  return text?.startsWith(ENCRYPTION_PREFIX);
}

// Hash pour vérification d'intégrité
export async function hashMessage(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}