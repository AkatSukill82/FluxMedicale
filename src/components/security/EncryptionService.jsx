// Service de chiffrement côté client pour données sensibles
// Note: Base44 chiffre déjà au repos, ceci ajoute une couche supplémentaire

const generateKey = async () => {
  return await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

const encryptData = async (data, key) => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );
  
  return {
    encrypted: Array.from(new Uint8Array(encryptedBuffer)),
    iv: Array.from(iv)
  };
};

const decryptData = async (encryptedData, key, iv) => {
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(encryptedData)
  );
  
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decryptedBuffer));
};

export const EncryptionService = {
  generateKey,
  encryptData,
  decryptData,
  
  // Masquer les données sensibles dans les logs
  maskSensitiveData: (data) => {
    const masked = { ...data };
    const sensitiveFields = ['niss', 'numero_mutuelle', 'telecom', 'address'];
    
    sensitiveFields.forEach(field => {
      if (masked[field]) {
        if (typeof masked[field] === 'string') {
          masked[field] = '***MASKED***';
        } else if (Array.isArray(masked[field])) {
          masked[field] = masked[field].map(() => '***MASKED***');
        }
      }
    });
    
    return masked;
  }
};