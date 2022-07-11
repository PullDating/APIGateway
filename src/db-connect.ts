import { Sequelize } from 'sequelize-typescript';
import { DB_NAME, DB_PASS, DB_URL, DB_USER } from "./config";
import * as path from 'path';
import User from './models/user';

export async function dbInitialize() {
    console.log("Attempting to initialize the database");
    console.log(`The current directory name is ${__dirname}`);

    /*
    const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_URL,
        dialect: 'postgres',
        models: [path.join(__dirname + '/models')],
    });
    */

    const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_URL,
        dialect: 'postgres'
    });

    //sequelize.addModels([User]);

    console.log("created sequelize object");
    try {
        return await sequelize.authenticate().then(() => sequelize.sync({ alter: true }));
    } catch (error) {
        console.error('Unable to connect to db:', error);
    }

    
}
