/**
 * DropLocker Crypto Utilities
 * AES-256-GCM authenticated encryption for file and key operations.
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;      // GCM recommended IV length
const TAG_LENGTH = 16;     // GCM auth tag length
const KEY_LENGTH = 32;     // 256-bit key

/**
 * Get the master key from environment, decoded from base64.
 */
function getMasterKey() {
  const b64 = process.env.MASTER_KEY;
  if (!b64) throw new Error('MASTER_KEY not set in environment');
  return Buffer.from(b64, 'base64');
}

/**
 * Encrypt plaintext bytes with the master key.
 * Returns a base64 string: iv(12) + authTag(16) + ciphertext
 */
function masterEncrypt(plainBuffer) {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Pack: iv + tag + ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt a base64-encoded blob with the master key.
 * Expects format: iv(12) + authTag(16) + ciphertext
 */
function masterDecrypt(b64) {
  const key = getMasterKey();
  const data = Buffer.from(b64, 'base64');
  if (data.length < IV_LENGTH + TAG_LENGTH + 1) return null;

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Encrypt a file buffer with a random per-file key.
 * Returns { encryptedBlob: Buffer, fileKey: Buffer }
 * Blob format: iv(12) + authTag(16) + ciphertext
 */
function encryptFile(fileBuffer) {
  const fileKey = crypto.randomBytes(KEY_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, fileKey, iv);
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  const encryptedBlob = Buffer.concat([iv, tag, encrypted]);
  return { encryptedBlob, fileKey };
}

/**
 * Decrypt a file blob with the given file key.
 * Expects blob format: iv(12) + authTag(16) + ciphertext
 */
function decryptFile(blob, fileKey) {
  if (blob.length < IV_LENGTH + TAG_LENGTH + 1) return null;

  const iv = blob.subarray(0, IV_LENGTH);
  const tag = blob.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = blob.subarray(IV_LENGTH + TAG_LENGTH);

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, fileKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    return null;
  }
}

/**
 * Generate a random file ID (16 hex characters).
 */
function generateFileId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Generate a random master key (base64-encoded 32 bytes).
 */
function generateMasterKeyBase64() {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

module.exports = {
  masterEncrypt,
  masterDecrypt,
  encryptFile,
  decryptFile,
  generateFileId,
  generateMasterKeyBase64,
};
