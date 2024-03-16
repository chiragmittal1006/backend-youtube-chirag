// require('dotenv').config({path : '../.env'})

import dotenv from "dotenv";
import connectDB from "./db/index.js";
// import  Express  from "express";
// const app = Express();
import {app} from "./app.js"

dotenv.config({
  path: "../.env",
});

connectDB()
  .then(() => {
    app.listen(`${process.env.PORT || 3000}`);
    console.log(`server is running at : ${process.env.PORT || 3000}`);
    app.on("ERROR", (error) => {
      console.log("error : ", error);
      throw error;
    });
  })
  .catch((err) => {
    console.log("mongodb connection failed !!", err);
  });


// import  express  from "express"
// const app = express()

// ;(async () => {
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_name}`);
//         console.log("mongodb is connected")
//         app.on("ERROR",(error)=>{
//             console.log("error : ", error)
//             throw error
//         })

//         app.listen(process.env.PORT,()=>{
//             console.log("App is listening at : ", process.env.PORT)
//         })
//     }
//     catch(error){
//         console.log("Error : " , error)
//         throw error
//     }
// })()
