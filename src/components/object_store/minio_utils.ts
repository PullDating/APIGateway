import { FileExtensionInfo } from "typescript";
import {MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_USE_SSL, MINIO_PORT, MINIO_ENDPOINT} from "../../config";
const Minio = require('minio'); //for object storage
const defaultBucket = 'nanortheast';
const fs = require('fs')

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
export async function set_user_photos_from_path(uuid: string, imagePaths: string[],  minioClient: any){

    //first remove all the images that are already in the bucket, if they exist:
    console.log("Got into set photo function.");
    
    //put objects with the correct name format into the bucket 'uuid$index'

    //it is seeing an empty photo array. not sure why....
    console.log(`length of photos array: ${imagePaths.length}`)
    for (let i = 0; i < imagePaths.length; i++) { 
        var metaData = {
            hello : "hi"
        }

        console.log(`Sending object ${i}`);
        const objName = uuid.concat("$", i.toString());
        console.log(`object name: ${objName}`)
        minioClient.fPutObject(defaultBucket, objName, imagePaths[i], metaData, function(err: any, objInfo: any) {
            console.log("Tried fPutObject...")
            if(err){
                return console.log(err)
            }
            console.log("Success", objInfo.etag,objInfo.versionId)
        });
    }

    
}

export async function set_user_photos_from_multer(uuid:string, multer_files:any[], minioClient:any){
    console.log("attempting to set the user photos from multer")
    //get the file paths for the newly uploaded files.
    var filepaths = (multer_files as Array<Express.Multer.File>).map(function(file: any) {
        return file.path;
    });
    set_user_photos_from_path(uuid, filepaths, minioClient);
}

//get images for a user
//the uuid is baked into the objectNames so we don't need to send it explicitly.
export async function get_user_photos(minioClient:any, bucketName:string, objectNames:string[]){

    for(let i = 0; i < objectNames.length; i++){ //for each photo object name.
        //create filestream that points to the download folder.
        const fileStream = fs.createWriteStream(`./downloads/${objectNames[i]}`);
        //connect to the minio client to get the object reference.
        const object = await minioClient.getObject(bucketName, objectNames[i]);
        //when data is received, write it to the fileStream
        object.on("data", (chunk:any) => fileStream.write(chunk));
        //when the object download is over, return.
        object.on("end", () => {
            console.log(`Reading ${objectNames[i]} finished`)
            return
        });

    }

}

//scan images for a user to make sure there is nothing funky about them

//compression stuff

