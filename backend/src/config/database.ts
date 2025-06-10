import { Sequelize } from 'sequelize';

const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/secure_audit';

export const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
}); 