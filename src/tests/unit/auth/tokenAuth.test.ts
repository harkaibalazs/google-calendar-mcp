import { describe, it, expect } from 'vitest';
import { createOAuth2ClientFromToken, isValidTokenString } from '../../../auth/tokenAuth.js';

describe('Token-based Authentication', () => {
  describe('createOAuth2ClientFromToken', () => {
    it('should create an OAuth2Client with the provided token', () => {
      const token = 'test-access-token-12345';
      const client = createOAuth2ClientFromToken(token);
      
      expect(client).toBeDefined();
      expect(client.credentials).toBeDefined();
      expect(client.credentials.access_token).toBe(token);
    });

    it('should create a client without client credentials', () => {
      const token = 'test-token';
      const client = createOAuth2ClientFromToken(token);
      
      // The client should not have client_id or client_secret
      // since we're just using a pre-existing access token
      expect(client.credentials.client_id).toBeUndefined();
      expect(client.credentials.client_secret).toBeUndefined();
    });

    it('should handle different token formats', () => {
      const tokens = [
        'ya29.a0AfH6SMBx...',
        'Bearer ya29.a0AfH6SMBx...',
        'simple-token',
        'token-with-special-chars-!@#$%'
      ];
      
      tokens.forEach(token => {
        const client = createOAuth2ClientFromToken(token);
        expect(client.credentials.access_token).toBe(token);
      });
    });
  });

  describe('isValidTokenString', () => {
    it('should return true for valid token strings', () => {
      expect(isValidTokenString('valid-token')).toBe(true);
      expect(isValidTokenString('ya29.a0AfH6SMBx...')).toBe(true);
      expect(isValidTokenString('Bearer token')).toBe(true);
      expect(isValidTokenString('   token-with-spaces   ')).toBe(true);
    });

    it('should return false for invalid token strings', () => {
      expect(isValidTokenString('')).toBe(false);
      expect(isValidTokenString('   ')).toBe(false);
      expect(isValidTokenString(null)).toBe(false);
      expect(isValidTokenString(undefined)).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidTokenString(123 as any)).toBe(false);
      expect(isValidTokenString({} as any)).toBe(false);
      expect(isValidTokenString([] as any)).toBe(false);
    });
  });
});
