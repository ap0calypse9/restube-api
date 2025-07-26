import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})


connectDB()
    .then(() => {

        app.on("error",  (error) => {
            console.log("ERORR: ", error)
            throw error
        })
        app.listen(process.env.PORT || 8000,  () => {
            console.log(`Server is running at port : 
                ${process.env.PORT}`)
        })
    })
    .catch((error) => {
        console.error("Database connection failed!", error)
    })















/*
import express from "express"

const app = express()


;( async () => {
    try{
        await mongoose.connect(`${protcess.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error", (error) => {
            cosmnole.log("ERROR", error);
            throw error
        })

app.listen(process.env.PORT, () => {
    console.log(`App is listening on port ${process.env.PORT}`);
})

    }catch(error){
        console.error("ERROR!", error)
        throw error
    }

})()
    */