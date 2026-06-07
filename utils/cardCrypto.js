
const crypto = require('crypto');
const ALGO = 'aes-256-gcm';

function getKey() {
  const hex = process.env.CARD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error('CARD_ENCRYPTION_KEY must be a 64-char hex string');
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encryptedData: encrypted.toString('hex'),
    iv:            iv.toString('hex'),
    authTag:       cipher.getAuthTag().toString('hex'),
  };
}

function decrypt({ encryptedData, iv, authTag }) {
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedData, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { encrypt, decrypt };
