import { OAuth2Client } from 'google-auth-library';

/**
 * Creates an OAuth2Client instance from an access token.
 * This allows the server to use tokens provided by the client
 * instead of managing OAuth flow and token storage.
 * 
 * @param accessToken - The access token to use for API requests
 * @returns OAuth2Client configured with the provided token
 */
export function createOAuth2ClientFromToken(accessToken: string): OAuth2Client {
  // Create a minimal OAuth2Client without client credentials
  // since we're just using a pre-existing access token
  const client = new OAuth2Client();
  
  // Set the access token credentials
  client.setCredentials({
    access_token: accessToken
  });
  
  return client;
}

/**
 * Validates that an access token string is present and non-empty
 * @param token - The token to validate
 * @returns true if token is valid, false otherwise
 */
export function isValidTokenString(token: string | undefined | null): token is string {
  return typeof token === 'string' && token.trim().length > 0;
}
