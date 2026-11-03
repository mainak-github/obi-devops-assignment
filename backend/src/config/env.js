import 'dotenv/config';

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || 'appdb',
    user: process.env.DB_USER || 'appuser',
    password: process.env.DB_PASSWORD || 'devpassword',
    ssl: process.env.DB_SSL === 'true',
    poolMax: Number(process.env.DB_POOL_MAX || 10),
  },
};

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  throw new Error('Invalid PORT configuration');
}

if (
  !Number.isInteger(config.database.port) ||
  config.database.port < 1 ||
  config.database.port > 65535
) {
  throw new Error('Invalid DB_PORT configuration');
}

if (!Number.isInteger(config.database.poolMax) || config.database.poolMax < 1) {
  throw new Error('Invalid DB_POOL_MAX configuration');
}

export default config;
