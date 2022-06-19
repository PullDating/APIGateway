import env from 'env-var';

export const DB_URL = env.get('DB_URL').default('localhost').required().asString();
export const DB_PORT = env.get('DB_PORT').default('5432').required().asString();
export const DB_NAME = env.get('DB_NAME').default('postgres').required().asString();;
export const DB_USER = env.get('DB_USER').default('postgres').required().asString();
export const DB_PASS = env.get('DB_PASS').default('postgres').required().asString();