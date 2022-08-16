import express, { response } from 'express';
import helmet, { permittedCrossDomainPolicies } from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { dbInitialize } from './db-connect';
import router from './router';

import { SERVICE_PORT } from "./config/vars";

//Firebase authentication
import * as admin from 'firebase-admin';
const serviceAccount = require("./components/Firebase/serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

/**
 * Holds the maximum number of concurrent matches that a user is allowed to have at a given time.
 */
let maxConcurrentMatches:number = 3;

//import * as dotenv from 'dotenv';
//import { SERVICE_PORT } from 'env';
import { Request, Response, Router } from 'express';

const { passThrough } = require('stream');
//const SERVICE_PORT = process.env['SERVICE_PORT'];

//sequelize models.
import Account from './models/account';
import Auth_Token from './models/auth_token';
import Profile from './models/profile';
import Swipe from './models/swipe';
import Filter from './models/filter';
import Chat from './models/chat';

import { DoubleDataType, FloatDataType, GeographyDataType, Sequelize, UUID, UUIDV4 } from 'sequelize/types';
import { BeforeValidate, DataType, Length } from 'sequelize-typescript';
import validate_auth from './components/validate_auth';
import upload_photo, {connect_minio, set_user_photos_from_path, get_user_photos, delete_files, get_num_images_from_imagePath, delete_file_in_minio } from './components/object_store/minio_utils';

import { DateTime } from "luxon";
import { Json } from 'sequelize/types/utils';
import { privateEncrypt } from 'crypto';

import Joi, { any, array } from 'joi';
import { collapseTextChangeRangesAcrossMultipleVersions, isConstructorDeclaration } from 'typescript';

import { MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_USE_SSL, MINIO_PORT, MINIO_ENDPOINT } from "./config";
import { Stream, Writable } from 'stream';


//const Joi = require('joi'); //for schema validation
const Minio = require('minio'); //for object storage

//const os = require('os');
//const path = require('path');
//const Busboy = require('busboy'); //for file uploads

const multer = require('multer') //package used for parsing multi-part form data.
const upload = multer() //used for the text only form-data endpoints.
const multer_profile_photos_upload = multer({ dest: 'uploads/' })//used for photo upload form-data endpoints

const fs = require('fs') //file system library.
//const { promisify } = require('util') //utility library. 

import { Server } from 'http';

export const app = express();
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', router);





let sequelize: Sequelize;

//imports required for websocket functionality.
import { WebSocketServer } from 'ws';
import * as http from 'http';
//create an http server using the express app.
const server = http.createServer(app);
//create a new websocket server using the http server.
export const wss = new WebSocketServer({ server })

/**
 * stores the active chat rooms in the server. 
 */
var rooms: any = {};

//this is the message template for the chat.
/*
{
    "meta":"join_or_create_room"/"send_message",
    "message":"anything",
    "clientID":"The uuid of the client.",
    "targetID" : "The uuid of the person they want to talk to."
    "token" : "The authentication token of the user"
}
*/

//return message format (not implemented but I want to work towards it)
/*
{
    "message": " ", //a display message that they could use to show an error, or for confirmation or something.
    "payload" : " ", //if they are trying to get something, such as a log history, it will be in the payload field.
    "status" : " ", //0 if there was an error, 1 if it is a successful response.
    "code" : " ", //code that tells what the messsage was for.

}

codes:

1 - room created successfully
2 - joined room successfully
3 - sending previous messages from the database
4 - message from the other user
401 - missing parameters, or invalid parameters
402 - authentication was invalid
403 - already in a room
404 - generic error
405 - problem joining or creating room
406 - room didn't exist that you tried to send information to
407 - you are not allowed to send a message in the given room
408 - some general problem sending a message
409 - trying to leave invalid room
410 - no match exists with the person they're trying to message
411 - the meta data inputted was invalid.



*/

/**
 * Checks to make sure the required fields of the WebSocket request are present.
 * @remarks 
 * This method does not check the types of the inputs, as Joi would, but simply that they are present. 
 * @param data 
 * @returns true if the required parameters are present in data, false if they are not or there is an error. 
 */
const paramsExist = (data: any) => {
    try {
        if ('meta' in data && 'targetID' in data && 'clientID' in data && 'message' in data && 'token' in data) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.log(error);
        return false;
    }
}

/*
const roomExist = (roomID: string) => {
    // check for room is already exist or not
    if (roomID in rooms) {
        return true;
    } else {
        return false;
    }
}

const insideRoomdataExist = (arr: any, data: any) => {
    var status = false;
    for (var i = 0; i < arr.length; i++) {
        if (data in arr[i]) {
            status = true;
            break;
        }
    }
    return status;
}
*/

/**
 * Checks to see if the inputted clientID is in the room pointed to by roomID
 * @param roomID 
 * @param ws 
 * @param clientID 
 * @returns false if they are not in the room, true if they are. 
 */
const clientExistInRoom = (roomID: any, clientID: any) => {
    console.log("checking to see if the user is in the room.")
    var status = false;
    const data: any = rooms[roomID].users;
    console.log(`these are the users ${data}`)

    if(data.hasOwnProperty(clientID)){
        status = true;
    }
    return status;
}


/**
 * Takes the log that has been generated by users sending chat messages, and then 
 * @remarks
 * - This function should only be called after getOrCreateChat, since that get's the most recent saved chat from the database, and verifies that there will be an entry. This is an overriding function so use it with care. 
 * @param roomID - the room id that is going have it's chat written to the database. 
 */
async function saveChat(roomID:any){
    console.log("attemping to write the following log to the database");
    console.log(rooms[roomID].log)

    //write the new log to the database

    try{
        await Chat.update(
            {
              log: rooms[roomID].log
            },
            { where: {
                room_id: roomID
            } }
          ).then(() => {})
    }catch (e) {
        console.log(e);
        console.log(`Could not write the log to the database for room ${roomID}`)
    }
}

/**
 * Polls the database to see if there is a chat, and if there is, it returns the json, else it creates the chat in the database and returns empty json.
 * 
 * @remarks
 * This method is only to be called after authentication has taken place, since it directly modifies database contents.
 * 
 * @param roomID - The roomID to look for in the chats table in the database. 
 * 
 * @returns Json containing the chats in the database, or empty json.
 */
async function getOrCreateChat (roomID:String): Promise<Object> {

    //check to see if a database entry exists, and if so populate the room's chats
    const chat = await Chat.findOne(
        {
            where: 
            { 
                room_id: roomID
            } 
        }
    );
    if(chat){
        return chat.log;
    }else{
        //create a database entry in the chats table with empty json.
        console.log("adding a new entry to the chat table")
        Chat.create({
            room_id: roomID, 
            log: []
        })
        return [];
    }
}

/**
 * Allows a user to join or create a room to allow them to send chat messages.
 * @remarks
 * This should only be used after authentication.
 * @param data {roomID, clientID}
 * @param ws the instance of the websocket.
 */
const joinOrCreateRoom = async (data: any, ws: any) => {
    console.log("someone tried to make a room")
    try {
        var { roomID, clientID } = data;

        // check if room exist or not
        const roomExist = roomID in rooms;
        if (!roomExist) { //no room exists
            console.log(`the room ${roomID} doesn't exist`);
            //create room.

            //create the empty json for the room object.
            rooms[roomID] = {};
            //initialize the object that will be added to the room.
            var obj:any = {};
            //holds the users that are in the room.
            var users:any = {}
            //if the room doesn't exist, this means they are the only one in the room.
            users[clientID] = ws;
            obj["users"] = users;
            
            //ws['admin'] = true;
            ws.send(JSON.stringify({
                'message': 'room created succesfully',
                'status': 1,
                "code": 1
            }));

            //get the chat from the database and store that in the room log.
            obj['log'] = await getOrCreateChat(roomID);

            //debug prints.
            console.log('creating room with the following object:')
            console.log(obj);


            //add this room object to the list of active rooms of the server.
            rooms[roomID] = obj;

            //update the connection with the relevant information.
            ws['roomID'] = roomID;
            ws['clientID'] = clientID;
        } else { // a room exists. 
            console.log(`the room ${roomID} exists already`); //debug print. 

            //Check to make sure they are not already in the room they requested to join.
            const inRoom = clientExistInRoom(roomID, clientID)
            if (inRoom) {
                ws.send(JSON.stringify({
                    "message": "you are already in a room",
                    "status": 0,
                    "code" : 405
                }));
            } else {
                console.log("Attempting to join the room that was requested...");
                //add themselves to the list of users in the room.
                rooms[roomID].users[clientID] = ws;


                //update the connection with the relevant information.
                ws['roomID'] = roomID
                ws['clientID'] = clientID;

                ws.send(JSON.stringify({
                    "message": "Joined succesfully",
                    "status": 1,
                    "code" : 2
                }));
            }
        }
        //either way, at the end of the joining process, it should send the messages currently in the log to the user so that they can compare it on their local.
        console.log("sending log to the user.")
        ws.send(JSON.stringify({
            "message": "Previous Messages",
            "payload": rooms[roomID].log,
            "status": 1,
            "code" : 3
        }));
    } catch (error) {
        console.log(error);
        ws.send(JSON.stringify({
            'message': 'there was some problem joining or creating a room',
            'status': 0,
            "code" : 405
        }));
    }
}


//updates the most recent log message by the other person to read 
function setReadRecent(roomID:any, clientID:String){
    //start at most recent and work backwards
    
    for(let i = rooms[roomID].log.length - 1  ; i>=0; i-- ){
        
        if(rooms[roomID].log[i].sender != clientID){
            rooms[roomID].log[i].read = true;
            break;
        }
        
    }
}

//the format of the log messages
// let logmessage:Object = {
//     "message" : message,
//     "timestamp" : Date.now(),
//     "sender" : clientID,
//     "read" : false
// }

/**
 * sends a message to the other users in the room.
 * @param data - the roomID, message, and clientID packaged together. 
 * @param ws - The websocket instance for that user.
 * @param Status <- not sure this needs to be here.
 * @returns none
 */
const sendMessage = (data: any, ws: any, Status = null) => {
    try {
        var { roomID, message, clientID } = data;
        //check whether room exist or not
        const roomExist = roomID in rooms;
        if (!roomExist) {
            ws.send(JSON.stringify({
                'message': 'Check room id',
                'status': 0,
                "code" : 406
            }));
            return;
        }
        // check whether client is in room or not
        const clientExist = clientExistInRoom(roomID, clientID);
        if (!clientExist) {
            ws.send(JSON.stringify({
                'message': "You are not allowed to send message",
                'status': 0,
                "code" : 407
            }));
            return;
        }
        const obj = rooms[roomID].users;
        console.log("object: ");
        console.log(obj);

        //create the log message that we want to append
        let logmessage:Object = {
            "message" : message,
            "timestamp" : Date.now(),
            "sender" : clientID,
            "read" : false
        }
        //append the log message to the relevant log array.
        rooms[roomID].log.push(logmessage);
        console.log(rooms[roomID].log);

        //loop through the entries that are not the user themselves (aka the other person.)
        for(var user in obj){
            if(obj[user] !== ws){
                //if it is a synchronous conversation, set the most recent to read

                //send the message to them.
                obj[user].send(JSON.stringify({
                    'message': message,
                    'status': Status ? Status : 1,
                    "code" : 4
                }));
                //indicate that they have seen the most recent message (if they are in the room live, they will see it instantly.)
                setReadRecent(roomID,clientID);
            }
        }
    } catch (error) {
        console.log(error)
        ws.send(JSON.stringify({
            'message': 'There was some problem in sending message',
            'status': 0,
            "code" : 408
        }));
    }
}


const leaveRoom = async (ws: any, data: any) => {
    //TODO add the database call to save the log. 
    console.log("Entering leave room")
    try {
        const { roomID, clientID} = data;
        // manual code started------------------------------------------------------------
        const roomExist = roomID in rooms;
        if (!roomExist) {
            ws.send(JSON.stringify({
                'message': 'Check room id',
                'status': 0,
                "code" : 406
            }));
            return;
        }

        console.log("the room you're trying to leave exists.")

        //remove the user from the rooms entry
        delete rooms[roomID].users[clientID];  

        console.log("The users in the room prior to leaving")
        console.log(rooms[roomID].users)

        //check if the entry is null, and if so then save to the database and delete the room itself.
        if(Object.keys(rooms[roomID].users).length === 0){
            console.log("There are no users left in the room, deleting")
            await saveChat(roomID);
            //delete the room from the full list
            delete rooms[roomID];
        }
    } catch (error) {
        ws.send(JSON.stringify({
            'message': 'There was some problem----------------------',
            'status': 0,
            "code": 404
        }))
    }

}

wss.on('connection', async function connection(ws: any){
    try {
        ws.on('message', async (recieveData: any) => {

            //get the data from the message and convert it into json.
            console.log(recieveData);
            var data = JSON.parse(recieveData);

            console.log(data) //debug print.

            //schema checking to make sure that the valid fields are present in the message.
            const error = paramsExist(data); 
            if (!error) {
                ws.send(JSON.stringify({
                    'message': 'check params',
                    'status': 0,
                    "code" : 401
                }));
                return;
            }
            
            //get these variables from the data inputted by the message.
            var { targetID, meta, message, clientID, token } = data;

            //create the room id from the targetID and the clientID
            console.log(targetID) //debug print. 

            //dynamically create the roomID from the two uuids inputted in the message (sender and target)
            let roomID:String;
            if(targetID < clientID){
                roomID = targetID + "$" + clientID
            }else{
                roomID = clientID + "$" + targetID
            }
            console.log(roomID); //debug print.
            
            //repackage the data with the roomID instead of the targetID, since that is what the other functions require.
            data = {roomID, meta, message, clientID, token}


            //authentication
            let result: number = -1;
            try {
                result = await validate_auth(clientID, token);
            } catch (err: any) {
                console.error(err.stack);
                ws.send(JSON.stringify({
                    'message': 'server error',
                    'status': 0,
                    'code' : 404
                }));
                //TODO leave the room if they are in it.
                //leaveRoom(ws, { roomID: ws.roomID, clientID: ws.clientID, message: "Leave request" })
                ws.terminate();
                return;
            }
            //if invalid, return without completing. 
            if (result != 0) {

                ws.send(JSON.stringify({
                    'message': 'Authentication Parameters were invalid.',
                    'status': 0,
                    'code' : 402
                }));
                //TODO leave the room if they are in it.
                //leaveRoom(ws, { roomID: ws.roomID, clientID: ws.clientID, message: "Leave request" })
                ws.terminate();
                return
            }
        
            //depending on the type of message they are trying to send, there is different operation.
            switch (meta) {
                case "join_or_create_room": //if they are trying to join or create a room (first operation.)


                    //ensure that they have a match with the person they are trying to chat. 
                    const match = await Swipe.findOne(
                        {
                            where: 
                            { 
                                uuid: clientID,
                                target_uuid: targetID,
                                type: 2 //means matched.
                            } 
                        }
                    );
                    if(match){
                        //if there is a match, then they are allowed to join or create a room to talk with them.
                        joinOrCreateRoom(data, ws);
                        console.log(rooms)
                        break;
                    } else {
                        ws.send(JSON.stringify({
                            "message": "No match exists between these people",
                            "status": 0,
                            "code" : 410
                        }));
                        ws.terminate();
                        break;
                    }
                case "send_message": //if they want to send a message to the room that they are in.
                    sendMessage(data, ws);
                    console.log(rooms);
                    break;
                default: //if the metadata is invalid (not one of the other options)
                    ws.send(JSON.stringify({
                        "message": "Unsupported meta data provided provide valid data",
                        "status": 0,
                        "code" : 411
                    }));
                    break;
            }
        })

        //when the connection closes, we need to save the log information to the database and handle cleanup of the rooms.
        ws.on('close', function (data: any) {
            console.log("connection close request.")
            leaveRoom(ws, { roomID: ws.roomID, clientID: ws.clientID, message: "Leave request" })
            ws.terminate();
        });

        //tells the server that they are still on the connection.
        ws.on('pong', function () {
            ws.isAlive = true;
        })
    } catch (error) {
        ws.send(JSON.stringify({
            "message": "there was some problem",
            "status": 0,
            "code" : 404
        }))
    }
});


//I believe this stuff is for timeout and stuff, but we are not using it as of right now.
/*
const interval = setInterval(function ping() {
    var a = wss.clients;
    wss.clients.forEach(function each(ws: any) {
        if (ws.isAlive === false) {
            leaveRoom(ws, { roomID: ws.roomID, clientID: ws.clientID });
            ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(noop);
    });
}, 50000);

const serverFree = setInterval(() => {
    var removeKey = [];
    for (const obj in rooms) {
        if (rooms[obj].length < 1) {
            removeKey.push(obj);
        }
    }
    for (var i = 0; i < removeKey.length; i++) {
        delete rooms[removeKey[i]];
    }
}, 30000)
*/

//joi schemas

/*
enum bodyTypeOptions {
    "lean",
    "average",
    "muscular",
    "heavy",
    "obese"
}

enum datingGoalOptions {
    "longterm",
    "shortterm",
    "hookup",
    "marriage",
    "justchatting",
    "unsure"
}

enum genderOptions {
    "man",
    "woman",
    "nonbinary"
}
*/

/**
 * The maximum number of profile photos that a user is allowed to have in their profile (can't have too many to save on resources, and other users' time.)
 */
const maxProfilePhotos = 6; 
/**
 * The minimum number of profile photos that a user is allowed to have in their profile (we don't want too few because then people are unable to get a clear idea of what they look like.)
 */
const minProfilePhotos = 3; //the minimum number of photos that someone is allowed to have in their profile.

//joi base validators

/**
 * The valid inputs for dating goals
 */
const datingGoal_base = Joi.string().valid('longterm', 'shortterm', 'hookup', 'marriage', 'justchatting', 'unsure')

/**
 * The valid inputs for the body types
 */
const bodyType_base = Joi.string().valid('lean', 'average', 'muscular', 'heavy', 'obese')

/**
 * The valid inputs for gender
 */
const gender_base = Joi.string().valid('man', 'woman', 'non-binary')

/**
 * The validator base for the reordering photos logic for upating the profile.
 * @remarks
 * - the number of these should reflect the min and max profile photos
 * - key is the new location, value is the old location. Value of -1 means that it is a new photo
 */
let reorder_photos_base = Joi.object({
    0 : Joi.number().min(-1).max(maxProfilePhotos-1).required(),
    1 : Joi.number().min(-1).max(maxProfilePhotos-1).required(),
    2 : Joi.number().min(-1).max(maxProfilePhotos-1).required(),
    3 : Joi.number().min(-1).max(maxProfilePhotos-1).optional(),
    4 : Joi.number().min(-1).max(maxProfilePhotos-1).optional(),
    5 : Joi.number().min(-1).max(maxProfilePhotos-1).optional(),
}).optional()


// Joi Schemas

/**
 * Joi schema validator for the creation of a profile
 */
const create_profile_schema = Joi.object({
    token: Joi.string().guid().required(),
    uuid: Joi.string().guid().required(),
    name: Joi.string().alphanum().max(50).required(),
    birthDate: Joi.date().required(),
    //gender: Joi.array(Joi.string().valid(genderOptions).required()),
    gender: gender_base.required(),
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
    datingGoal: datingGoal_base.required(),
    biography: Joi.string().max(300).required(),
    bodyType: bodyType_base.required(),
    longitude: Joi.number().required(),
    latitude: Joi.number().required(),
});

/**
 * Joi validator for the updating of a profile
 */
const update_profile_schema = Joi.object({
    token: Joi.string().guid().required(),
    uuid: Joi.string().guid().required(),
    gender: gender_base.optional(),
    datingGoal: datingGoal_base.optional(),
    biography: Joi.string().max(300).optional(),
    bodyType: bodyType_base.optional(),
    longitude: Joi.number().optional(),
    latitude: Joi.number().optional(),
    //the key is the index the photo should show up in the profile
    //the value is the previous index
    //if the photo doesn't move then the key and value will be the same
    //if the photo didn't exist previously, then the value will be -1 (new photo)
    reorder_photos: reorder_photos_base
});

/**
 * Joi Schema for a simple get request, where you must specify the target and provide authentication.
 */
const simple_get_schema = Joi.object({
    token: Joi.string().guid().required(),
    uuid: Joi.string().guid().required(),
    target: Joi.string().guid().optional()
});

/**
 * Joi schema for swipes (which includes matching, blocking, like, dislike etc.)
 */
const swipe_schema = Joi.object({
    token: Joi.string().guid().required(),
    uuid: Joi.string().guid().required(),
    target_uuid: Joi.string().guid().required(),
    type: Joi.number().valid(0, 1, 3, 4).required(),
    datingGoal: datingGoal_base.required()
});

/**
 * Joi schema for creating a filter.
 */
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

/**
 * Joi Schema for updating the filters of a user.
 */
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

/**
 * Joi schema for getting a person's profile.
 */
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


app.get('/test', (req: Request, res: Response) => {
    console.log(req.body);
    res.json({ message: "This is just a test function" })
})

//global section is for returning state variables and updates for the application
app.get('/global/concurrent-match-limit', (request: Request, response: Response) => {
    response.json({"limit":maxConcurrentMatches});
});

/**
 * Expects the ID token from firebase in the header "id"
 */
app.get('/auth/login', (req:Request, res:Response) => {
    //get the id from the header
    console.log(req.headers.id)
    let idToken:any = null;
    let phone:any = null;
    if(req.headers.id !== null){
        idToken = req.headers.id;
    }
    if(req.headers.phone !== null){
        phone = req.headers.phone;
    }
    if(idToken == null || phone == null){
        console.log("Invalid inputs to /auth/login")
        return;
    }
    
    //compare with the admin api
    admin.auth().verifyIdToken(idToken).then(async (decodedToken) => {
        const uid = decodedToken.uid;
        //then return the auth token and uuid to the user
        //should we just use their uid as the 

        //check the database to see if there is a user with that phone number in the Accouts table
        const account = await Account.findOne({
            where: {
                phone: phone     
            }
        });
        if(account === null){
            console.log("account doesn't exist, need to create one.")
            //if there is not, then create an entry, and set the state to 0.
            const newAccount = await Account.create({
                phone: phone,
                state: 0
            })
            console.log(`Created uuid: ${newAccount.uuid}`);
            // then also create an entry in the auth_tokens table, with that uuid to generate a token.
            const newAuth_Token = await Auth_Token.create({
                uuid: newAccount.uuid,
                expiry: DateTime.local().plus({months: 6})
            })
            //then return the uuid and the token that have been found/generated to the user.
            res.status(200).send({
                "uuid" : newAccount.uuid,
                "token" : newAuth_Token.token
            });
            return;
        } else {
            console.log("account does exist, returning the auth details.")
            //if there is, then get the uuid from that entry (and set the last active ideally)
            const newAuth_Token = await Auth_Token.findOne({
                where: {
                    uuid: account.uuid
                }
            });
            if(newAuth_Token === null){
                console.log("There was an error in authentication because an auth token was empty when it shouldn't be.");
                res.status(400).send("There was an error with authentication, please contact a system admin.")
            }else{
                if(newAuth_Token.expiry < DateTime.now()){
                    console.log("The auth token was expired, so a new one is being generated.")
                    //this means that it has expired. 
                    //delete the old entry, then create a new one with the same uuid and return that
                    await newAuth_Token.destroy();
                    const nonExpiredAuthToken = await Auth_Token.create({
                        uuid: account.uuid,
                        expiry: DateTime.local().plus({months: 6})
                    })
                    //then return the uuid and the token that have been found/generated to the user.
                    res.status(200).send({
                        "uuid" : account.uuid,
                        "token" : nonExpiredAuthToken.token
                    });
                    return;
                } else {
                    console.log("Account existed and the auth token was good, returning it...")
                    //if it is not expired, simply return the existing information.
                    res.status(200).send({
                        "uuid" : account.uuid,
                        "token" : newAuth_Token.token
                    });
                    return;
                }
            }
        }
    }).catch((error) => {
        console.log(error)
        res.status(400).send(error);
        return
    })

})

//Firebase auth endpoints
app.post("/sessionLogin", (req:Request, res:Response) => {
    const idToken = req.body.idToken.toString();

    const expiresIn = 60*60*24*5*1000;

    admin.auth().createSessionCookie(idToken, {expiresIn})
    .then((sessionCookie) => {
        console.log(`session cookie: ${sessionCookie}`)
        const options = {maxAge: expiresIn, httpOnly: true};
        res.cookie("session", sessionCookie, options);
        res.end(JSON.stringify({status : "success"}));
    },
    (error) => {
        res.status(401).send("UNAUTHORIZED REQUEST")
    }
    )
})

app.get("/firebasetest", (req:Request, res:Response) => {
    const sessionCookie = req.cookies.session || "";

    admin.auth().verifySessionCookie(sessionCookie, true /**Check revoked */)
    .then(() => {
        res.send({status : "authenticated. "})
    }).catch(() => {
        res.send({status : "not authenticated"})
    })
})

app.get("/sessionLogout", (req:Request, res:Response) => {
    res.clearCookie("session");
    res.send({status: "logged out"})
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
app.post('/account/get_auth', async (req: Request, res: Response) => {
    //TODO add the functionality in another file and call it here.

    const body = req.body;
    //check to ensure that the required parameter is present. 
    if (!body.phone) {
        res.status(400).json({ message: "Required parameter 'phone' is missing" });
        return;
    }
    let phone: string = body.phone;
    //verify that the phone number is in a valid format.
    if (!phone.match(/^(\+?\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/)) {
        res.status(400).json({ message: "Parameter 'phone' is invalid" });
        return;
    }
    // Normalize the phone number into a string like '+13324882155'
    phone = phone.replace(/[^\d+]+/g, '');
    phone = phone.replace(/^00/, '+');
    if (phone.match(/^1/)) phone = '+' + phone;
    if (!phone.match(/^\+/)) phone = '+1' + phone;
    //check to see if the user with the phone number already exists.
    let userExists: boolean = false;
    try {
        const search = await Account.findAll({
            where: {
                phone: phone
            }
        });
        console.log(`search: ${search}`);
        if (search.length == 0) {
            console.log("phone search result was empty");
            userExists = false;
        } else {
            console.log("phone search result was not empty");
            userExists = true;
        }
    } catch (err: any) {
        console.error(err.stack);
        res.status(500).json({ message: "Server error" });
        return;
    }

    //TODO hook this up with the firebase auth.

    if (body.sms_code) { //if the sms code is entered.

    } else { //if the sms code is not entered

    }

    //use this code to generate an auth_token for 1 year in future
    /*
    const auth = new Auth_Token({
        uuid: "b6a9f755-7668-483d-adc8-16b3127b81b8",
        expiry: new Date().setFullYear(new Date().getFullYear() + 1)
    });
    auth.save();
    */



    res.json({ result: "Eh. whatever" });
});

//to allow users to delete their account (set it to the deleted state)
app.put('/account/delete', async (req: Request, res: Response) => {

});

//to allow the user to set their account to the paused state, to take them out of the active queue
app.put('/account/pause', async (req: Request, res: Response) => {

});

//to allow the user to re-enter the active queue. 
app.put('/account/unpause', async (req: Request, res: Response) => {

})
// /profile hosts api endpoints to do with managing, creating and deleting user profiles. 


app.get('/profile/photoLimits', upload.none(), async (req:Request, res:Response) => {
    res.json({
        maxProfilePhotos: maxProfilePhotos,
        minProfilePhotos: minProfilePhotos
    })
})

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
app.post('/profile', multer_profile_photos_upload.array('photos', maxProfilePhotos), async (req: Request, res: Response) => {
    //TODO add the functionality in another file and call it here.

    console.log(req.files);
    //get the file paths for the newly uploaded files.
    var filepaths = (req.files as Array<Express.Multer.File>).map(function (file: any) {
        return file.path;
    });

    //checking for the correct number of photos on upload, and for empty array. 
    if(filepaths.length < minProfilePhotos || filepaths.length > maxProfilePhotos || !filepaths){
        if(filepaths.length != 0 && filepaths){
            await delete_files(filepaths)
        }
        res.json({error: "wrong number of photos entered"})
        return
    } 

    //check to ensure they supplied the required authentication field.
    if (req.headers.authorization == null) {
        //clean up the dead files. 
        await delete_files(filepaths);
        res.json({ error: "Authentication token was not supplied." });
        return
    }

    //create input object that pushes together the req body and auth headers.
    let input = Object.assign(req.body, { token: req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1) });
    try {
        //validate it with the relevant schema 
        const value = await create_profile_schema.validateAsync(input)

    } catch (err) { //if there was a problem with validation

        console.log("did not pass schema validation.")
        console.log(err)
        //clean up the dead files
        await delete_files(filepaths);
        res.json({ error: "Inputs were invalid." });
        return
    }

    //not sure if this is relevant
    /*
    //verify that the person has entered at least the minimum number of photos
    if(filepaths.length < minProfilePhotos || filepaths.length > maxProfilePhotos){
        console.log("received an invalid number of photos")
        //delete the files
        await delete_files(filepaths);
        //return error to the user
        res.json({error: "Invaild number of photos"})
        return
    }
    */
    
    //this is where the logic gets a bit complicated. If someone wants to reorder photos, how do we handle that, surely
    //we don't want to reupload all the photos? How would we handle a reupload and a reorganization.

    //at the point, the schema is valid, just need to check that the values are logical.

    //verify that the uuid/auth token pair exists in the auth table.
    let verifyresult: number = -1;
    try {
        //check to see if the auth is valid. 
        verifyresult = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err: any) { //if there was an error in the validation.
        console.error(err.stack);
        //clean up the dead files.
        await delete_files(filepaths);
        res.status(500).json({ message: "Server error" });
        return;
    }

    //if the result of the validation was invalid (aka they didn't match)
    if (verifyresult != 0) {
        //clean up the dead files
        await delete_files(filepaths);
        res.json({ error: "Authentication was invalid, please re-authenticate." });
        return
    }

    

    //function specific logic

    //check to ensure that a person doesn't exist with the provided profile.
    await Profile.count({ where: { uuid: req.body.uuid } })
        .then(async count => {
            if (count != 0) { //if someone already exists.
                console.log()
                //clean up dead files
                await delete_files(filepaths)
                res.json({ error: "Cannot post a profile if one already exists, try calling put instead" })
                return;
            } else { //if no one exists (expected route)
                console.log("Attempting to send the photos from profile get.")
                console.log(`Filepaths: ${filepaths}`)
                //get the minio client
                let minioClient = connect_minio();

                //callback that makes the create Profile query after uploading the photos
                async function callback(req: Request, imageDatabaseObject: Object) {
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
                        lastLocation: { type: 'Point', coordinates: [req.body.longitude, req.body.latitude] },
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
                    res.json({ message: "profile created" })
                }

                //this actually executues both the upload and the file deletion in sequence. 
                const imageDatabaseObject: Object = await set_user_photos_from_path(req.body.uuid, filepaths, minioClient, callback, req)

            }
        });
});

// need to add a few more things to save on image uploading:
// reorder_photos: {
//     "previous order location" : "new order location"
//     ...
//     ...
// }
// //ensure that the total number of photos does not exceed the total.
// add_photos: {
//     "index in filepaths" : "new order location"
// }
// delete_photos: {
//     "old order location" : 
// }
// may have to delete even if they are not in this list (eg they went over the limit.)

//to update an existing profile within the application.
app.put('/profile', multer_profile_photos_upload.array('photos', maxProfilePhotos), async (req: Request, res: Response) => {

    console.log("\n\n\n\n\n")
    //get the file paths for the newly uploaded files.
    var filepaths = (req.files as Array<Express.Multer.File>).map(function (file: any) {
        return file.path;
    });

    //console.log(req.body.reorder_photos)

    if(req.body.reorder_photos){
        //convert it from string to json object.
        const value:Object = JSON.parse(req.body.reorder_photos)
        //console.log(value);
        req.body.reorder_photos = JSON.parse(req.body.reorder_photos)
    }

    //console.log(req.body.reorder_photos);
    //console.log("zeroth element: " + req.body.reorder_photos['0'])

    if (req.headers.authorization == null) {
        await delete_files(filepaths)
        res.json({ error: "Authentication token was not supplied." });
        return
    }
    //let value:any;
    let value: any;
    let input = Object.assign(req.body, { token: req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1) });
    try {
        value = await update_profile_schema.validateAsync(input)
    } catch (err) {
        console.log("did not pass schema validation.")
        console.log(err)
        await delete_files(filepaths)
        res.json({ error: "Inputs were invalid." });
        return
    }

    //console.log("Got past schema validation.")

    //verify that the two exist together in the auth table.
    let result: number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err: any) {
        console.error(err.stack);
        await delete_files(filepaths)
        res.status(500).json({ message: "Server error" });
        return;
    }
    //if invalid, return without completing. 
    if (result != 0) {
        await delete_files(filepaths)
        res.json({ error: "Authentication was invalid, please re-authenticate." });
        return
    }

    //start of endpoint specific logic.

    //console.log("printing value");
   // console.log(value!);

    const profile = await Profile.findOne({ where: { uuid: req.body.uuid } });

    //console.log("profile:\n" + profile);
    if (profile) {
        //gets a new Image path object that reflects the movement of the existing ones.
        function rearrange(reorder_photos:any, prevImagePath:any):object{
            let newImagePath:any = {bucket: prevImagePath['bucket']}
            //loop through and reassign the object names to the right spots.
            for (var key of Object.keys(reorder_photos)) {
                if(reorder_photos[key] == -1) { //skip the new ones for this function.
                    continue
                }
                newImagePath[key] = prevImagePath[reorder_photos[key]]
            }
            //returns new image path
            return newImagePath
        }

        //database call to update fields.

        async function standard_field_update_callback(imagePath?:Object){

            const updateData:any = {}
            if(imagePath) updateData['imagePath'] = imagePath; 
            if(value['gender']) updateData['gender'] = value['gender']
            if(value['height']) updateData['height'] = value['height']
            if(value['datingGoal']) updateData['datingGoal'] = value['datingGoal']
            if(value['biography']) updateData['biography'] = value['biography']
            if(value['bodyType']) updateData['bodyType'] = value['bodyType']
            if(value['latitude'] && value['longitude']) updateData['lastLocation'] = { type: 'Point', coordinates: [value['longitude'], value['latitude']] }

            Profile.update(
                updateData,
                {
                    where: {uuid: value['uuid']}
                }
            ).then(()=>{
                res.json({message: "Profile updated"})
                return
            })
        }

        const prevImagePath = profile.imagePath;
        //console.log(prevImagePath)
        const count:number = get_num_images_from_imagePath(prevImagePath);

        console.log("count: " + count);
        console.log("filepaths: " + filepaths);


        if(filepaths.length > 0){ //they are trying to add images and reorder the existing ones.
            console.log("filepaths was greater than 0")
            if(req.body.reorder_photos){ // they want to upload photos and reorder them, and perhaps delete old ones.

                //enure that the first minProfilePhotos number slots are filled.
                for(let i = 0 ; i < minProfilePhotos; i++){
                    if(!req.body.reorder_photos[i]){
                        delete_files(filepaths)
                        res.json({error: "The first " + minProfilePhotos + " photos cannot be empty."})
                    }
                }

                //figure out how many they are deleting and ensure they have the correct number of photos afterwards
                //we need to figure out which values prevImagePath did not show up in reorder_photos as a value and get rid of them
                let seen:boolean[] = new Array(count).fill(false); //which of the prevImagePath locations were used
                let seen_count:number = 0;
                let negative_count:number = 0;
                for(var key of Object.keys(req.body.reorder_photos)){
                    if(req.body.reorder_photos[key] == -1){ //skip if it is new photo.
                        negative_count++
                        continue
                    }
                    seen_count++
                    seen[req.body.reorder_photos[key]] = true;
                }

                if(negative_count != filepaths.length){
                    await delete_files(filepaths)
                    res.json({error: "you tried supplying more new files than you indicated in reorder_photos"})
                    return;
                }

                let deleted_count:number = count - seen_count;
                //make sure we don't have too many photos
                if(count + filepaths.length - deleted_count > maxProfilePhotos){
                    res.json({error: "Too many photos were supplied, either delete more or upload less."})
                    delete_files(filepaths)
                    return;
                }

                let minioClient:any = connect_minio()
                //now find the ones that weren't used and delete them
                for(let i = 0; i < seen.length; i++ ){
                    if(seen[i] == false){
                        await delete_file_in_minio(minioClient, prevImagePath['bucket'], prevImagePath[i])
                    }
                }

                //rearrange the ones that have been there the whole time
                const newImagePath:any = rearrange(req.body.reorder_photos,prevImagePath)
                //upload the new ones to their respective spots
                
                //make a callback that searches for the next one/ calls the database upload

                //find the first 
                let orderIndex:number;
                let filepathsIndex:number = 0;
                for(let i = 0 ; i < req.body.reorder_photos.length ; i++){
                    if(req.body.reorder_photos[i] == -1){
                        orderIndex = i;
                        break;
                    }
                }

                async function upload_photo_callback(objName:string){
                    //update the newImagePath
                    newImagePath[orderIndex] = objName
                    filepathsIndex++
                    if(filepathsIndex < filepaths.length){
                        //search for the next one.
                        for(let i = orderIndex ; i < req.body.reorder_photos.length ; i++){
                            if(req.body.reorder_photos[i] == -1){
                                orderIndex = i;
                                break;
                            }
                        }
                        upload_photo(minioClient, newImagePath.bucket, filepaths[filepathsIndex], upload_photo_callback)
                    } else {
                        //done with uploads
                        await standard_field_update_callback(newImagePath)
                    }
                }

                upload_photo(minioClient, newImagePath.bucket, filepaths[filepathsIndex], upload_photo_callback)
                
            }else{ // they want to just upload photos, but not reorder the existing ones. 
                console.log("no reorder, add, no delete")
                if(count + filepaths.length > maxProfilePhotos){
                    delete_files(filepaths)
                    res.json({error: "You tried to upload too many photos..."})
                    return;
                }
    
                let minioClient = connect_minio();
                let newImagePath = prevImagePath
                for(let i = 0 ; i<(filepaths.length); i++){
                    console.log("looping through filepaths: " + i)
                    async function upload_photo_callback(objName:string){
                        console.log("got into upload_photo_callback")
                        //update the newImagePath
                        newImagePath[(i+count).toString()] = objName
                        console.log("updated image path: \n" + JSON.stringify(newImagePath));
                        //if it's the last one, send the database query to update ImagePath
                        if(i == filepaths.length - 1){
                            console.log("right before calling final callback: \n" + JSON.stringify(newImagePath))
                            console.log("Done with uploding, time to submit to database")
                            await standard_field_update_callback(newImagePath)
                        }
                    }
                    upload_photo(minioClient, newImagePath.bucket, filepaths[i], upload_photo_callback)
                }
            }

        } else { //they are not adding any new images.
            console.log("not adding any new photos")
            if(req.body.reorder_photos){ //they are trying to reorder their existing photos, but not add new ones. (could still be deleting)
                console.log("trying to reorder/delete photos")
                //console.log("req.body.reorder_photos:" + req.body.reorder_photos)
                //there should not be any -1 values, becuause that means new image.
                for(var key of Object.keys(req.body.reorder_photos)){
                    if(req.body.reorder_photos[key] == -1){
                        res.json({error: "if you are not uploading an image file, reorder_photos should not contain -1"})
                        return 
                    }
                }

                //compare the lengths of the previous count, to the length of the reorder photos to see if they deleted some
                if(count > Object.keys(req.body.reorder_photos).length){ //they deleted at least a photo as well as rearranging.
                    console.log("delete a photo and rearrange.")
                    //find the deleted photo(s) and delete them from the minio container

                    //we need to figure out which values prevImagePath did not show up in reorder_photos as a value.
                    let seen:boolean[] = new Array(count).fill(false); //which of the prevImagePath locations were used
                   
                    for(var key of Object.keys(req.body.reorder_photos)){
                        seen[req.body.reorder_photos[key]] = true;
                    }

                    //print out the seen array
                    console.log("seen:" + seen)
                    

                    let minioClient:any = connect_minio()
                    //now find the ones that weren't used and delete them
                    for(let i = 0; i < seen.length; i++ ){
                        if(seen[i] == false){
                            await delete_file_in_minio(minioClient, prevImagePath['bucket'], prevImagePath[i])
                        }
                    }

                    //then rearrange and callback
                    const newImagePath = rearrange(req.body.reorder_photos,prevImagePath)
                    await standard_field_update_callback(newImagePath)
                } else { //they are simply rearranging their photos
                    console.log("simply trying to reorder photos")
                    const newImagePath = rearrange(req.body.reorder_photos,prevImagePath)
                    standard_field_update_callback(newImagePath)
                }


            } else { //they are not trying to reorder photos, but simply update other fields. //PARTIALLY TESTED
                console.log("not trying to reorder or upload files, just trying to modify other fields.")
                standard_field_update_callback()
            }
        }
    } else {
        console.log("User profile not found, couldn't update state");
    }

    //res.json({ message: "Profile updated." });
})

//to allow a user application to receive information about their own profile, or another.
/*
inputs:
- target: string, tells who's profile they are trying to get (uuid)
outputs:
- profile object. 
*/
app.get('/profile', upload.none(), async (req: Request, res: Response) => {
    console.log("called get profile")
    console.log(req.body);

    if (req.headers.authorization == null) {
        res.json({ error: "Authentication token was not supplied." });
        return
    }
    let input = Object.assign(req.body, { token: req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1) });
    try {
        const value = await simple_get_schema.validateAsync(input)
    } catch (err) {
        console.log("did not pass schema validation.")
        console.log(err)
        res.json({ error: "Inputs were invalid." });
        return
    }

    //console.log("Got past schema validation.")

    //still doing authentication to prevent spammed requests. 

    //verify that the two exist together in the auth table.
    let result: number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err: any) {
        console.error(err.stack);
        res.status(500).json({ message: "Server error" });
        return;
    }

    //if invalid, return without completing. 
    if (result != 0) {
        res.json({ error: "Authentication was invalid, please re-authenticate." });
        return
    }

    async function callback(profile: Profile | null) { //this is what will be called once the profile is found.
        console.log("%cgot into callback", "color: orange")
        if (profile != null) {
            console.log("profile was not null")
            //look at the provided bucket and image names, and retrieve presigned get links. 

            //connect to minio service
            let minioClient = connect_minio();

            const bucket: string = profile.imagePath['bucket'];
            console.log(profile.imagePath)
            console.log(`got bucket name: ${bucket}`)
            const count:number = get_num_images_from_imagePath(profile.imagePath)
            console.log(`got count: ${count}`)
            //subtract one for the bucket key, which is not an image identifier. 

            //I need a different strategy, passing callbacks a specific number of times
            let countfinished: number = 0;
            //what is passed as the callback to the top level minio client and then down through the rest. 
            async function callback(err: Error, presignedURL: string) {
                if (err) return console.log(err)
                profile!.imagePath[countfinished] = presignedURL
                countfinished++
                if (countfinished < count) {
                    //call make another minio request.
                    const object = profile!.imagePath[countfinished]
                    await minioClient.presignedGetObject(bucket, object, (err: Error, presignedURL: string) => callback(err, presignedURL))
                } else {
                    //send the response
                    res.json({ profile })
                    return
                }
            }

            const object = profile!.imagePath[countfinished]
            await minioClient.presignedGetObject(bucket, object, (err: Error, presignedURL: string) => callback(err, presignedURL))

        } else {
            res.json({ error: "User profile could not be found." });
            return
        }
    }

    if (req.body.target) { //return the profile of the target
        await Profile.findOne({ where: { uuid: req.body.target } }).then((profile) => callback(profile));
    } else { //return the profile of the person that made the call
        await Profile.findOne({ where: { uuid: req.body.uuid } }).then((profile) => callback(profile));
    }


})

//allow a user to "like" another person
app.post('/swipe', async (req: Request, res: Response) => {
    //authentication
    if (req.headers.authorization == null) {
        res.json({ error: "Authentication token was not supplied." });
        return
    }
    //let value:any;
    let value: any;
    let input = Object.assign(req.body, { token: req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1) });
    try {
        value = await swipe_schema.validateAsync(input)
    } catch (err) {
        console.log("did not pass schema validation.")
        console.log(err)
        res.json({ error: "Inputs were invalid." });
        return
    }

    //console.log("Got past schema validation.")

    //verify that the two exist together in the auth table.
    let result: number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err: any) {
        console.error(err.stack);
        res.status(500).json({ message: "Server error" });
        return;
    }
    //if invalid, return without completing. 
    if (result != 0) {
        res.json({ error: "Authentication was invalid, please re-authenticate." });
        return
    }

    //TODO, at some point, add a check to make sure they aren't swiping on themselves.

    //function specific logic ---------------------

    //we keep track of both entries becuase we want to have a sense of possession as well as state.

    //get the datinggoal of the person sending the request:
    await Profile.findOne({ attributes: ['datingGoal'], where: { uuid: req.body.uuid } }).then(async (profile) => {
        if (profile) {//found profile
            let datingGoal = profile.datingGoal
            //now that we have verified the dating goal, determine if they have sent a swipe of this type and if they've received it
            const sentswipe = await Swipe.findOne({ where: { uuid: req.body.uuid, target_uuid: req.body.target_uuid, datingGoal: datingGoal } });
            const receivedswipe = await Swipe.findOne({ where: { uuid: req.body.target_uuid, target_uuid: req.body.uuid, datingGoal: datingGoal} });

            //now do the logic based on these values.
            //2 is not possible because you cannot force a match, it is done through likes. 
            switch (req.body.type) {
                case 0: //dislike
                    if (!sentswipe) { //if no previous swipe, send a dislike. 
                        Swipe.create({
                            target_uuid: req.body.target_uuid,
                            uuid: req.body.uuid,
                            type: 0,
                            datingGoal: datingGoal
                        }).then(() => {
                            res.json({message: "dislike sent"})
                        })
                    } else {
                        res.json({error: "a previous swipe existed, thus you shouldn't have been shown this. Please report"})
                    }
                    break;
                case 1: //like
                    
                    function create_match_callback() {
                        if (receivedswipe && receivedswipe['type'] == 1) {
                            //congrats, you have a match.
                            //update your like to a match.
                            Swipe.update(
                                {
                                    type: 2
                                },
                                {
                                    where: {
                                        target_uuid: req.body.target_uuid,
                                        uuid: req.body.uuid,
                                        datingGoal: datingGoal
                                    }
                                }
                            ).then(() => {
                                //update their like to a match.
                                Swipe.update(
                                    {
                                        type: 2
                                    },
                                    {
                                        where: {
                                            target_uuid: req.body.uuid,
                                            uuid: req.body.target_uuid,
                                            datingGoal: datingGoal
                                        }
                                    }
                                ).then(() => {
                                    res.json({message: "match created!"})
                                    return
                                })
                            })
                            
                        }else{
                            res.json({message: "like created"})
                        }
                    }

                    if (!sentswipe) { //if no previous swipe, send a like
                        Swipe.create({
                            target_uuid: req.body.target_uuid,
                            uuid: req.body.uuid,
                            type: 1,
                            datingGoal: datingGoal
                        }).then(() => create_match_callback)
                        //then see if the other person has liked you
                    } else if (sentswipe && sentswipe!['type'] == 0) { //allow them to upgrade a dislike to a like.
                        Swipe.update(
                            {
                                type: 1
                            },
                            {
                                where: {
                                    target_uuid: req.body.target_uuid,
                                    uuid: req.body.uuid,
                                    datingGoal: datingGoal
                                }
                            }
                        ).then(() => create_match_callback)
                    }
                    break;
                case 3: //unmatch
                    //update both entries to unmatched. sad...
                    Swipe.update({
                        type: 3
                    },
                        {
                            where: {
                                target_uuid: req.body.target_uuid,
                                uuid: req.body.uuid,
                                datingGoal: datingGoal
                            }
                        }
                    ).then(() => {
                        Swipe.update(
                            {
                                type: 3
                            },
                            {
                                where: {
                                    target_uuid: req.body.uuid,
                                    uuid: req.body.target_uuid,
                                    datingGoal: datingGoal
                                }
                            }
                        ).then(() => {
                            res.json({message: "unmatch complete"})
                        })
                    })
                    break;
                case 4: //block
                    //update entry to be blocking the other person. 

                    function block_callback(){

                        //if no previous swipe exists
                        if (!sentswipe) {
                            Swipe.create({
                                target_uuid: req.body.target_uuid,
                                uuid: req.body.uuid,
                                type: 4,
                                datingGoal: datingGoal
                            }).then(() => {
                                res.json({message: "user blocked"})
                            })
                        } else {
                            Swipe.update(
                                {
                                    type: 4
                                },
                                {
                                    where: {
                                        target_uuid: req.body.target_uuid,
                                        uuid: req.body.uuid,
                                        datingGoal: datingGoal
                                    }
                                }
                            ).then(()=> {
                                res.json({message: "user blocked"})
                            })
                        }
                    }

                    //if the other person's entry is matched, change to unmatched
                    if (receivedswipe && receivedswipe['type'] == 2) {
                        Swipe.update(
                            {
                                type: 3 //set to unmatched.
                            },
                            {
                                where: {
                                    uuid: req.body.target_uuid,
                                    target_uuid: req.body.uuid,
                                    datingGoal: datingGoal
                                }
                            }
                        ).then(() => block_callback)
                    } else { //if they are not matched, just call the rest of the functionality
                        block_callback()
                    }

                    break;
            }

        } else { //return an error.
            res.json({ error: "could not find a profile that matched the uuid " })
            return
        }

    });
    res.json({ message: "Swipe Executed" });
});

//set the filters for a profile for the first time 
app.post('/filter', async (req: Request, res: Response) => {

    //console.log(req.body);

    //authentication
    if (req.headers.authorization == null) {
        res.json({ error: "Authentication token was not supplied." });
        return
    }
    //let value:any;
    let value: any;
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
        token: req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1),
    });

    try {
        value = await create_filter_schema.validateAsync(input)
    } catch (err) {
        console.log("did not pass schema validation.")
        console.log(err)
        res.json({ error: "Inputs were invalid." });
        return
    }

    console.log("Got past schema validation.")

    //verify that the two exist together in the auth table.
    let result: number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err: any) {
        console.error(err.stack);
        res.status(500).json({ message: "Server error" });
        return;
    }
    //if invalid, return without completing. 
    if (result != 0) {
        res.json({ error: "Authentication was invalid, please re-authenticate." });
        return
    }

    //check to see if one exists already, if so, ignore it.
    const existingFilter = await Filter.findOne({ where: { uuid: req.body.uuid } });
    if (!existingFilter) {
        console.log("creating filter");
        Filter.create(inputNoToken);
        res.json({ message: "filter created" });
    }
    else {
        res.json({ message: "filter already existed, try put if you intend to modify." });
    }

});

//update the filters for a user
app.put('/filter', async (req: Request, res: Response) => {
    //authentication
    if (req.headers.authorization == null) {
        res.json({ error: "Authentication token was not supplied." });
        return
    }
    //let value:any;
    let value: any;

    //need to modify this to be ok it is not present maybe with ? or :? idk.
    let inputNoToken = {
        uuid: req.body.uuid,
        ...(req.body.birthDate.min && { minBirthDate: req.body.birthDate.min }),
        ...(req.body.birthDate.max && { maxBirthDate: req.body.birthDate.max }),
        ...(req.body.height.min && { minHeight: req.body.height.min }),
        ...(req.body.height.max && { maxHeight: req.body.height.max }),
        ...(req.body.gender.man && { genderMan: req.body.gender.man }),
        ...(req.body.gender.woman && { genderWoman: req.body.gender.woman }),
        ...(req.body.gender.nonBinary && { genderNonBinary: req.body.gender.nonBinary }),
        ...(req.body.bodyType.lean && { btLean: req.body.bodyType.lean }),
        ...(req.body.bodyType.average && { btAverage: req.body.bodyType.average }),
        ...(req.body.bodyType.muscular && { btMuscular: req.body.bodyType.muscular }),
        ...(req.body.bodyType.heavy && { btHeavy: req.body.bodyType.heavy }),
        ...(req.body.bodyType.obese && { btObese: req.body.bodyType.obese }),
        ...(req.body.maxDistance && { maxDistance: req.body.maxDistance })
    }

    console.log(inputNoToken)

    let input = Object.assign(inputNoToken, {
        token: req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1),
    });

    try {
        value = await update_filter_schema.validateAsync(input)
    } catch (err) {
        console.log("did not pass schema validation.")
        console.log(err)
        res.json({ error: "Inputs were invalid." });
        return
    }

    console.log("Got past schema validation.")

    //verify that the two exist together in the auth table.
    let result: number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err: any) {
        console.error(err.stack);
        res.status(500).json({ message: "Server error" });
        return;
    }
    //if invalid, return without completing. 
    if (result != 0) {
        res.json({ error: "Authentication was invalid, please re-authenticate." });
        return
    }

    //function specific logic
    const existingFilter = await Filter.findOne({ where: { uuid: req.body.uuid } });
    if (existingFilter) {
        console.log("creating filter");
        Filter.update(inputNoToken, { where: { uuid: req.body.uuid } });
        res.json({ message: "filter created" });
    }
    else {
        res.json({ message: "filter doesn't exist, call post if you intend to create one." });
    }

})

//return the top people that meet the user's filters. This one is going to require
//the most thinking of how we want to do it. For now I'm going to implement the most 
//simplistic version, where it only takes into account the filters applied. 
/*
inputs: 
- number: 
*/
app.get('/people', async (req: Request, res: Response) => {
    //limit the number in the schema

    //authentication
    if (req.headers.authorization == null) {
        res.json({ error: "Authentication token was not supplied." });
        return
    }
    //let value:any;
    let value: any;
    let input = Object.assign(req.body, { token: req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1) });
    try {
        value = await get_people_schema.validateAsync(input)
    } catch (err) {
        console.log("did not pass schema validation.")
        console.log(err)
        res.json({ error: "Inputs were invalid." });
        return
    }

    //console.log("Got past schema validation.")

    //verify that the two exist together in the auth table.
    let result: number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err: any) {
        console.error(err.stack);
        res.status(500).json({ message: "Server error" });
        return;
    }
    //if invalid, return without completing. 
    if (result != 0) {
        res.json({ error: "Authentication was invalid, please re-authenticate." });
        return
    }

    //function specific logic:
    //find the first (<=number) of people that match the dating goal from the profile, and the filters in the filter table.
    const profile = await Profile.findOne({ where: { uuid: req.body.uuid } });
    if (profile) {
        //console.log(profile);
        //get the dating goal of the profile
        let datingGoal: string = profile.datingGoal
        //get the filters of that person
        const filter = await Filter.findOne({ where: { uuid: req.body.uuid } });
        if (filter) {
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
            const query1: string = `SELECT * FROM "Profiles" WHERE uuid != '${profile.uuid}' and height >= 134.34 and 'birthDate' >= '${filter.minBirthDate}';`
            //const query1:string = `SELECT * FROM "Profiles" WHERE uuid != '${profile.uuid}' and 'birthDate' >= '${filter.minBirthDate}' and 'birthDate' <= '${filter.maxBirthDate}';`


            //join with account table to check if they are active recently? 

            //const query:string = `SELECT * FROM (SELECT * FROM "Profiles" WHERE uuid != ${profile.uuid} and "birthDate" >= ${filter.minBirthDate} and birthDate" <= ${filter.maxBirthDate} LIMIT 100) as profileresult LEFT JOIN "Filters" ON profileresult.uuid = "Filters".uuid) WHERE ${profile.birthDate} >= "minBirthDate" and ${profile.birthDate} <= "maxBirthDate" LIMIT ${req.body.number}`;
            const [results, metadata] = await sequelize.query(query1)

            //const [results,metadata] = await sequelize.query(
            //    "SELECT * FROM Filters JOIN Profiles ON Filters.uuid = Profiles.uuid"
            //)
            console.log(results)

            res.json({ message: "REPLACE THIS" })
        } else {
            res.json({ message: "couldn't find the user's filters" })
        }
    } else {
        res.json({ message: "couldn't find the user profile." })
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
app.get('/block/number', async (req: Request, res: Response) => {

})


//allow a user to get all current likes on themselves
app.get('/likes')

//get all current matches

app.get('/matches', async (req:Request, res:Response) => {
    //authentication
    if (req.headers.authorization == null) {
        res.json({ error: "Authentication token was not supplied." });
        return
    }
    //let value:any;
    let value: any;
    let input = Object.assign(req.body, { token: req.headers.authorization.substring(req.headers.authorization.indexOf(' ') + 1) });
    input = Object.assign(input, { uuid: req.headers.uuid});
    try {
        value = await simple_get_schema.validateAsync(input)
    } catch (err) {
        console.log("did not pass schema validation.")
        console.log(err)
        res.json({ error: "Inputs were invalid." });
        return
    }

    //console.log("Got past schema validation.")

    //verify that the two exist together in the auth table.
    let result: number = -1;
    try {
        result = await validate_auth(req.body.uuid, req.headers.authorization!);
    } catch (err: any) {
        console.error(err.stack);
        res.status(500).json({ message: "Server error" });
        return;
    }
    //if invalid, return without completing. 
    if (result != 0) {
        res.json({ error: "Authentication was invalid, please re-authenticate." });
        return
    }

    //get the matches for the user from the database according to the target uuid provided
    Swipe.findAll(
        {
        attributes: [
            'target_uuid'
        ],
        where: {
          type: 2,
          uuid: req.body.uuid
        }
    }).then((values => {
        let retarr:String[] = [];
        values.forEach(element => {
            retarr.push(element.target_uuid)
        });

        console.log(retarr);  
        res.json(retarr)
    }));



}) 

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

app.get('/storage/miniotest4', async (req: Request, res: Response) => {
    let objects: string[] = ['123$0', '123$1'];
    let minioClient = await connect_minio();
    await get_user_photos(minioClient, 'nanortheast', objects)
});




// /test stuff is just for messing around. Delete before pushing to main/production
app.get('/test/1', async (req: Request, res: Response) => {

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

app.get('/test/2', async (req: Request, res: Response) => {
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
        if (process.send) {
            process.send(`Server running at http://localhost:${SERVICE_PORT}\n\n`);
        }
        console.log(`Server running at http://localhost:${SERVICE_PORT}\n\n`)
    });

    //console.log(`listening on port ${SERVICE_PORT!.toString()}`);
});

