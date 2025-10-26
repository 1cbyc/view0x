const { Sequelize } = require('sequelize');

// Simple database connection test
async function testConnection() {
  console.log('🔍 Testing Supabase database connection...');

  const sequelize = new Sequelize(
    'postgresql://postgres:Ememobong2025!@db.lkppllsousbqjreophhj.supabase.co:5432/postgres',
    {
      dialect: 'postgres',
      logging: console.log,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully!');

    // Test a simple query
    const result = await sequelize.query('SELECT version();');
    console.log('📊 PostgreSQL version:', result[0][0].version);

    // Close the connection
    await sequelize.close();
    console.log('👋 Connection closed');

  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    console.error('Details:', error.message);
  }
}

testConnection();
