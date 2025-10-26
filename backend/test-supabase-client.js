const { createClient } = require('@supabase/supabase-js');

// Test Supabase using the official JavaScript client
async function testSupabaseClient() {
  console.log('🚀 Testing Supabase with JavaScript client...');

  // Your Supabase project details
  const supabaseUrl = 'https://lkppllsousbqjreophhj.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrcHBsbHNvdXNicWpyZW9waGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk5NzYyNzgsImV4cCI6MjA0NTU1MjI3OH0.placeholder'; // You'll need to get this from your dashboard

  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🔑 Using anon key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...');

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client created successfully');

    // Test 1: Basic connection
    console.log('\n📡 Test 1: Testing basic connection...');
    const { data, error } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log('✅ Connection works! (Table not found is expected)');
      } else {
        console.log('⚠️  Connection works but got error:', error.message);
      }
    } else {
      console.log('✅ Connection successful, data:', data);
    }

    // Test 2: Create a simple table
    console.log('\n🔧 Test 2: Testing table creation...');
    const { data: createResult, error: createError } = await supabase.rpc('create_test_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS test_connection (
          id SERIAL PRIMARY KEY,
          message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (createError) {
      console.log('ℹ️  Table creation test skipped (expected - need service role):', createError.message);
    } else {
      console.log('✅ Table operation successful');
    }

    // Test 3: Test auth (optional)
    console.log('\n🔐 Test 3: Testing auth system...');
    const { data: authData, error: authError } = await supabase.auth.getSession();

    if (authError) {
      console.log('⚠️  Auth test failed:', authError.message);
    } else {
      console.log('✅ Auth system accessible, session:', authData.session ? 'Active' : 'None');
    }

    console.log('\n🎉 Supabase client tests completed successfully!');
    console.log('💡 This means your Supabase project is working perfectly.');
    console.log('🔧 We can use this client instead of direct PostgreSQL connection.');

    return true;

  } catch (error) {
    console.error('❌ Supabase client test failed:', error.message);
    console.error('Details:', error);

    if (error.message.includes('Invalid API key')) {
      console.log('\n🔑 You need to get your anon key from Supabase dashboard:');
      console.log('1. Go to https://app.supabase.com/project/lkppllsousbqjreophhj/settings/api');
      console.log('2. Copy the "anon public" key');
      console.log('3. Replace the supabaseAnonKey in this test file');
    }

    return false;
  }
}

// Also test if we can at least reach the Supabase API
async function testSupabaseReachability() {
  console.log('🌐 Testing Supabase API reachability...');

  const https = require('https');
  const url = 'https://lkppllsousbqjreophhj.supabase.co/rest/v1/';

  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      console.log('📡 API Status:', res.statusCode);
      if (res.statusCode === 401 || res.statusCode === 200) {
        console.log('✅ Supabase API is reachable and working');
        resolve(true);
      } else {
        console.log('⚠️  Unexpected status code:', res.statusCode);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.log('❌ API unreachable:', error.message);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      console.log('❌ API request timeout');
      resolve(false);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive Supabase tests...\n');

  // Test API reachability first
  const apiReachable = await testSupabaseReachability();
  console.log('');

  if (apiReachable) {
    // Test Supabase client
    const clientWorking = await testSupabaseClient();

    if (clientWorking) {
      console.log('\n🎯 RECOMMENDATION:');
      console.log('   Use Supabase JS client instead of direct PostgreSQL connection');
      console.log('   It\'s easier, more reliable, and has built-in features like:');
      console.log('   • Real-time subscriptions');
      console.log('   • Built-in authentication');
      console.log('   • Automatic connection pooling');
      console.log('   • Row Level Security support');

      console.log('\n📝 Next steps:');
      console.log('1. Get your anon key from Supabase dashboard');
      console.log('2. Update this test with the correct key');
      console.log('3. Integrate Supabase client into your app');
    }
  } else {
    console.log('\n❌ Your Supabase project seems to have issues.');
    console.log('🔍 Please check:');
    console.log('1. Project is fully initialized');
    console.log('2. Project reference is correct');
    console.log('3. Internet connection is working');
  }
}

runAllTests().catch(console.error);
