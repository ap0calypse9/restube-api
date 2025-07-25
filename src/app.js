import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'


const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN, //define from where i allow requests
    credentials: true
}))

app.use(express.json({limit: "16kb"})) //defining json acceptance and how much josn data is acceptable

app.use(express.urlencoded({extended: true, limit: "16kb"})) //defining how to handle data from url 

app.use(express.static("public")) // defining where to store static assets

app.use(cookieParser( ))

export { app }