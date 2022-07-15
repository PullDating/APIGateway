import Auth_Token from '../models/auth_token';
import { DateTime } from "luxon";

/*
Function to update the last active field of a user if it exists. should only be called after authentication.
*/
export default async function validate_auth(uuid:string) : Promise<number> {
    return 0;
}