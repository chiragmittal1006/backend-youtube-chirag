import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: `${process.env.cloudinary_name}`,
  api_key: `${process.env.cloudinary_api_key}`,
  api_secret: `${process.env.api_secret}`,
});

const fileUploadCloudinary = async (localfilepath) => {
  try {
    if (!localfilepath) {
      return null;
    }
    //file path not found
    else {
      const response = await cloudinary.uploader.upload(localfilepath, {
        resource_type: "auto",
      });
      //file has been successfully uploaded
      console.log("file has been uploaded on cloudinary !!", response.url);
      return response;
    }
  } catch (error) {
    if (localfilepath) {
      fs.unlinkSync(localfilepath); //agar file aayi aur cloudinary prr nahi phochi toh corrupted file ya koi issue hai toh server se bhi hata dete hai
    }
    return null;
  }
};

export { fileUploadCloudinary };
