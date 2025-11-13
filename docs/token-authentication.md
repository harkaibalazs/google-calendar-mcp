# Token-Based Authentication

This guide explains how to use the Google Calendar MCP server with token-based authentication via the `X-Authorization` header, eliminating the need for OAuth flow and token storage.

## Overview

The MCP server now supports two authentication modes:

1. **Traditional OAuth Flow** (default): Uses OAuth 2.0 authorization code flow with local token storage
2. **Token-Based Authentication** (new): Accepts access tokens via HTTP headers

Token-based authentication is ideal for scenarios where:
- You already have a valid Google access token from another authentication flow
- You want to integrate with an existing authentication system
- You need to support multiple users without managing separate token files
- You're running the server in a stateless environment (e.g., serverless, containers)

## How It Works

When using HTTP transport, the server checks for an `X-Authorization` header in incoming requests. If present, the server uses the provided token instead of the traditional OAuth flow.

```
Client Request → HTTP Transport → Extract X-Authorization → Create OAuth2Client → Execute Tool
```

The token is scoped to the individual request using AsyncLocalStorage, ensuring thread-safe, isolated authentication per request.

## Setup

### Step 1: Start the Server with Token Authentication

Set the `SKIP_OAUTH` environment variable to disable traditional OAuth initialization:

```bash
# Using environment variables
export SKIP_OAUTH=true
npm run start:http

# Or inline
SKIP_OAUTH=true npm run start:http -- --port 3000
```

This tells the server to skip OAuth credentials file loading and token storage initialization.

### Step 2: Obtain a Google Access Token

You need a valid Google Calendar API access token. You can obtain one through:

#### Option A: Using OAuth 2.0 Playground
1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) to configure settings
3. Check "Use your own OAuth credentials" if using custom credentials
4. In "Step 1", select "Calendar API v3" and choose the required scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. Click "Authorize APIs" and complete the consent flow
6. In "Step 2", click "Exchange authorization code for tokens"
7. Copy the `access_token` from the response

#### Option B: Using Your Own OAuth Flow
Implement OAuth 2.0 in your application and obtain the access token for the user. The token should have the following scopes:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

#### Option C: Using Service Accounts
For server-to-server authentication:
1. Create a service account in Google Cloud Console
2. Enable domain-wide delegation (if needed)
3. Generate and download the service account key
4. Use a library like `google-auth-library` to generate access tokens

### Step 3: Make Requests with the Access Token

Include the access token in the `X-Authorization` header when making requests to the MCP server:

```bash
# Example using curl
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -H "X-Authorization: ya29.a0AfH6SMBx..." \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list-calendars",
      "arguments": {}
    }
  }'
```

```javascript
// Example using JavaScript fetch
const response = await fetch('http://localhost:3000', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Authorization': 'ya29.a0AfH6SMBx...'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'list-events',
      arguments: {
        calendarId: 'primary',
        timeMin: '2024-01-01T00:00:00',
        timeMax: '2024-12-31T23:59:59'
      }
    }
  })
});

const data = await response.json();
console.log(data);
```

```python
# Example using Python requests
import requests

response = requests.post(
    'http://localhost:3000',
    headers={
        'Content-Type': 'application/json',
        'X-Authorization': 'ya29.a0AfH6SMBx...'
    },
    json={
        'jsonrpc': '2.0',
        'id': 1,
        'method': 'tools/call',
        'params': {
            'name': 'list-calendars',
            'arguments': {}
        }
    }
)

print(response.json())
```

## Hybrid Mode (Both Authentication Methods)

You can run the server to support both authentication methods simultaneously:

```bash
# Start without SKIP_OAUTH - OAuth is available but optional
npm run start:http
```

In this mode:
- Requests with `X-Authorization` header use token-based auth
- Requests without the header fall back to traditional OAuth flow
- This is useful for migration scenarios or supporting multiple client types

## Security Considerations

### Token Lifecycle Management

**Token Expiration**: Access tokens typically expire after 1 hour. The client is responsible for:
- Monitoring token expiration
- Refreshing tokens before they expire
- Handling authentication errors and re-authenticating

**Token Refresh**: The server does NOT automatically refresh tokens in token-based mode. You must implement token refresh in your client:

```javascript
// Example: Token refresh wrapper
async function makeAuthenticatedRequest(endpoint, options, tokenManager) {
  // Check if token is expired or expiring soon
  if (tokenManager.isTokenExpiring()) {
    await tokenManager.refreshToken();
  }
  
  const token = tokenManager.getAccessToken();
  return fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'X-Authorization': token
    }
  });
}
```

### Best Practices

1. **Use HTTPS in Production**: Always use HTTPS to protect tokens in transit
2. **Validate Token Scopes**: Ensure tokens have the necessary Calendar API scopes
3. **Implement Rate Limiting**: Add rate limiting to prevent token abuse
4. **Monitor for Invalid Tokens**: Log and alert on authentication failures
5. **Rotate Tokens Regularly**: Even though tokens expire, rotate them proactively
6. **Store Tokens Securely**: Never log or expose tokens in error messages

### Error Handling

The server will return standard Google API errors for authentication issues:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Google API error: Invalid Credentials"
  },
  "id": 1
}
```

Common authentication errors:
- `401 Unauthorized`: Token is invalid or expired
- `403 Forbidden`: Token lacks required scopes
- `429 Too Many Requests`: Rate limit exceeded

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SKIP_OAUTH` | Skip OAuth initialization, use token-based auth only | `false` |
| `PORT` | HTTP server port | `3000` |
| `HOST` | HTTP server host | `127.0.0.1` |
| `TRANSPORT` | Transport type (`stdio` or `http`) | `stdio` |

## Troubleshooting

### Token Not Recognized

**Problem**: Requests return authentication errors despite providing a token

**Solutions**:
1. Verify the token is valid using Google's tokeninfo endpoint:
   ```bash
   curl https://oauth2.googleapis.com/tokeninfo?access_token=YOUR_TOKEN
   ```
2. Ensure the `X-Authorization` header is set correctly (no `Bearer` prefix needed, but supported)
3. Check that the token has the required scopes

### OAuth Credentials Not Found Error

**Problem**: Server fails to start even with `SKIP_OAUTH=true`

**Solutions**:
1. Ensure `SKIP_OAUTH` is set before starting the server
2. Check that the environment variable is exported: `echo $SKIP_OAUTH`
3. Verify you're using HTTP transport, not stdio: `--transport http`

### Mixed Authentication Requests

**Problem**: Some requests use token auth, others use OAuth, causing confusion

**Solutions**:
1. Decide on one authentication method for your deployment
2. Use `SKIP_OAUTH=true` to enforce token-based auth only
3. Document which authentication method your clients should use

## Comparison with Traditional OAuth

| Feature | Traditional OAuth | Token-Based Auth |
|---------|-------------------|------------------|
| Setup Complexity | Medium (requires OAuth credentials) | Low (just need tokens) |
| Token Management | Automatic (server handles) | Manual (client handles) |
| Multi-User Support | Requires multiple token files | Single server, multiple tokens |
| Stateless Operation | No (tokens stored locally) | Yes (no local storage) |
| Container-Friendly | No (requires persistent storage) | Yes (fully stateless) |
| Security | Server manages credentials | Client manages credentials |
| Best For | Desktop apps, single-user | Web services, multi-user APIs |

## Example Use Cases

### Use Case 1: Multi-Tenant SaaS Application

Your SaaS application has multiple users, each with their own Google Calendar. Users authenticate with your app, and you obtain Google Calendar tokens for them.

```javascript
// Your API endpoint that uses the MCP server
app.post('/api/calendar/events', async (req, res) => {
  const userToken = await getUserGoogleToken(req.user.id);
  
  const mcpResponse = await fetch('http://mcp-server:3000', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': userToken
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'list-events',
        arguments: { calendarId: 'primary' }
      }
    })
  });
  
  const data = await mcpResponse.json();
  res.json(data.result);
});
```

### Use Case 2: Serverless Function

Deploy the MCP server as a serverless function that doesn't maintain state:

```javascript
// AWS Lambda / Vercel / Netlify Function
export async function handler(event) {
  const token = event.headers['x-authorization'];
  
  // Forward to MCP server with token
  const response = await fetch(process.env.MCP_SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': token
    },
    body: event.body
  });
  
  return {
    statusCode: 200,
    body: await response.text()
  };
}
```

### Use Case 3: Development and Testing

Quickly test the MCP server with a token from OAuth Playground:

```bash
# Get a token from OAuth Playground
TOKEN="ya29.a0AfH6SMBx..."

# Start server
SKIP_OAUTH=true npm run start:http

# Make test requests
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -H "X-Authorization: $TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## See Also

- [HTTP Transport Guide](deployment.md)
- [Authentication Guide](authentication.md)
- [Architecture Overview](architecture.md)
