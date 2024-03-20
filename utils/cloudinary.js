import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({
  path: "../.env",
});

//kuch toh error de raha hai pata nahi ku    ......      // kuch toh error de rha tha last 2 ghante se prr abb sahi se kaam krr rha hai when i use dotenv ...remember dotenv ko config kro toh path sahi daalna chekc krr lena konsa path work krr rha hai example : path : ../../.env or ./.env or ../.env 

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const fileUploadCloudinary = async (localfilepath) => {
  try {
    if (!localfilepath) return null;
    //file path not found
      const response = await cloudinary.uploader.upload(localfilepath, {
        resource_type: "auto",
      });

      fs.unlinkSync(localfilepath)
      //file has been successfully uploaded
      console.log("file has been uploaded on cloudinary !!", response.url);
      return response;
  } catch (error) {
    if (localfilepath) {
      fs.unlinkSync(localfilepath); //agar file aayi aur cloudinary prr nahi phochi toh corrupted file ya koi issue hai toh server se bhi hata dete hai
    }
    return null;
  }
};

const deleteFromCloudinary = async (oldImage) => {
  try {
    const parts = oldImage.split("/");
    const publicId = parts[parts.length - 1].split(".")[0];
    await cloudinary.uploader.destroy([publicId], {
      type: "upload",
      resource_type: "image",
    }).then(result => console.log(result));
  } catch (error) {
    console.error("Error deleting file from Cloudinary: ", error);
  }
};

export { fileUploadCloudinary , deleteFromCloudinary};
