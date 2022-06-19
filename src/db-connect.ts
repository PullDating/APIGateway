import { Sequelize } from 'sequelize-typescript';
import { DB_NAME, DB_PASS, DB_URL, DB_USER } from "./config";
import * as path from 'path';

export async function dbInitialize() {
    const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_URL,
        dialect: 'postgres',
        models: [path.join(__dirname + '/models')],
    });

    try {
        return await sequelize.authenticate().then(() => sequelize.sync({ alter: true }));
    } catch (error) {
        console.error('Unable to connect to db:', error);
    }
}
