import { Sequelize } from 'sequelize-typescript';
import { DB_NAME, DB_PASSWORD, DB_HOST, DB_USER } from "./config";
import * as path from 'path';
import Account from './models/account';
import Auth_Token from './models/auth_token';
import Profile from './models/profile';
import Swipe from './models/swipe';
import Filter from './models/filter';
import Chat from './models/chat';

export async function dbInitialize():Promise<Sequelize> {
    console.log("Attempting to initialize the database");
    console.log(`The current directory name is ${__dirname}`);    
    console.log(`envs: ${DB_NAME}, ${DB_PASSWORD}, ${DB_HOST}, ${DB_USER}`)


    /*
    const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_URL,
        dialect: 'postgres',
        models: [path.join(__dirname + '/models')],
    });
    */

    const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
        host: DB_HOST,
        dialect: 'postgres'
    });

    sequelize.addModels([Account,Auth_Token,Profile,Swipe,Filter,Chat]);

    console.log("created sequelize object");
    try {
        Account.sync();
        return await sequelize.authenticate().then(() => sequelize.sync({ alter: true }));
    } catch (error) {
        console.error('Unable to connect to db:', error);
    }

    return sequelize;
    
}
