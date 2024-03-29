import { FileExtensionInfo } from "typescript";
import {MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_USE_SSL, MINIO_PORT, MINIO_ENDPOINT} from "../../config";
const Minio = require('minio'); //for object storage
const defaultBucket = 'nanortheast';
const fs = require('fs')
import { DateTime } from "luxon";
import { callbackify } from "util";
var crypto = require("crypto");


const {PassThrough} = require('stream');

export function connect_minio(){
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
export async function set_user_photos_from_path(uuid: string, imagePaths: string[], minioClient: any,callback:any, req:any, bucketName:string = defaultBucket): Promise<Object>{

    let returnObject:Object = {"bucket": bucketName}

    //first remove all the images that are already in the bucket, if they exist:
    console.log("Got into set photo function.");
    
    //put objects with the correct name format into the bucket 'uuid$index'

    //it is seeing an empty photo array. not sure why....

    let i:number = 0;

    async function PutObjectCallback() {
        var metaData = {
            'Content-Type' : 'image/webp',
            hello : "hi"
        }
        const objName:string = DateTime.now().toString() + crypto.randomBytes(10).toString('hex') + ".webp";
        await minioClient.fPutObject(bucketName, objName, `./${imagePaths[i]}`, metaData, await async function(err: any, objInfo: any) {
            console.log("Tried fPutObject...")
            if(err){
                return console.log(err)
            }
            returnObject = Object.assign(returnObject, {[i.toString()] : `${objName}`})
            console.log("Success", objInfo.etag,objInfo.versionId)
            await delete_file(imagePaths[i]).then(() =>{
                if(i==imagePaths.length-1){
                    console.log("Trying to call the callback!")
                    console.log(returnObject)
                    callback(req, returnObject);
                } else {
                    i++;
                    PutObjectCallback();
                }
            })
        
        });
    }

    await PutObjectCallback()
    return returnObject;

    // console.log(`length of photos array: ${imagePaths.length}`)
    // for (let i = 0; i < imagePaths.length; i++) { 
    //     var metaData = {
    //         hello : "hi"
    //     }

    //     console.log(`Sending object ${i}`);
    //     //const objName = uuid.concat("$", i.toString());
    //     //instead use a hashing algorithm to produce the object name
    //     //datetime to string
    //     const objName:string = DateTime.now().toString() + crypto.randomBytes(10).toString('hex');
    //     //console.log(`object name: ${objName}`)
    //     await minioClient.fPutObject(bucketName, objName, `./${imagePaths[i]}`, metaData, await async function(err: any, objInfo: any) {
    //         console.log("Tried fPutObject...")
    //         if(err){
    //             return console.log(err)
    //         }
    //         returnObject = Object.assign(returnObject, {[i.toString()] : `${objName}`})
    //         console.log("Success", objInfo.etag,objInfo.versionId)
    //         await delete_file(imagePaths[i]).then(() =>{
    //             if(i==imagePaths.length-1){
    //                 console.log("Trying to call the callback!")
    //                 console.log(returnObject)
    //                 callback(req, returnObject);
    //             }
    //         })
            
    //     });
    // }
    
}

export async function delete_file_in_minio(minioClient:any, bucketName:string, objectName:string){
    console.log("got_into_delete_file_in_minio")
    minioClient.removeObject(bucketName, objectName, function(err:Error) {
        if (err) {
          return console.log('Unable to remove object', err)
        }
        console.log('Removed the object: ' + objectName)
      })
}

export default async function upload_photo(minioClient:any, bucketName:string, imagePath:string, callback:Function, metaData?:any, ){
    console.log("inside upload_photo")
    if(!metaData){
        metaData = {
            'Content-Type' : 'image/webp',
            hello : "hi"
        }
    }
    const objName:string = DateTime.now().toString() + crypto.randomBytes(10).toString('hex') + ".webp";
    await minioClient.fPutObject(bucketName, objName, `./${imagePath}`, metaData, await async function(err: any, objInfo: any) {
        console.log("Tried fPutObject...")
        if(err){
            return console.log(err)
        }
        console.log("object: " + objName + " was sent to the minio bucket.")
        await delete_file(imagePath).then(async () => {
            console.log("file deleted")
            await callback(objName)
        })
    });
}

/*
//remember to empty the file from uploads after whatever functionality you are doing, so that it doesn't build up in size.
export async function set_user_photos_from_multer(uuid:string, multer_files:any[], minioClient:any,_callback:any){
    console.log("attempting to set the user photos from multer")
    //get the file paths for the newly uploaded files.
    var filepaths = (multer_files as Array<Express.Multer.File>).map(function(file: any) {
        return file.path;
    });
    //;
}
*/

//get images for a user
//remember to empty the references to downloads afer you're done. 
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

export async function delete_files(filepaths:string[]){
    for(let i = 0; i < filepaths.length; i++){
        await fs.unlink(`./${filepaths[i]}`, await function(err:any) {
            if (err) throw err;
            console.log("File deleted")
        } )
    }
    console.log("all files deleted successfully");
}

export async function delete_file(filepath:string){
    await fs.unlink(`./${filepath}`, function(err:any) {
        if (err) throw err;
        console.log("File deleted")
    } )
}

//scan images for a user to make sure there is nothing funky about them

//compression stuff
export function get_num_images_from_imagePath(imagePath:Object):number {
    //subtract one for the bucket
    return Object.keys(imagePath).length - 1;
}

