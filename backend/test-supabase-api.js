const https = require('https');

// Test Supabase API connection
async function testSupabaseAPI() {
  console.log('🔍 Testing Supabase API connection...');

  // Replace with your actual Supabase project URL
  const supabaseUrl = 'https://lkppllsousbqjreophhj.supabase.co';
  const testEndpoint = `${supabaseUrl}/rest/v1/`;

  console.log('🌐 Testing endpoint:', testEndpoint);

  return new Promise((resolve, reject) => {
    const req = https.get(testEndpoint, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'secure-audit-test'
      },
      timeout: 10000
    }, (res) => {
      console.log('📡 Response status:', res.statusCode);
      console.log('📋 Response headers:', res.headers);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Supabase API is reachable!');
          console.log('📊 Response:', data);
          resolve(true);
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          console.log('🔑 Supabase API is working (authentication needed)');
          resolve(true);
        } else {
          console.log('❌ Unexpected response code:', res.statusCode);
          console.log('📄 Response body:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Failed to connect to Supabase API:', error.message);

      if (error.code === 'ENOTFOUND') {
        console.log('🚨 DNS Resolution failed. Possible issues:');
        console.log('   1. Project is still initializing');
        console.log('   2. Incorrect project reference in URL');
        console.log('   3. Network/DNS issue');
        console.log('');
        console.log('💡 Please verify your project URL in Supabase dashboard');
      }

      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('❌ Request timeout');
      reject(new Error('Request timeout'));
    });
  });
}

// Also test direct database hostname resolution
async function testDNSResolution() {
  const dns = require('dns').promises;
  const hostname = 'db.lkppllsousbqjreophhj.supabase.co';

  console.log('🔍 Testing DNS resolution for:', hostname);

  try {
    const addresses = await dns.lookup(hostname);
    console.log('✅ DNS resolved to:', addresses);
    return true;
  } catch (error) {
    console.log('❌ DNS resolution failed:', error.message);
    console.log('');
    console.log('🚨 This means either:');
    console.log('   1. Your Supabase project is still being created');
    console.log('   2. The project reference is incorrect');
    console.log('   3. There\'s a temporary DNS issue');
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Supabase connectivity tests...\n');

  // Test 1: DNS Resolution
  console.log('=== Test 1: DNS Resolution ===');
  const dnsWorking = await testDNSResolution();
  console.log('');

  // Test 2: API Connection
  console.log('=== Test 2: API Connection ===');
  try {
    const apiWorking = await testSupabaseAPI();
    console.log('');

    if (dnsWorking && apiWorking) {
      console.log('🎉 All tests passed! Your Supabase project seems to be working.');
      console.log('💡 If database connection still fails, try:');
      console.log('   1. Wait a few more minutes for full initialization');
      console.log('   2. Check if your IP needs to be whitelisted');
      console.log('   3. Verify the exact connection string in your dashboard');
    } else {
      console.log('⚠️  Some tests failed. Please check your Supabase project status.');
    }
  } catch (error) {
    console.log('');
    console.log('❌ API test failed');
  }

  console.log('\n📋 Next steps:');
  console.log('1. Go to https://app.supabase.com/projects');
  console.log('2. Click on your "secure-audit" project');
  console.log('3. Go to Settings → Database');
  console.log('4. Copy the exact connection string shown there');
  console.log('5. Check if the hostname is different from what we\'re using');
}

runTests().catch(console.error);
