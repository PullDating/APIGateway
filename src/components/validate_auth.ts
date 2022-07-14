import { privateEncrypt } from 'crypto';
import { DataType } from 'sequelize-typescript';
import Auth_Token from '../models/auth_token';
import { DateTime } from "luxon";

/*
Function to determine if the uuid/token combination entered in an api call is valid. It will return -1 if it is not, 0 if it is.
*/
export default async function validate_auth(uuid:string,token:string) : Promise<number> {

        //need to first strip off the bearer of token
        token = token.substring(token.indexOf(' ') + 1);

        //make database call to retreive the relevant authentication entry
        const search = await Auth_Token.findAll({
            where: {
                token: token,
            }
        });

        //check if the entry doesn't exist, or doesn't match the uuid.
        if(search.length == 0 || search[0].uuid != uuid){
            //console.log("Either the entry did not exist, or the auth token was invalid.");
            return -1;
        }

        //time check variables.
        const expireTime:DateTime = search[0].expiry;
        const currentTime:DateTime = DateTime.now();

        //check if the token has expired.
        if(expireTime < currentTime){
            //console.log("The authentication token has expired");
            return -1;
        }
        //console.log("authentication successful");

        return 0;
}