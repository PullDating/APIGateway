import { FileExtensionInfo } from "typescript";
import {MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_USE_SSL, MINIO_PORT, MINIO_ENDPOINT} from "../../config";
const Minio = require('minio'); //for object storage
const defaultBucket = 'nanortheast';

const {PassThrough} = require('stream');

export async function connect_minio(){
    const minioClient = new Minio.Client({
        endPoint: MINIO_ENDPOINT,
        port: MINIO_PORT,
        useSSL: MINIO_USE_SSL, 
        accessKey: MINIO_ACCESS_KEY,
        secretKey: MINIO_SECRET_KEY
    });
    return minioClient;
}

//utilities that are useful for uploading and saving files and images for the app.

//for now we will use a single bucket (instead of zones, which could make it faster, but not for now)

//set images for a user
//not cleaining inputs here, that should be done in the app code, since this is only called by the app.
export async function set_user_photos(uuid: string, photos: any[],  minioClient: any){

    //first remove all the images that are already in the bucket, if they exist:
    console.log("Got into set photo function.");
    
    //put objects with the correct name format into the bucket 'uuid$index'

    //it is seeing an empty photo array. not sure why....
    console.log(`length of photos array: ${photos.length}`)
    for (let i = 0; i < photos.length; i++) { 
        var metaData = {
            'content-type' : photos[i].type.toString(),
        }

        console.log(`Sending object ${i}`);
        const objName = uuid.concat("$", i.toString());
        console.log(`object name: ${objName}`)
        minioClient.putObject(defaultBucket, objName, photos[i], metaData, function(err: any, objInfo: any) {
            console.log("Tried PutObject...")
            if(err){
                return console.log(err)
            }
            console.log("Success", objInfo.etag,objInfo.versionId)
        });
    }

    
}

//get images for a user
export async function get_user_photos(){

}

//scan images for a user to make sure there is nothing funky about them

//compression stuff? 

export function uploadStream(uuid:string, minioClient:any){
    const pass = new PassThrough();

    console.log('uploadSteam() called')

    const objName = "objectname";

    var metaData = {
    }

    minioClient.putObject(defaultBucket, objName, pass, metaData, function(err: any, objInfo: any) {
            console.log("Tried PutObject...")
            if(err){
                return console.log(err)
            }
            console.log("Success", objInfo.etag,objInfo.versionId)
        });

    console.log("Done uploading to minio")

    return pass;

}

