import express, { response } from 'express';
import helmet, { permittedCrossDomainPolicies } from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { dbInitialize } from './db-connect';
import router from './router';

import {SERVICE_PORT} from "./config/vars";



//import * as dotenv from 'dotenv';
//import { SERVICE_PORT } from 'env';
import { Request, Response, Router } from 'express';

//const SERVICE_PORT = process.env['SERVICE_PORT'];

//sequelize models.
import Account from './models/account';
import Auth_Token from './models/auth_token';
import Profile from './models/profile';
import Swipe from './models/swipe';
import Filter from './models/filter';

import { DoubleDataType, FloatDataType, GeographyDataType, Sequelize, UUID, UUIDV4 } from 'sequelize/types';
import { BeforeValidate, DataType } from 'sequelize-typescript';
import validate_auth from './components/validate_auth';

import { DateTime } from "luxon";
import { Json } from 'sequelize/types/utils';
import { privateEncrypt } from 'crypto';
import { any } from 'joi';
import { collapseTextChangeRangesAcrossMultipleVersions, isConstructorDeclaration } from 'typescript';
import { Server } from 'http';
const Joi = require('joi');

export const app = express();
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', router);

let sequelize:Sequelize;


import * as http from 'http';
import * as WebSocket from 'ws';
const server = http.createServer(app);
const wss = new WebSocket.Server({server});
wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (message:string) => {
        console.log("message received: %s", message);
        ws.send(`Hello, you send -> ${message}`);
    });

    ws.send(`Hi there, I am a websocket server`);
})

//joi schemas

const create_profile_schema = Joi.object({
    token: Joi.string().guid().required(),
    uuid: Joi.string().guid().required(),
    name: Joi.string().alphanum().max(50).required(),
    birthDate: Joi.date().required(),
    gender: Joi.string().valid('man','woman','non-binary').required(),
    height: Joi.number().min(0).max(304.8).required(),
    imagePath: Joi.object().keys({
        0 : Joi.string().required(),
        1 : Joi.string().required(),
        2 : Joi.string().required(),
        3 : Joi.string(),
        4 : Joi.string(),
        5 : Joi.string(),
        6 : Joi.string(),
        7 : Joi.string(),
        8 : Joi.string(),
        9 : Joi.string(),
    }).required(),
    datingGoal: Joi.string().valid('longterm','shortterm','hookup','marriage','justchatting','unsure').required(),
    biography: Joi.string().max(300).required(),
    bodyType: Joi.string().valid('lean', 'average', 'muscular', 'heavy', 'obese').required(),
    longitude: Joi.number().required(),
    latitude: Joi.number().required(),
});

const update_profile_schema = Joi.object({
    token: Joi.string().guid().required(),
    uuid: Joi.string().guid().required(),
    gender: Joi.string().valid('man','woman','non-binary').optional(),
    imagePath: Joi.object().keys({
        0 : Joi.string().required(),
        1 : Joi.string().required(),
        2 : Joi.string().required(),
        3 : Joi.string(),
        4 : Joi.string(),
        5 : Joi.string(),
        6 : Joi.string(),
        7 : Joi.string(),
        8 : Joi.string(),
        9 : Joi.string(),
    }).optional(),
    datingGoal: Joi.string().valid('longterm','shortterm','hookup','marriage','justchatting','unsure').optional(),
    biography: Joi.string().max(300).optional(),
    bodyType: Joi.string().valid('lean', 'average', 'muscular', 'heavy', 'obese').optional(),
    longitude: Joi.number().optional(),
    latitude: Joi.number().optional(),
});

const simple_get_schema = Joi.object({
    token: Joi.string().guid().required(),
    uuid: Joi.string().guid().required(),
    target: Joi.string().guid().optional()
});

const swipe_schema = Joi.object({
    token: Joi.string().guid().required(),
    uuid: Joi.string().guid().required(),
    target_uuid: Joi.string().guid().required(),
    type: Joi.number().valid(0,1,3,4).required()
});

const create_filter_schema = Joi.object({
    token: Joi.string().guid().required(),
    uuid: Joi.string().guid().required(),
    minBirthDate: Joi.date().required(),
    maxBirthDate: Joi.date().required(),
    minHeight: Joi.number().required(),
    maxHeight: Joi.number().required(),
    genderMan: Joi.boolean().required(),
    genderWoman: Joi.boolean().required(),
    genderNonBinary: Joi.boolean().optional(),
    btLean: Joi.boolean().required(),
    btAverage: Joi.boolean().required(),
    btMuscular: Joi.boolean().required(),
    btHeavy: Joi.boolean().required(),
    btObese: Joi.boolean().required(),
    maxDistance: Joi.number().required()
});

const update_filter_schema = Joi.object({
    token: Joi.string().guid().required(),
    uuid: Joi.string().guid().required(),
    minBirthDate: Joi.date().optional(),
    maxBirthDate: Joi.date().optional(),
    minHeight: Joi.number().optional(),
    maxHeight: Joi.number().optional(),
    genderMan: Joi.boolean().optional(),
    genderWoman: Joi.boolean().optional(),
    genderNonBinary: Joi.boolean().optional(),
    btLean: Joi.boolean().optional(),
    btAverage: Joi.boolean().optional(),
    btMuscular: Joi.boolean().optional(),
    btHeavy: Joi.boolean().optional(),
    btObese: Joi.boolean().optional(),
    maxDistance: Joi.number().optional()
});

const get_people_schema = Joi.object({
    token: Joi.string().guid().required(),
    uuid: Joi.string().guid().required(),
    number: Joi.number().min(1).max(25).required()
})

//TODO add with statement so that you can't have multiple of the multiple choice ones. 

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
app.post('/account/get_auth', async (req:Request,res:Response) => {
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

    //TODO hook this up with the firebase auth.

    if(body.sms_code){ //if the sms code is entered.
        
    }else{ //if the sms code is not entered
        
    }

    //use this code to generate an auth_token for 1 year in future
    /*
    const auth = new Auth_Token({
        uuid: "b6a9f755-7668-483d-adc8-16b3127b81b8",
        expiry: new Date().setFullYear(new Date().getFullYear() + 1)
    });
    auth.save();
    */



    res.json({result: "Eh. whatever"});
});

//to allow users to delete their account (set it to the deleted state)
app.put('/account/delete', async (req:Request,res:Response) => {

});

//to allow the user to set their account to the paused state, to take them out of the active queue
app.put('/account/pause', async (req:Request,res:Response) => {

});

//to allow the user to re-enter the active queue. 
app.put('/account/unpause', async (req:Request, res:Response) => {

})
// /profile hosts api endpoints to do with managing, creating and deleting user profiles. 

/*
- Takes the inputs from the profile creation process within the flutter application and adds the information to the user table within the database.
Inputs: 
- biography: string
- birthDate: string
- bodyType: string
- datingGoal: string
- gender: string
- height: float
- name: string
- imagePath: ?????
- token: string
- uuid: string
- latitude: float
- longitude: float
Outputs:
- 
*/
app.post('/profile', async (req:Request, res:Response) => {
    //TODO add the functionality in another file and call it here.

    
    if(req.headers.authorization == null){
        res.json({error: "Authentication token was not supplied."});
        return
    }
    let input = Object.assign(req.body, {token : req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1)});
    try {
        const value = await create_profile_schema.validateAsync(input)
    } catch (err){
        console.log("did not pass schema validation.")
        console.log(err)
        res.json({error: "Inputs were invalid."});
        return 
    }

    //console.log("Got past schema validation.")

    //verify that the two exist together in the auth table.
    let result:number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err:any) {
        console.error(err.stack);
        res.status(500).json({message: "Server error"});
        return;
    }
    //if invalid, return without completing. 
    if(result != 0){
        res.json({error: "Authentication was invalid, please re-authenticate."});
        return
    }

    //logic unique to this function.....


    //create profile entry.
    const profile = new Profile({
        uuid: req.body.uuid,
        name: req.body.name,
        birthDate: req.body.birthDate,
        gender: req.body.gender,
        height: req.body.height,
        imagePath: req.body.imagePath,
        datingGoal: req.body.datingGoal,
        biography: req.body.biography,
        bodyType: req.body.bodyType,
        lastLocation: { type: 'Point', coordinates: [req.body.longitude,req.body.latitude]},
    });
    profile.save();

    //update the state in the account table to 1.
    const account = await Account.findOne({ where: { uuid: req.body.uuid } });
    if (account) {
        account.state = 1;
        await account.save();
    } else {
        console.log("User account not found, couldn't update state");
    }

    res.json({message: "Profile created."});
});

//to update an existing profile within the application.
app.put('/profile', async (req:Request, res:Response) => {

    if(req.headers.authorization == null){
        res.json({error: "Authentication token was not supplied."});
        return
    }
    //let value:any;
    let value:any;
    let input = Object.assign(req.body, {token : req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1)});
    try {
        value = await update_profile_schema.validateAsync(input)
    } catch (err){
        console.log("did not pass schema validation.")
        console.log(err)
        res.json({error: "Inputs were invalid."});
        return 
    }

    //console.log("Got past schema validation.")

    //verify that the two exist together in the auth table.
    let result:number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err:any) {
        console.error(err.stack);
        res.status(500).json({message: "Server error"});
        return;
    }
    //if invalid, return without completing. 
    if(result != 0){
        res.json({error: "Authentication was invalid, please re-authenticate."});
        return
    }

    console.log("printing value");
    console.log(value!);

    const profile = await Profile.findOne({ where: { uuid: req.body.uuid } });
    if (profile) {
        if(value['gender']){
            profile.gender = value['birthDate']
        }
        if(value['height']){
            profile.height = value['height']
        }
        if(value['imagePath']){
            profile.imagePath = value['imagePath']
        }
        if(value['datingGoal']){
            profile.datingGoal = value['datingGoal']
        }
        if(value['biography']){
            profile.biography = value['biography']
        }
        if(value['bodyType']){
            profile.bodyType = value['bodyType']
        }
        if(value['longitude'] && value['latitude']){
            const long:number = value['longitude']
            const lat:number = value['latitude']
            profile.lastLocation = { type: 'Point', coordinates: [long,lat] }
        }
        await profile.save();
    } else {
        console.log("User profile not found, couldn't update state");
    }

    res.json({message: "Profile updated."});
})

//to allow a user application to receive information about their own profile, or another.
/*
inputs:
- target: string, tells who's profile they are trying to get (uuid)
outputs:
- profile object. 
*/

app.get('/profile', async (req:Request, res:Response) => {

    if(req.headers.authorization == null){
        res.json({error: "Authentication token was not supplied."});
        return
    }
    let input = Object.assign(req.body, {token : req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1)});
    try {
        const value = await simple_get_schema.validateAsync(input)
    } catch (err){
        console.log("did not pass schema validation.")
        console.log(err)
        res.json({error: "Inputs were invalid."});
        return 
    }

    //console.log("Got past schema validation.")

    //still doing authentication to prevent spammed requests. 

    //verify that the two exist together in the auth table.
    let result:number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err:any) {
        console.error(err.stack);
        res.status(500).json({message: "Server error"});
        return;
    }
    //if invalid, return without completing. 
    if(result != 0){
        res.json({error: "Authentication was invalid, please re-authenticate."});
        return
    }

    let profile:any;
    if(req.body.target){ //return the profile of the target
        profile = await Profile.findOne({ where: { uuid: req.body.target } });
    }else{ //return the profile of the person that made the call
        profile = await Profile.findOne({ where: { uuid: req.body.uuid } });
    }
    if(profile){
        //console.log(profile);
        res.json({profile});
    } else {
        res.json({error: "User profile could not be found."});
    }
})

//allow a user to "like" another person
app.post('/swipe', async (req:Request, res:Response) => {
    //authentication
    if(req.headers.authorization == null){
        res.json({error: "Authentication token was not supplied."});
        return
    }
    //let value:any;
    let value:any;
    let input = Object.assign(req.body, {token : req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1)});
    try {
        value = await swipe_schema.validateAsync(input)
    } catch (err){
        console.log("did not pass schema validation.")
        console.log(err)
        res.json({error: "Inputs were invalid."});
        return 
    }

    //console.log("Got past schema validation.")

    //verify that the two exist together in the auth table.
    let result:number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err:any) {
        console.error(err.stack);
        res.status(500).json({message: "Server error"});
        return;
    }
    //if invalid, return without completing. 
    if(result != 0){
        res.json({error: "Authentication was invalid, please re-authenticate."});
        return
    }

    //TODO, at some point, add a check to make sure they aren't swiping on themselves.

    //function specific logic ---------------------

    //we keep track of both entries becuase we want to have a sense of possession as well as state.

    const sentswipe = await Swipe.findOne({where: {uuid: req.body.uuid, target_uuid: req.body.target_uuid}});
    const receivedswipe = await Swipe.findOne({where: {uuid: req.body.target_uuid, target_uuid: req.body.uuid}});

    //2 is not possible because you cannot force a match, it is done through likes. 
    switch(req.body.type){
        case 0: //dislike
            if(!sentswipe){ //if no previous swipe, send a dislike. 
                Swipe.create({
                    target_uuid: req.body.target_uuid,
                    uuid: req.body.uuid,
                    type: 0
                })
            }
            break;
        case 1: //like
            if(!sentswipe){ //if no previous swipe, send a like
                Swipe.create({
                    target_uuid: req.body.target_uuid,
                    uuid: req.body.uuid,
                    type: 1
                })
                //then see if the other person has liked you
                if(receivedswipe && receivedswipe['type'] == 1){
                    //congrats, you have a match.
                    //update your like to a match.
                    Swipe.update(
                        {
                            type: 2
                        },
                        { where: {
                            target_uuid: req.body.target_uuid,
                            uuid: req.body.uuid,
                        } }
                    )
                    //update their like to a match.
                    Swipe.update(
                        {
                            type: 2
                        },
                        { where: {
                            target_uuid: req.body.uuid,
                            uuid: req.body.target_uuid,
                        } }
                    )
                }
            } else if(sentswipe && sentswipe!['type'] == 0){ //allow them to upgrade a dislike to a like.
                Swipe.update(
                    {
                        type: 1
                    },
                    { where: {
                        target_uuid: req.body.target_uuid,
                        uuid: req.body.uuid,
                    } }
                  )
            }
            break;
        case 3: //unmatch
            //update both entries to unmatched. sad...
            Swipe.update(
                {
                   type: 3
                },
                { where: {
                    target_uuid: req.body.target_uuid,
                    uuid: req.body.uuid,
                } }
            )
            Swipe.update(
                {
                    type: 3
                },
                { where: {
                    target_uuid: req.body.uuid,
                    uuid: req.body.target_uuid,
                } }
            )
            break;
        case 4: //block
            //update entry to be blocking the other person. 
            //if the other person's entry is matched, change to unmatched
            if(receivedswipe && receivedswipe['type'] == 2){
                Swipe.update(
                    {
                        type: 3 //set to unmatched.
                    },
                    {
                        where: {
                            uuid: req.body.target_uuid,
                            target_uuid: req.body.uuid
                        }
                    }
                )
            }

            if(!sentswipe){
                Swipe.create({
                    target_uuid: req.body.target_uuid,
                    uuid: req.body.uuid,
                    type: 4
                })
            } else {
                Swipe.update(
                    {
                       type: 4
                    },
                    { where: {
                        target_uuid: req.body.target_uuid,
                        uuid: req.body.uuid,
                    } }
                 )
            }
            
            break;
    }
    res.json({message: "Swipe Executed"});
});

//set the filters for a profile for the first time 
app.post('/filter', async (req:Request, res:Response) => {

    //console.log(req.body);

    //authentication
    if(req.headers.authorization == null){
        res.json({error: "Authentication token was not supplied."});
        return
    }
    //let value:any;
    let value:any;
    let inputNoToken = Object.assign({
        uuid: req.body.uuid,
        minBirthDate: req.body.birthDate.min,
        maxBirthDate: req.body.birthDate.max,
        minHeight: req.body.height.min,
        maxHeight: req.body.height.max,
        genderMan: req.body.gender.man,
        genderWoman: req.body.gender.woman,
        genderNonBinary: req.body.gender.nonBinary,
        btLean: req.body.bodyType.lean,
        btAverage: req.body.bodyType.average,
        btMuscular: req.body.bodyType.muscular,
        btHeavy: req.body.bodyType.heavy,
        btObese: req.body.bodyType.obese,
        maxDistance: req.body.maxDistance,
    })

    let input = Object.assign(inputNoToken, {
        token : req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1),
    });

    try {
        value = await create_filter_schema.validateAsync(input)
    } catch (err){
        console.log("did not pass schema validation.")
        console.log(err)
        res.json({error: "Inputs were invalid."});
        return 
    }

    console.log("Got past schema validation.")

    //verify that the two exist together in the auth table.
    let result:number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err:any) {
        console.error(err.stack);
        res.status(500).json({message: "Server error"});
        return;
    }
    //if invalid, return without completing. 
    if(result != 0){
        res.json({error: "Authentication was invalid, please re-authenticate."});
        return
    }

    //check to see if one exists already, if so, ignore it.
    const existingFilter = await Filter.findOne({where: {uuid: req.body.uuid}});
    if(!existingFilter){
        console.log("creating filter");
        Filter.create(inputNoToken);
        res.json({message: "filter created"});
    }
    else{
        res.json({message: "filter already existed, try put if you intend to modify."});
    }

});

//update the filters for a user
app.put('/filter', async (req:Request, res:Response) => {
    //authentication
    if(req.headers.authorization == null){
        res.json({error: "Authentication token was not supplied."});
        return
    }
    //let value:any;
    let value:any;

    //need to modify this to be ok it is not present maybe with ? or :? idk.
    let inputNoToken = {
        uuid: req.body.uuid,
        ...(req.body.birthDate.min && {minBirthDate : req.body.birthDate.min}),
        ...(req.body.birthDate.max && {maxBirthDate : req.body.birthDate.max}),
        ...(req.body.height.min && {minHeight : req.body.height.min}),
        ...(req.body.height.max && {maxHeight : req.body.height.max}),
        ...(req.body.gender.man && {genderMan : req.body.gender.man}),
        ...(req.body.gender.woman && {genderWoman : req.body.gender.woman}),
        ...(req.body.gender.nonBinary && {genderNonBinary : req.body.gender.nonBinary}),
        ...(req.body.bodyType.lean && {btLean : req.body.bodyType.lean}),
        ...(req.body.bodyType.average && {btAverage : req.body.bodyType.average}),
        ...(req.body.bodyType.muscular && {btMuscular : req.body.bodyType.muscular}),
        ...(req.body.bodyType.heavy && {btHeavy : req.body.bodyType.heavy}),
        ...(req.body.bodyType.obese && {btObese : req.body.bodyType.obese}),
        ...(req.body.maxDistance && {maxDistance : req.body.maxDistance})
    }

    console.log(inputNoToken)

    let input = Object.assign(inputNoToken, {
        token : req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1),
    });

    try {
        value = await update_filter_schema.validateAsync(input)
    } catch (err){
        console.log("did not pass schema validation.")
        console.log(err)
        res.json({error: "Inputs were invalid."});
        return 
    }

    console.log("Got past schema validation.")

    //verify that the two exist together in the auth table.
    let result:number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err:any) {
        console.error(err.stack);
        res.status(500).json({message: "Server error"});
        return;
    }
    //if invalid, return without completing. 
    if(result != 0){
        res.json({error: "Authentication was invalid, please re-authenticate."});
        return
    }

    //function specific logic
    const existingFilter = await Filter.findOne({where: {uuid: req.body.uuid}});
    if(existingFilter){
        console.log("creating filter");
        Filter.update(inputNoToken, {where: {uuid: req.body.uuid}});
        res.json({message: "filter created"});
    }
    else{
        res.json({message: "filter doesn't exist, call post if you intend to create one."});
    }

})

//return the top people that meet the user's filters. This one is going to require
//the most thinking of how we want to do it. For now I'm going to implement the most 
//simplistic version, where it only takes into account the filters applied. 
/*
inputs: 
- number: 
*/
app.get('/people', async (req:Request, res:Response) => {
   //limit the number in the schema

   //authentication
    if(req.headers.authorization == null){
        res.json({error: "Authentication token was not supplied."});
        return
    }
    //let value:any;
    let value:any;
    let input = Object.assign(req.body, {token : req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1)});
    try {
        value = await get_people_schema.validateAsync(input)
    } catch (err){
        console.log("did not pass schema validation.")
        console.log(err)
        res.json({error: "Inputs were invalid."});
        return 
    }

    //console.log("Got past schema validation.")

    //verify that the two exist together in the auth table.
    let result:number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err:any) {
        console.error(err.stack);
        res.status(500).json({message: "Server error"});
        return;
    }
    //if invalid, return without completing. 
    if(result != 0){
        res.json({error: "Authentication was invalid, please re-authenticate."});
        return
    }

    //function specific logic:
    //find the first (<=number) of people that match the dating goal from the profile, and the filters in the filter table.
    const profile = await Profile.findOne({where : {uuid: req.body.uuid}});
    if(profile){
        //console.log(profile);
        //get the dating goal of the profile
        let datingGoal:string = profile.datingGoal
        //get the filters of that person
        const filter = await Filter.findOne({where: {uuid: req.body.uuid}});
        if(filter){
            console.log("Both Filter and Profile exist, making call.")
            //now we need to find people who's profile matches their dating goal, and who meet's their filters. 
            //ideally, you also only want to see people who's filters you match as well. (that's a lot tougher challenge.)
            
            //we need a more complex query, so we're just going to use the SQL
            //console.log(sequelize);


            //find a list of people (limited in number) who's profile matches the filters of the sender, then left join that with the filter table, and return a limited number that are met by the original sender
            console.log("\n\n\n");
            //console.log(`sender: ${profile.uuid}`);
            //console.log(`type: ${typeof(filter.maxBirthDate)}`)
            //console.log(`max: ${filter.maxBirthDate}`);
            //console.log(filter.maxBirthDate.toSQL())
            console.log(`min: ${JSON.stringify(filter.minBirthDate)}`);
            //const maxBD:DateTime = DateTime.fromFormat(filter.maxBirthDate,);
            //const minBD:DateTime = DateTime.fromFormat(filter.minBirthDate,);

            //get profiles that aren't the sender, and match the filters:
            //const query1:string = `SELECT * FROM "Profiles" WHERE uuid != '${profile.uuid}';`
            const query1:string = `SELECT * FROM "Profiles" WHERE uuid != '${profile.uuid}' and height >= 134.34 and 'birthDate' >= '${filter.minBirthDate}';`
            //const query1:string = `SELECT * FROM "Profiles" WHERE uuid != '${profile.uuid}' and 'birthDate' >= '${filter.minBirthDate}' and 'birthDate' <= '${filter.maxBirthDate}';`


            //join with account table to check if they are active recently? 

            //const query:string = `SELECT * FROM (SELECT * FROM "Profiles" WHERE uuid != ${profile.uuid} and "birthDate" >= ${filter.minBirthDate} and birthDate" <= ${filter.maxBirthDate} LIMIT 100) as profileresult LEFT JOIN "Filters" ON profileresult.uuid = "Filters".uuid) WHERE ${profile.birthDate} >= "minBirthDate" and ${profile.birthDate} <= "maxBirthDate" LIMIT ${req.body.number}`;
            const [results, metadata] = await sequelize.query(query1)

            //const [results,metadata] = await sequelize.query(
            //    "SELECT * FROM Filters JOIN Profiles ON Filters.uuid = Profiles.uuid"
            //)
            console.log(results)

            res.json({message: "REPLACE THIS"})
        }else{
            res.json({message: "couldn't find the user's filters"})
        }
    }else{
        res.json({message: "couldn't find the user profile."})
    }



});

//block is currently handled under swipe
/*
//allow a user to block another user
app.post('/block', async (req:Request,res:Response)=>{

})
*/


//This should be moved, or the endpoint label should be changed to be under swipe.
//returns the number of blocks on a user.
app.get('/block/number', async (req:Request,res:Response)=>{

})


//allow a user to get all current likes on themselves
app.get('/likes')

//get all current matches
app.get('/matches')




// /test stuff is just for messing around. Delete before pushing to main/production
app.get('/test/1', async (req:Request,res:Response) => {
    
    //this should not be this broken lol.
    //const person = Account.create({
    //    phone: "6123273482",
    //    state: 0,
    //});

    const auth = new Auth_Token({
        uuid: "311b8f93-a76e-48ba-97cb-c995d0dc918c",
        expiry: DateTime.local(2025, 2, 11, 11, 11, 11, 11)//new Date().setFullYear(new Date().getFullYear() + 1)
    });
    auth.save();
    
    //res.json({result: "end of test"});
});

app.get('/test/2', async (req:Request,res:Response)=> {
    /*
    const swipe = new Swipe({
        uuid: "b6a9f755-7668-483d-adc8-16b3127b81b8",
        target_uuid: "b6a9f755-7668-483d-adc8-16b3127b81b8",
        type: 0,
    });
    swipe.save();
    */
})

dbInitialize().then((sequelizeReturn) => {
    sequelize = sequelizeReturn;
    
    server.listen(SERVICE_PORT, () => {
        if(process.send) {
            process.send(`Server running at http://localhost:${SERVICE_PORT}\n\n`);
        }
        console.log(`Server running at http://localhost:${SERVICE_PORT}\n\n`)
    });

    //console.log(`listening on port ${SERVICE_PORT!.toString()}`);
});

