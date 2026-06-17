import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const APP_SECRET = process.env.APP_SECRET || (() => {
  const secret = crypto.randomBytes(32).toString('hex');
  console.warn('[AVISO] APP_SECRET não definido via env. Gerando temporário. Defina APP_SECRET no .env');
  return secret;
})();

const IV_LENGTH = 16;

function deriveKey(salt: Buffer): Buffer {
  return crypto.scryptSync(APP_SECRET, salt, 32);
}

export function encrypt(text: string): string {
  const salt = crypto.randomBytes(16);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return '';
    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const key = deriveKey(salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}
