import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY // Click 'View API Keys' above to copy your API secret
});



const uploadOnCLoudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //if path exists then upload the file
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"

        })
        //file uploaded successfully
       // console.log("file is uploaded on cloudinary",
            //response.url)
        fs.unlinkSync(localFilePath)   
        return response

    } catch (error) {
        fs.unlinkSync(localFilePath) //removes the local files saved in server after they failed to be uploaded on cloudinary 
    }
}



export {uploadOnCLoudinary}

