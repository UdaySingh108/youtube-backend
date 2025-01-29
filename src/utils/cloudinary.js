import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';
cloudinary.config({ 
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME, 
    api_key:process.env.CLOUDINARY_API_KEY, 
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) =>{
    try {
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto",
        })
        //file has been uploaded 
        //console.log("file uploaded on cloudinary",response.url);
        if(localFilePath){
            fs.unlinkSync(localFilePath);
        }
        return response;
    } catch (error) {
        console.log("Error in uploading file on cloudinary",error);
        
        if(localFilePath){
            fs.unlinkSync(localFilePath);
        }//remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}
export {uploadOnCloudinary}