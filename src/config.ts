import env from 'env-var';

export const SERVICE_PORT = 3000;

export const DB_URL = env.get('DB_URL').default('rdb.dev.pull.dating').required().asString();
export const DB_PORT = env.get('DB_PORT').default('5432').required().asString();
export const DB_NAME = env.get('DB_NAME').default('pulldev2').required().asString();
export const DB_USER = env.get('DB_USER').default('postgres').required().asString();
export const DB_PASS = env.get('DB_PASS').default('sWkLEYkPuVUQbj4cnLFrVPDBjqHbdN').required().asString();