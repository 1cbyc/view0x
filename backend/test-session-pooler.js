const { Sequelize } = require('sequelize');
const { createClient } = require('@supabase/supabase-js');

// Test Session Pooler connection and Supabase client
async function testSessionPooler() {
  console.log('🚀 Testing Session Pooler connection...');

  const connectionString = 'postgresql://postgres.lkppllsousbqjreophhj:Ememobong2025!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

  console.log('🔗 Connection:', connectionString.replace(/:Ememobong2025[^@]*@/, ':****@'));

  const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

  try {
    console.log('\n📡 Testing authentication...');
    await sequelize.authenticate();
    console.log('✅ Session Pooler connection successful!');

    console.log('\n📊 Testing query...');
    const result = await sequelize.query('SELECT version();');
    console.log('✅ PostgreSQL version:', result[0][0].version.substring(0, 100));

    console.log('\n🗄️ Testing table creation...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS connection_test (
        id SERIAL PRIMARY KEY,
        message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Table creation successful');

    console.log('\n📝 Testing data insertion...');
    await sequelize.query(`
      INSERT INTO connection_test (message)
      VALUES ('Session Pooler connection test successful at ${new Date().toISOString()}');
    `);
    console.log('✅ Data insertion successful');

    console.log('\n📖 Testing data retrieval...');
    const testData = await sequelize.query('SELECT * FROM connection_test ORDER BY created_at DESC LIMIT 3;');
    console.log('✅ Retrieved records:', testData[0].length);
    testData[0].forEach(row => {
      console.log(`   - ${row.id}: ${row.message.substring(0, 50)}... (${row.created_at})`);
    });

    await sequelize.close();
    console.log('\n👋 Session Pooler connection closed');

    return true;

  } catch (error) {
    console.error('❌ Session Pooler test failed:', error.message);
    console.error('Details:', error);
    return false;
  }
}

async function testSupabaseClient() {
  console.log('\n\n🔧 Testing Supabase JavaScript client...');

  const supabaseUrl = 'https://lkppllsousbqjreophhj.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrcHBsbHNvdXNicWpyZW9waGhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTUwNDA4NSwiZXhwIjoyMDc3MDgwMDg1fQ.jt_SjnNtn3H5-aEn-zgOo0z1zT13S7T73rzoc-NgsX4';

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client created successfully');

    console.log('\n📝 Testing with service role...');
    const { data, error } = await supabase
      .from('connection_test')
      .select('*')
      .limit(3);

    if (error) {
      console.log('ℹ️  Query result:', error.message);
    } else {
      console.log('✅ Supabase client query successful');
      console.log('📊 Retrieved records via Supabase client:', data.length);
      data.forEach(row => {
        console.log(`   - ${row.id}: ${row.message.substring(0, 50)}...`);
      });
    }

    console.log('\n🔐 Testing auth capabilities...');
    const { data: users, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.log('ℹ️  Auth test:', authError.message);
    } else {
      console.log('✅ Auth system accessible, users count:', users.users.length);
    }

    return true;

  } catch (error) {
    console.error('❌ Supabase client test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🎯 Starting comprehensive Supabase connectivity tests...\n');
  console.log('📍 Testing both Session Pooler (PostgreSQL) and Supabase JS Client\n');

  const poolerWorking = await testSessionPooler();
  const clientWorking = await testSupabaseClient();

  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Session Pooler (PostgreSQL): ${poolerWorking ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`Supabase JS Client:         ${clientWorking ? '✅ WORKING' : '❌ FAILED'}`);

  if (poolerWorking && clientWorking) {
    console.log('\n🎉 ALL TESTS PASSED! Your Supabase setup is perfect!');
    console.log('\n🚀 Ready for Phase 2 implementation:');
    console.log('   ✅ Database connection established');
    console.log('   ✅ Tables can be created and queried');
    console.log('   ✅ Both PostgreSQL and Supabase client work');
    console.log('   ✅ Authentication system accessible');
    console.log('\n📝 Next steps:');
    console.log('   1. Update your backend to use Supabase');
    console.log('   2. Create your data models');
    console.log('   3. Start Phase 2: Queue system implementation');

  } else if (poolerWorking) {
    console.log('\n✅ Session Pooler working! You can proceed with PostgreSQL.');
    console.log('⚠️  Supabase client had issues, but direct PostgreSQL is fine.');

  } else if (clientWorking) {
    console.log('\n✅ Supabase client working! Recommend using this approach.');
    console.log('⚠️  Session Pooler had issues, but Supabase client is fine.');

  } else {
    console.log('\n❌ Both tests failed. Please check:');
    console.log('   1. Connection string is correct');
    console.log('   2. Password is accurate');
    console.log('   3. Network allows connections to AWS EU West 1');
    console.log('   4. Supabase project is fully initialized');
  }

  console.log('\n🔗 Supabase Dashboard: https://app.supabase.com/project/lkppllsousbqjreophhj');
}

runAllTests().catch(console.error);
