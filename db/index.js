import mongoose from "mongoose";
import {DB_name} from "../constants.js";

const connectDB = async () => {
    console.log(`${process.env.MONGODB_URI}/${DB_name}`)
    try{
      const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_name}`);
      console.log(`\n mongodb connected !! DB HOST : ${connectionInstance.connection.host}`)
    }
    catch(error){
        console.log("mongodb connection error : ",error);
        // throw error
        process.exit(1)
    }

};

export default connectDB;

