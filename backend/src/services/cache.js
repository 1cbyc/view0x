const { createClient } = require('redis');

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

async function connectRedis() {
  if (!client.isOpen) {
    await client.connect();
  }
}

async function setCache(key, value, ttl = 3600) {
  await connectRedis();
  await client.set(key, JSON.stringify(value), {
    EX: ttl
  });
}

async function getCache(key) {
  await connectRedis();
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

module.exports = {
  setCache,
  getCache
};
