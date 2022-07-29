import express, { response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { dbInitialize } from './db-connect';
import router from './router';
import { SERVICE_PORT } from './config';
import { Request, Response, Router } from 'express';



const {passThrough} = require('stream');

//sequelize models.
import Account from './models/account';
import Auth_Token from './models/auth_token';
import Profile from './models/profile';
import Swipe from './models/swipe';
import Filter from './models/filter';

import { DoubleDataType, FloatDataType, GeographyDataType, UUID, UUIDV4 } from 'sequelize/types';
import { BeforeValidate, DataType } from 'sequelize-typescript';
import validate_auth from './components/validate_auth';
import {connect_minio, set_user_photos_from_path, get_user_photos, delete_files} from './components/object_store/minio_utils';

import { DateTime } from "luxon";
import { Json } from 'sequelize/types/utils';
import { privateEncrypt } from 'crypto';
import { any, array } from 'joi';
import { collapseTextChangeRangesAcrossMultipleVersions } from 'typescript';

import {MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_USE_SSL, MINIO_PORT, MINIO_ENDPOINT} from "./config";
import { Stream, Writable } from 'stream';


const Joi = require('joi'); //for schema validation
const Minio = require('minio'); //for object storage

//const os = require('os');
//const path = require('path');
//const Busboy = require('busboy'); //for file uploads

const multer  = require('multer') //package used for parsing multi-part form data.
const upload = multer() //used for the text only form-data endpoints.
const multer_profile_photos_upload = multer({ dest: 'uploads/' })//used for photo upload form-data endpoints

const fs = require('fs') //file system library.
//const { promisify } = require('util') //utility library. 

const maxProfilePhotos = 6; //the max number of photos that someone is allowed to have in their profile.
const minProfilePhotos = 3; //the minimum number of photos that someone is allowed to have in their profile.


export const app = express();
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', router);

//joi schemas

const create_profile_schema = Joi.object({
    token: Joi.string().guid().required(),
    uuid: Joi.string().guid().required(),
    name: Joi.string().alphanum().max(50).required(),
    birthDate: Joi.date().required(),
    gender: Joi.string().valid('man','woman','non-binary').required(),
    height: Joi.number().min(0).max(304.8).required(),
    // imagePath: Joi.object().keys({
    //     "bucket" : Joi.string().required(),
    //     0 : Joi.string().required(),
    //     1 : Joi.string().required(),
    //     2 : Joi.string().required(),
    //     3 : Joi.string(),
    //     4 : Joi.string(),
    //     5 : Joi.string(),
    //     6 : Joi.string(),
    //     7 : Joi.string(),
    //     8 : Joi.string(),
    //     9 : Joi.string(),
    // }).required(),
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
    // imagePath: Joi.object().keys({
    //     "bucket" : Joi.string().required(),
    //     0 : Joi.string().required(),
    //     1 : Joi.string().required(),
    //     2 : Joi.string().required(),
    //     3 : Joi.string(),
    //     4 : Joi.string(),
    //     5 : Joi.string(),
    //     6 : Joi.string(),
    //     7 : Joi.string(),
    //     8 : Joi.string(),
    //     9 : Joi.string(),
    // }).optional(),
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

app.get('/test', (req:Request, res:Response) => {
    console.log(req.body);
    res.json({message: "This is just a test function"})
})

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
app.post('/profile', multer_profile_photos_upload.array('photos', maxProfilePhotos) , async (req:Request, res:Response) => {
    //TODO add the functionality in another file and call it here.

    //get the file paths for the newly uploaded files.
    var filepaths = (req.files as Array<Express.Multer.File>).map(function(file: any) {
        return file.path;
    });

    //check to ensure they supplied the required authentication field.
    if(req.headers.authorization == null){
        //clean up the dead files. 
        await delete_files(filepaths);
        res.json({error: "Authentication token was not supplied."});
        return
    }

    //create input object that pushes together the req body and auth headers.
    let input = Object.assign(req.body, {token : req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1)});
    try {
        //validate it with the relevant schema 
        const value = await create_profile_schema.validateAsync(input)

    } catch (err){ //if there was a problem with validation
        
        console.log("did not pass schema validation.")
        console.log(err)
        //clean up the dead files
        await delete_files(filepaths);
        res.json({error: "Inputs were invalid."});
        return 
    }

    //verify that the person has entered at least the minimum number of photos
    if(filepaths.length < minProfilePhotos || filepaths.length > maxProfilePhotos){
        console.log("received an invalid number of photos")
        //delete the files
        await delete_files(filepaths);
        //return error to the user
        res.json({error: "Invaild number of photos"})
        return
    }

    //at the point, the schema is valid, just need to check that the values are logical.

    //verify that the uuid/auth token pair exists in the auth table.
    let verifyresult:number = -1;
    try {
        //check to see if the auth is valid. 
        verifyresult = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err:any) { //if there was an error in the validation.
        console.error(err.stack);
        //clean up the dead files.
        await delete_files(filepaths);
        res.status(500).json({message: "Server error"});
        return;
    }

    //if the result of the validation was invalid (aka they didn't match)
    if(verifyresult != 0){
        //clean up the dead files
        await delete_files(filepaths);
        res.json({error: "Authentication was invalid, please re-authenticate."});
        return
    }

    //check to ensure that a person doesn't exist with the provided profile.
    await Profile.count({ where: { uuid: req.body.uuid } })
      .then(async count => {
        if (count != 0) { //if someone already exists.
            console.log()
            //clean up dead files
            await delete_files(filepaths)
            res.json({error: "Cannot post a profile if one already exists, try calling put instead"})
            return;
        } else { //if no one exists (expected route)
            console.log("Attempting to send the photos from profile get.")
            //get the minio client
            let minioClient = connect_minio();
    
            //callback that makes the create Profile query after uploading the photos
            async function callback(req:Request, imageDatabastObject:Object){
                //console.log("Got into callback")

                //create profile within the database.
                const profile = new Profile({
                    uuid: req.body.uuid,
                    name: req.body.name,
                    birthDate: req.body.birthDate,
                    gender: req.body.gender,
                    height: req.body.height,
                    imagePath: imageDatabaseObject,
                    datingGoal: req.body.datingGoal,
                    biography: req.body.biography,
                    bodyType: req.body.bodyType,
                    lastLocation: { type: 'Point', coordinates: [req.body.longitude,req.body.latitude]},
                });
                await profile.save();

                //update the account table to reflect the fact that they now have a profile.
                const account = await Account.findOne({ where: { uuid: req.body.uuid } });
                if (account) {
                    account.state = 1;
                    await account.save();
                } else { //the ordering of this is bad, but this shouldn't occur.
                    console.log("User account not found, couldn't update state");
                    //TODO Do something to correct for this issue if it occurs. 
                }
                //success message
                res.json({message : "profile created"})
            }

        //this actually executues both the upload and the file deletion in sequence. 
        const imageDatabaseObject:Object = await set_user_photos_from_path(req.body.uuid, filepaths, minioClient, callback, req)

        }
    });
});

//to update an existing profile within the application.
app.put('/profile', multer_profile_photos_upload.array('photos', maxProfilePhotos) ,async (req:Request, res:Response) => {

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
app.get('/profile', upload.none(), async (req:Request, res:Response) => {

    console.log("called get profile")
    console.log(req.body);

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

    async function callback(profile:Profile|null){ //this is what will be called once the profile is found.
        console.log("%cgot into callback", "color: orange")
        if(profile != null){
            console.log("profile was not null")
            //look at the provided bucket and image names, and retrieve presigned get links. 

            //connect to minio service
            let minioClient = connect_minio();

            const bucket:string = profile.imagePath['bucket'];
            console.log(profile.imagePath)
            console.log(`got bucket name: ${bucket}`)
            let count = Object.keys(profile.imagePath).length; //number of items in the json (images + bucket)
            count = count - 1
            console.log(`got count: ${count}`)
            //subtract one for the bucket key, which is not an image identifier. 
            
            //I need a different strategy, passing callbacks a specific number of times
            let countfinished:number = 0;
            //what is passed as the callback to the top level minio client and then down through the rest. 
            async function callback(err:Error, presignedURL:string){
                if(err) return console.log(err)
                profile!.imagePath[countfinished] = presignedURL
                countfinished++
                if(countfinished < count){
                    //call make another minio request.
                    const object = profile!.imagePath[countfinished]
                    await minioClient.presignedGetObject(bucket, object, (err:Error, presignedURL:string) => callback(err, presignedURL))
                } else {
                    //send the response
                    res.json({profile})
                    return
                }
            }
            
            const object = profile!.imagePath[countfinished]
            await minioClient.presignedGetObject(bucket, object, (err:Error, presignedURL:string) => callback(err, presignedURL))

        } else {
            res.json({error: "User profile could not be found."});
            return
        }
    }

    if(req.body.target){ //return the profile of the target
        await Profile.findOne({ where: { uuid: req.body.target } }).then((profile) => callback(profile));
    }else{ //return the profile of the person that made the call
        await Profile.findOne({ where: { uuid: req.body.uuid } }).then((profile) => callback(profile));
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

//return the top people that meet the user's filters.
/*
inputs: 
- 
*/
app.get('/people', async (req:Request, res:Response) => {

});

//block is currently handled under swipe
/*
//allow a user to block another user
app.post('/block', async (req:Request,res:Response)=>{

})
*/

//returns the number of blocks on a user.
app.get('/block/number', async (req:Request,res:Response)=>{

})


//allow a user to get all current likes on themselves
app.get('/likes')

//get all current matches
app.get('/matches')

// app.post('/storage/miniotest3' , upload.array('photos', 2), async (req:Request, res:Response) => {
//     let minioClient = await connect_minio();
//     console.log(req.files);
//     //the files are getting uploaded to /uploads, but I cannot figure out how to interpret/receive them in the code.

//     console.log(req.body.uuid)

//     var filenames = (req.files as Array<Express.Multer.File>).map(function(file: any) {
//         return file.filename;
//     });

//     console.log(filenames)

//     //get the file paths for the newly uploaded files.
//     var filepaths = (req.files as Array<Express.Multer.File>).map(function(file: any) {
//         return file.path;
//     });

//     console.log(filepaths)

//     //await set_user_photos_from_path(req.body.uuid, filepaths, minioClient)
    

//     res.json({message: "god help us all."})
// });

app.get('/storage/miniotest4', async (req:Request, res:Response) => {
    let objects:string[] = ['123$0','123$1'];
    let minioClient = await connect_minio();
    await get_user_photos(minioClient, 'nanortheast', objects)
});




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



dbInitialize().then(() => {
    app.listen(SERVICE_PORT);
    console.log(`listening on port ${SERVICE_PORT.toString()}`);
});