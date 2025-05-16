export const ENCRYPTION_PREFIX = 'ENCRYPTED:';

export const encrypt = (text: string): string => {
  // Simple XOR encryption with a key
  const key = 'your-secret-key';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  // Add prefix to encrypted text
  return ENCRYPTION_PREFIX + btoa(result); // Base64 encode the result
};

export const decrypt = (encryptedText: string): string => {
  try {
    // Check if the text has our encryption prefix
    if (!encryptedText.startsWith(ENCRYPTION_PREFIX)) {
      return encryptedText; // Return original text if not encrypted
    }

    // Remove prefix and decode
    const encodedText = encryptedText.slice(ENCRYPTION_PREFIX.length);
    const decoded = atob(encodedText); // Base64 decode
    const key = 'your-secret-key';
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedText; // Return original text if decryption fails
  }
}; 