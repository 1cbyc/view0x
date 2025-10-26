const { Sequelize } = require('sequelize');

// Test different possible Supabase database connection formats
const connectionVariants = [
  // Original format
  'postgresql://postgres:Ememobong2025!@db.lkppllsousbqjreophhj.supabase.co:5432/postgres',

  // Pooler format (common for newer Supabase projects)
  'postgresql://postgres.lkppllsousbqjreophhj:Ememobong2025!@aws-0-us-east-1.pooler.supabase.com:5432/postgres',

  // Alternative pooler format
  'postgresql://postgres:Ememobong2025!@aws-0-us-east-1.pooler.supabase.com:5432/postgres?user=postgres.lkppllsousbqjreophhj',

  // Direct connection format
  'postgresql://postgres.lkppllsousbqjreophhj:Ememobong2025!@db.lkppllsousbqjreophhj.supabase.co:5432/postgres',

  // Session pooler format
  'postgresql://postgres:Ememobong2025!@db.lkppllsousbqjreophhj.supabase.co:6543/postgres',

  // Alternative with encoded password
  'postgresql://postgres:Ememobong2025%21@db.lkppllsousbqjreophhj.supabase.co:5432/postgres'
];

async function testConnection(connectionString, index) {
  console.log(`\n🔍 Testing variant ${index + 1}:`);
  console.log(`   ${connectionString.replace(/:Ememobong2025[^@]*@/, ':****@')}`);

  const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

  try {
    await sequelize.authenticate();
    console.log('   ✅ SUCCESS! Connection established');

    // Test a simple query
    const result = await sequelize.query('SELECT version();');
    console.log('   📊 PostgreSQL version:', result[0][0].version.substring(0, 50) + '...');

    // Close the connection
    await sequelize.close();
    console.log('   👋 Connection closed');

    return true;

  } catch (error) {
    console.log('   ❌ FAILED:', error.message);

    if (error.message.includes('ENOTFOUND')) {
      console.log('      → DNS resolution failed');
    } else if (error.message.includes('authentication')) {
      console.log('      → Authentication issue');
    } else if (error.message.includes('timeout')) {
      console.log('      → Connection timeout');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('      → Connection refused');
    }

    return false;
  }
}

async function testAllVariants() {
  console.log('🚀 Testing all possible Supabase database connection variants...');
  console.log('   Project: secure-audit');
  console.log('   Ref: lkppllsousbqjreophhj');
  console.log('   Password: [HIDDEN]');

  let successCount = 0;
  const results = [];

  for (let i = 0; i < connectionVariants.length; i++) {
    const success = await testConnection(connectionVariants[i], i);
    results.push({ variant: i + 1, success, connection: connectionVariants[i] });

    if (success) {
      successCount++;
      console.log('   🎉 WORKING CONNECTION FOUND!');
      break; // Stop on first success
    }

    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📋 SUMMARY:');
  console.log(`   Tested: ${connectionVariants.length} variants`);
  console.log(`   Successful: ${successCount}`);

  if (successCount > 0) {
    const workingVariant = results.find(r => r.success);
    console.log('\n🎯 WORKING CONNECTION STRING:');
    console.log(`   ${workingVariant.connection.replace(/:Ememobong2025[^@]*@/, ':****@')}`);
    console.log('\n💡 Update your .env file with this connection string!');
  } else {
    console.log('\n❌ No working connections found.');
    console.log('\n🔍 Troubleshooting steps:');
    console.log('   1. Verify your Supabase project is fully initialized');
    console.log('   2. Check Settings → Database in your Supabase dashboard');
    console.log('   3. Ensure your password is correct');
    console.log('   4. Try connecting from Supabase\'s built-in SQL editor first');
    console.log('   5. Check if your IP needs to be whitelisted');
  }

  console.log('\n📖 Next: Go to https://app.supabase.com/project/lkppllsousbqjreophhj/settings/database');
}

testAllVariants().catch(console.error);
