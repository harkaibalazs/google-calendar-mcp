import { describe, it, expect } from 'vitest';
import { runWithAccessToken, getRequestAccessToken, hasRequestAccessToken } from '../../../auth/requestContext.js';

describe('Request Context', () => {
  describe('runWithAccessToken', () => {
    it('should set access token in context for the duration of the callback', () => {
      const token = 'test-token-123';
      
      runWithAccessToken(token, () => {
        expect(getRequestAccessToken()).toBe(token);
        expect(hasRequestAccessToken()).toBe(true);
      });
    });

    it('should return the result of the callback', () => {
      const token = 'test-token';
      const result = runWithAccessToken(token, () => {
        return 'callback-result';
      });
      
      expect(result).toBe('callback-result');
    });

    it('should isolate context between nested calls', () => {
      const token1 = 'token-1';
      const token2 = 'token-2';
      
      runWithAccessToken(token1, () => {
        expect(getRequestAccessToken()).toBe(token1);
        
        runWithAccessToken(token2, () => {
          expect(getRequestAccessToken()).toBe(token2);
        });
        
        // After nested call, should return to outer context
        expect(getRequestAccessToken()).toBe(token1);
      });
    });

    it('should handle async callbacks', async () => {
      const token = 'async-token';
      
      const result = await runWithAccessToken(token, async () => {
        expect(getRequestAccessToken()).toBe(token);
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(getRequestAccessToken()).toBe(token);
        return 'async-result';
      });
      
      expect(result).toBe('async-result');
    });
  });

  describe('getRequestAccessToken', () => {
    it('should return undefined when no context is set', () => {
      expect(getRequestAccessToken()).toBeUndefined();
    });

    it('should return the access token when context is set', () => {
      const token = 'context-token';
      
      runWithAccessToken(token, () => {
        expect(getRequestAccessToken()).toBe(token);
      });
    });

    it('should return undefined after context is cleared', () => {
      const token = 'temp-token';
      
      runWithAccessToken(token, () => {
        expect(getRequestAccessToken()).toBe(token);
      });
      
      expect(getRequestAccessToken()).toBeUndefined();
    });
  });

  describe('hasRequestAccessToken', () => {
    it('should return false when no context is set', () => {
      expect(hasRequestAccessToken()).toBe(false);
    });

    it('should return true when a valid token is in context', () => {
      runWithAccessToken('valid-token', () => {
        expect(hasRequestAccessToken()).toBe(true);
      });
    });

    it('should return false for empty string token', () => {
      runWithAccessToken('', () => {
        expect(hasRequestAccessToken()).toBe(false);
      });
    });

    it('should return false after context is cleared', () => {
      runWithAccessToken('token', () => {
        expect(hasRequestAccessToken()).toBe(true);
      });
      
      expect(hasRequestAccessToken()).toBe(false);
    });
  });
});
