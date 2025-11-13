import { AsyncLocalStorage } from 'async_hooks';

/**
 * Context for storing request-specific authentication information
 */
interface RequestContext {
  accessToken?: string;
}

/**
 * AsyncLocalStorage for storing request-specific context
 * This allows passing the access token from HTTP headers through to tool handlers
 * without modifying the MCP protocol or handler signatures
 */
const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Runs a function with a specific access token in the request context
 * @param accessToken - The access token to use for this request
 * @param fn - The function to run with this context
 * @returns The result of the function
 */
export function runWithAccessToken<T>(accessToken: string, fn: () => T): T {
  return requestContext.run({ accessToken }, fn);
}

/**
 * Gets the access token from the current request context, if available
 * @returns The access token from the request context, or undefined if not set
 */
export function getRequestAccessToken(): string | undefined {
  const context = requestContext.getStore();
  return context?.accessToken;
}

/**
 * Checks if a request context with an access token is currently active
 * @returns true if there is an active request context with an access token
 */
export function hasRequestAccessToken(): boolean {
  const token = getRequestAccessToken();
  return typeof token === 'string' && token.length > 0;
}
