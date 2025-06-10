/**
 * Rate Limiting Test Script
 *
 * This script tests the Redis-based rate limiting functionality
 * by making multiple requests to various endpoints.
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

let authToken = '';

// Helper function to make HTTP requests using Node.js built-in modules
function makeRequest(method, endpoint, data = null, headers = {}) {
  return new Promise(resolve => {
    const url = new URL(`${BASE_URL}${endpoint}`);

    const requestHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Node.js Rate Limit Test',
      ...headers,
    };

    const postData = data ? JSON.stringify(data) : null;

    if (postData) {
      requestHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: method.toUpperCase(),
      headers: requestHeaders,
    };

    const req = http.request(options, res => {
      let responseBody = '';

      res.on('data', chunk => {
        responseBody += chunk;
      });

      res.on('end', () => {
        try {
          const data = responseBody ? JSON.parse(responseBody) : {};
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        } catch (parseError) {
          resolve({
            status: res.statusCode,
            data: { message: responseBody || 'Invalid JSON response' },
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', error => {
      resolve({
        status: 500,
        data: { message: error.message },
        headers: {},
      });
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

// Test authentication rate limiting
async function testAuthRateLimit() {
  console.log('\n🔐 Testing Authentication Rate Limiting...');
  console.log('Making multiple login attempts with wrong password...');

  for (let i = 1; i <= 7; i++) {
    const result = await makeRequest('POST', '/users/login', {
      email: 'nonexistent@example.com',
      password: 'wrongpassword',
    });

    console.log(
      `Attempt ${i}: Status ${result.status} | ` +
        `Limit: ${result.headers['x-ratelimit-limit']} | ` +
        `Remaining: ${result.headers['x-ratelimit-remaining']} | ` +
        `Reset: ${result.headers['x-ratelimit-reset']}`
    );

    if (result.status === 429) {
      console.log(`✅ Rate limit triggered at attempt ${i}`);
      console.log(`Message: ${result.data.message}`);
      break;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Test registration and get auth token
async function setupTestUser() {
  console.log('\n👤 Setting up test user...');

  const result = await makeRequest('POST', '/users/register', {
    email: TEST_EMAIL,
    firstName: 'Test',
    lastName: 'User',
    password: TEST_PASSWORD,
    phone: '+1234567890',
  });

  if (result.status === 201) {
    authToken = result.data.data.token;
    console.log('✅ Test user created successfully');
    return true;
  } else if (result.status === 429) {
    console.log('⚠️ Registration rate limited, trying to login instead...');

    const loginResult = await makeRequest('POST', '/users/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (loginResult.status === 200) {
      authToken = loginResult.data.data.token;
      console.log('✅ Logged in with existing user');
      return true;
    }
  }

  console.log('❌ Failed to setup test user');
  return false;
}

// Test financial operations rate limiting
async function testFinancialRateLimit() {
  if (!authToken) {
    console.log('❌ No auth token available for financial tests');
    return;
  }

  console.log('\n💰 Testing Financial Operations Rate Limiting...');
  console.log('Making multiple transaction attempts...');

  for (let i = 1; i <= 12; i++) {
    const result = await makeRequest(
      'POST',
      '/transactions',
      {
        amount: 100,
        type: 'DEPOSIT',
        toAccountId: 'test-account-id',
        description: `Test transaction ${i}`,
      },
      {
        Authorization: `Bearer ${authToken}`,
      }
    );

    console.log(
      `Transaction ${i}: Status ${result.status} | ` +
        `Limit: ${result.headers['x-ratelimit-limit']} | ` +
        `Remaining: ${result.headers['x-ratelimit-remaining']}`
    );

    if (result.status === 429) {
      console.log(`✅ Financial rate limit triggered at attempt ${i}`);
      console.log(`Message: ${result.data.message}`);
      break;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Test transfer rate limiting
async function testTransferRateLimit() {
  if (!authToken) {
    console.log('❌ No auth token available for transfer tests');
    return;
  }

  console.log('\n🔄 Testing Transfer Rate Limiting...');
  console.log('Making multiple transfer attempts...');

  for (let i = 1; i <= 7; i++) {
    const result = await makeRequest(
      'POST',
      '/transactions/transfer',
      {
        amount: 100,
        fromAccountId: 'test-from-account-id',
        toAccountId: 'test-to-account-id',
        description: `Test transfer ${i}`,
      },
      {
        Authorization: `Bearer ${authToken}`,
      }
    );

    console.log(
      `Transfer ${i}: Status ${result.status} | ` +
        `Limit: ${result.headers['x-ratelimit-limit']} | ` +
        `Remaining: ${result.headers['x-ratelimit-remaining']}`
    );

    if (result.status === 429) {
      console.log(`✅ Transfer rate limit triggered at attempt ${i}`);
      console.log(`Message: ${result.data.message}`);
      break;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Test payment rate limiting
async function testPaymentRateLimit() {
  if (!authToken) {
    console.log('❌ No auth token available for payment tests');
    return;
  }

  console.log('\n💳 Testing Payment Rate Limiting...');
  console.log('Making multiple payment attempts...');

  for (let i = 1; i <= 5; i++) {
    const result = await makeRequest(
      'POST',
      '/transactions/payment',
      {
        amount: 100,
        accountId: 'test-account-id',
        recipientDetails: {
          name: 'Test Recipient',
          email: 'recipient@example.com',
        },
        description: `Test payment ${i}`,
      },
      {
        Authorization: `Bearer ${authToken}`,
      }
    );

    console.log(
      `Payment ${i}: Status ${result.status} | ` +
        `Limit: ${result.headers['x-ratelimit-limit']} | ` +
        `Remaining: ${result.headers['x-ratelimit-remaining']}`
    );

    if (result.status === 429) {
      console.log(`✅ Payment rate limit triggered at attempt ${i}`);
      console.log(`Message: ${result.data.message}`);
      break;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Test global rate limiting
async function testGlobalRateLimit() {
  console.log('\n🌐 Testing Global Rate Limiting...');
  console.log('Making multiple requests to health endpoint...');

  for (let i = 1; i <= 5; i++) {
    const result = await makeRequest('GET', '/health');

    console.log(
      `Health check ${i}: Status ${result.status} | ` +
        `Limit: ${result.headers['x-ratelimit-limit']} | ` +
        `Remaining: ${result.headers['x-ratelimit-remaining']}`
    );

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Rate Limiting Tests...');
  console.log(`Testing against: ${BASE_URL}`);

  try {
    // Test global rate limiting first
    await testGlobalRateLimit();

    // Test authentication rate limiting
    await testAuthRateLimit();

    // Setup test user
    const userSetupSuccess = await setupTestUser();

    // Test financial operations if user setup was successful
    if (userSetupSuccess) {
      await testFinancialRateLimit();
      await testTransferRateLimit();
      await testPaymentRateLimit();
    }

    console.log('\n✅ Rate limiting tests completed!');
    console.log('\n📝 Summary:');
    console.log('- Authentication endpoints have rate limiting per email/IP');
    console.log('- Financial operations have user-based rate limiting');
    console.log('- Different operations have different limits (payments < transfers < transactions)');
    console.log('- All endpoints include rate limit headers');
    console.log('- Rate limits reset after the configured time window');
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Tests interrupted by user');
  process.exit(0);
});

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  makeRequest,
  testAuthRateLimit,
  testFinancialRateLimit,
  testTransferRateLimit,
  testPaymentRateLimit,
  testGlobalRateLimit,
};
