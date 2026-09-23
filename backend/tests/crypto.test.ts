import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../src/utils/crypto';

describe('Crypto (AES-256-GCM Token Encryption)', () => {
  it('encrypts and successfully decrypts a Slack OAuth token', () => {
    const originalToken = 'test-slack-token-for-encryption-testing-only';

    const ciphertext = encrypt(originalToken);
    expect(ciphertext).toBeDefined();
    expect(ciphertext).not.toEqual(originalToken);
    expect(ciphertext.split(':').length).toBe(3); // iv:authTag:encryptedHex

    const decrypted = decrypt(ciphertext);
    expect(decrypted).toEqual(originalToken);
  });

  it('produces different ciphertexts for the same plaintext due to random IVs', () => {
    const token = 'xoxp-sample-token-string';
    const cipher1 = encrypt(token);
    const cipher2 = encrypt(token);

    expect(cipher1).not.toEqual(cipher2);
    expect(decrypt(cipher1)).toEqual(token);
    expect(decrypt(cipher2)).toEqual(token);
  });

  it('throws an error if ciphertext has been tampered with', () => {
    const originalToken = 'secret-slack-token';
    const ciphertext = encrypt(originalToken);
    const parts = ciphertext.split(':');

    // Tamper with encrypted data
    const tampered = `${parts[0]}:${parts[1]}:bad000${parts[2].slice(6)}`;
    expect(() => decrypt(tampered)).toThrow();
  });
});
