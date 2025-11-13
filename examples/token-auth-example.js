/**
 * Example: Using Token-Based Authentication with Google Calendar MCP Server
 * 
 * This example demonstrates how to use the MCP server with an access token
 * instead of the traditional OAuth flow.
 * 
 * Prerequisites:
 * 1. Start the MCP server in HTTP mode with token auth enabled:
 *    SKIP_OAUTH=true npm run start:http
 * 
 * 2. Obtain a valid Google Calendar API access token (see docs/token-authentication.md)
 * 
 * Usage:
 *    node examples/token-auth-example.js <access-token>
 */

const http = require('http');

// Configuration
const MCP_SERVER_URL = 'http://localhost:3000';
const ACCESS_TOKEN = process.argv[2];

if (!ACCESS_TOKEN) {
  console.error('Error: Access token is required');
  console.error('Usage: node token-auth-example.js <access-token>');
  console.error('\nTo obtain an access token, see: docs/token-authentication.md');
  process.exit(1);
}

/**
 * Makes an MCP request with token authentication
 */
async function makeMcpRequest(method, params) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: method,
      params: params
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        'X-Authorization': ACCESS_TOKEN
      }
    };

    const req = http.request(MCP_SERVER_URL, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(`MCP Error: ${response.error.message}`));
          } else {
            resolve(response.result);
          }
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });

    req.write(requestData);
    req.end();
  });
}

/**
 * Main example execution
 */
async function main() {
  console.log('Google Calendar MCP Server - Token Authentication Example\n');
  console.log('='.repeat(60));

  try {
    // Example 1: List available tools
    console.log('\n1. Listing available tools...');
    const tools = await makeMcpRequest('tools/list', {});
    console.log(`   Found ${tools.tools.length} tools:`);
    tools.tools.slice(0, 5).forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    if (tools.tools.length > 5) {
      console.log(`   ... and ${tools.tools.length - 5} more`);
    }

    // Example 2: List calendars
    console.log('\n2. Listing calendars...');
    const calendarsResult = await makeMcpRequest('tools/call', {
      name: 'list-calendars',
      arguments: {}
    });
    const calendarsText = calendarsResult.content[0].text;
    const calendars = JSON.parse(calendarsText);
    console.log(`   Found ${calendars.calendars.length} calendar(s):`);
    calendars.calendars.forEach(cal => {
      console.log(`   - ${cal.summary} (${cal.id})`);
    });

    // Example 3: List today's events
    console.log('\n3. Listing today\'s events from primary calendar...');
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const eventsResult = await makeMcpRequest('tools/call', {
      name: 'list-events',
      arguments: {
        calendarId: 'primary',
        timeMin: todayStart.toISOString().split('.')[0],
        timeMax: todayEnd.toISOString().split('.')[0]
      }
    });
    const eventsText = eventsResult.content[0].text;
    const events = JSON.parse(eventsText);
    
    if (events.totalCount === 0) {
      console.log('   No events scheduled for today');
    } else {
      console.log(`   Found ${events.totalCount} event(s):`);
      events.events.forEach(event => {
        const startTime = event.start.dateTime || event.start.date;
        console.log(`   - ${event.summary} (${startTime})`);
      });
    }

    // Example 4: Get current time in calendar timezone
    console.log('\n4. Getting current time in calendar timezone...');
    const timeResult = await makeMcpRequest('tools/call', {
      name: 'get-current-time',
      arguments: {}
    });
    const timeText = timeResult.content[0].text;
    const timeData = JSON.parse(timeText);
    console.log(`   Current time: ${timeData.currentTime}`);
    console.log(`   Timezone: ${timeData.timeZone}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All examples completed successfully!');
    console.log('\nFor more examples, see: docs/token-authentication.md');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure the MCP server is running: SKIP_OAUTH=true npm run start:http');
    console.error('2. Verify your access token is valid');
    console.error('3. Check that the token has Calendar API scopes');
    console.error('4. See docs/token-authentication.md for more help');
    process.exit(1);
  }
}

// Run the example
main();
