import mongoose, { Schema } from "mongoose";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';



const userSchema = new Schema(
    {
        username:{
            type: String,
            required: true,
            lowercase: true,
            unique: true,
            trim: true,
            index: true
        },
        email:{
            type: String,
            required: true,
            lowercase: true,
            unique: true,
            trim: true,
        },
        fullName:{
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar:{
            type: String, //server link like aws 
            required: true,
        },
        coverImage:{
            type: String,
        },
        watchHistory:[
            {
                type: Schema.Types.ObjectId,
                ref: "Video",
            }
        ],
        password:{
            type: String,
            required: [true, "Password is required"]
        },
        refershToken: {
            type: String,
        }

    },
    {
        timmestamps: true
    }
)

userSchema.pre("save", async function (next) {  //first we are taking pre hook then using some fn to secure pass using bcrypt
    if(!this.isModified("password")) return next(); //I check if the pass is created/changed if not move to next code

    this.password = await bcrypt.hash(this.password, 10)
    next()
})


userSchema.methods.isPasswordCorrect = async function
(password){
   return await bcrypt.compare(password, this.password) //first users pass is compared to hashed pass and returns a boolean value
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    
)}

export const User = mongoose.model("User", userSchema)