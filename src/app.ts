import express, { response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { dbInitialize } from './db-connect';
import router from './router';
import { SERVICE_PORT } from './config';
import { Request, Response, Router } from 'express';

//sequelize models.
import Account from './models/account';
import Auth_Token from './models/auth_token';

import { DoubleDataType, FloatDataType, GeographyDataType } from 'sequelize/types';
import { DataType } from 'sequelize-typescript';

export const app = express();
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', router);

/*
app.get('/', (request: Request, response: Response) => {
    response.send('Hello World! I\'m William!')
})
*/
/**app.get('/health', (request: Request, response: Response) => {
    response.status(200).send('App running').end();
});**/

//Template for comments, copy and use the below 

/*
- Description of what the REST call is for
Inputs: 
-
Outputs:
- 
*/

/*
- Redirects the user to the Wordpress website.
Inputs: none
Outputs: none
*/
app.get('/', (request: Request, responsed: Response) => {
    response.redirect('https://pulldating.tips');
});

/*
- This function is called when there is no present uuid and/or token cached on the user
device. It is used in two situations. The first is when they are first creating a profile
for the very first time, and the second is when they have lost their token/it expired. 
In either case, they call this function. First they call it without the sms_code parameter.
In this case, the function takes their inputted phone number and forwards it to the Firebase
SMS service to send them a verification code. (Not 100% sure on how this part works just yet)
The Firebase SMS service will pass the expected code to the function, which will then store it
in the database along with the expected phone number. The user, having received the code will
call the function again, this time with the sms_code argument. If the code is correct, and matches
what was earlier stored in the database, the function will return with the expected return values.
It will also create/update the user's account information in the database.

/// /account hosts api endpoints to do with managing, creating and deleting account information.

Inputs: 
- phone: string
- (optional) sms_code: string
Outputs:
- user_exists: boolean //tells the device if it is a new user or an existing one
- uuid: string //the uuid of the user so that they can cache it on device
- token: string //the api token/key that is cached on the user's device that allows them to make calls to the rest of the api.
*/
app.post('/account/auth', async (req:Request,res:Response) => {
    //TODO add the functionality in another file and call it here.
    
    const body = req.body;
    //check to ensure that the required parameter is present. 
    if(!body.phone) {
        res.status(400).json({message: "Required parameter 'phone' is missing"});
        return;
    }
    let phone:string = body.phone;
    //verify that the phone number is in a valid format.
    if (!phone.match(/^(\+?\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/)) {
        res.status(400).json({message: "Parameter 'phone' is invalid"});
         return;
     }
     // Normalize the phone number into a string like '+13324882155'
    phone = phone.replace(/[^\d+]+/g, '');
    phone = phone.replace(/^00/, '+');
    if (phone.match(/^1/)) phone = '+' + phone;
    if (!phone.match(/^\+/)) phone = '+1' + phone;
    //check to see if the user with the phone number already exists.
    let userExists:boolean = false;
    try {
        const search = await Account.findAll({
            where: {
                phone: phone
            }
        });
        console.log(`search: ${search}`);
        if(search.length == 0){
            console.log("phone search result was empty");
            userExists = false;
        }else{
            console.log("phone search result was not empty");
            userExists = true;
        }
    } catch (err:any) {
        console.error(err.stack);
        res.status(500).json({message: "Server error"});
        return;
    }

    if(body.sms_code){ //if the sms code is entered.
        
    }else{ //if the sms code is not entered
        
    }

    res.json({result: "Eh. whatever"});
});

// /profile hosts api endpoints to do with managing, creating and deleting user profiles. 

/*
- Takes the inputs from the profile creation process within the flutter application and adds the information to the user table within the database.
Inputs: 
- biography: string
- birthdate: Date
- bodytype: string
- datinggoal: string
- gender: string
- height: float
- name: string
- photos: ?????
- token: string
- uuid: string
- location: geography
Outputs:
- 
*/
app.post('/profile/create', async (req:Request, res:Response) => {
    //TODO add the functionality in another file and call it here.

    //Check the required inputs to make sure that none are missing. 
    if (!req.headers.authorization) {
        res.status(400).json({message: "Required parameter 'token' is missing. (You haven't supplied an authentication token, try calling /auth)"});
        return;
    }
    if (!req.body.uuid) {
        res.status(400).json({message: "Required parameter 'uuid' is missing. (You haven't supplied an uuid, try calling /auth)"});
        return;
    }

    //verify that the two exist together in the auth table.
    try {
        const search = await Auth_Token.findAll({
            where: {
                token: req.body.token
            }
        });

        if(search.length == 0 || search[0].uuid != req.body.uuid){
            console.log("Either the entry did not exist, or the auth token was invalid.");
            res.status(400).json({message: "Authentication Rejected"});
        }

    } catch (err:any) {
        console.error(err.stack);
        res.status(500).json({message: "Server error"});
        return;
    }

    //Continue checking the remaining required parameters.
    if (!req.body.birthdate) {
        res.status(400).json({message: "Required parameter 'birthdate' is missing."});
        return;
    }
    if (!req.body.bodytype) {
        res.status(400).json({message: "Required parameter 'bodytype' is missing."});
        return;
    }
    if (!req.body.gender) {
        res.status(400).json({message: "Required parameter 'gender' is missing."});
        return;
    }
    if (!req.body.height) {
        res.status(400).json({message: "Required parameter 'height' is missing."});
        return;
    }
    if (!req.body.datinggoal) {
        res.status(400).json({message: "Required parameter 'datinggoal' is missing."});
        return;
    }
    if (!req.body.biography) {
        res.status(400).json({message: "Required parameter 'biography' is missing."});
        return;
    }
    //type check and store all the incoming request data. 
    var name:string = req.body.name;
    let location:GeographyDataType = req.body.location;
    let uuid:string = req.body.uuid;
    let birthdate:Date = req.body.birthdate;
    let bodytype:string = req.body.bodytype;
    let gender:string = req.body.gender;
    let height:FloatDataType = req.body.height;
    let datinggoal:string = req.body.datinggoal;
    let biography:string = req.body.biography;

});

// /test stuff is just for messing around. Delete before pushing to main
app.get('/test/1', (req:Request,res:Response) => {
    
    //this should not be this broken lol.
    //Account.create({uuid: "something"})
    //const person = new Account({uuid: "something"})
    //person.save()
    
    res.json({result: "end of test"});
});



dbInitialize().then(() => {
    app.listen(SERVICE_PORT);
    console.log(`listening on port ${SERVICE_PORT.toString()}`);
});