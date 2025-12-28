/**
 * Token Encryption Service
 *
 * Purpose: Encrypt and decrypt OAuth tokens before storing in SQLite database
 * Uses: AES encryption with crypto-js library
 * Key: Stored in ENCRYPTION_KEY environment variable
 */

import CryptoJS from 'crypto-js';

export class EncryptionService {
  private static getKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    return key;
  }

  /**
   * Encrypt a plaintext token
   * @param token - The plaintext token to encrypt
   * @returns Encrypted token as string
   */
  static encrypt(token: string): string {
    const key = this.getKey();
    return CryptoJS.AES.encrypt(token, key).toString();
  }

  /**
   * Decrypt an encrypted token
   * @param encryptedToken - The encrypted token
   * @returns Decrypted plaintext token
   */
  static decrypt(encryptedToken: string): string {
    const key = this.getKey();
    const bytes = CryptoJS.AES.decrypt(encryptedToken, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
