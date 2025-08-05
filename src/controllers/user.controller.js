import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCLoudinary } from "../utils/cloudinary.js"
import { Apiresponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
    //get user details for tm frontend
    //validation
    //check if user already exists with email?, username?
    //check for images , check fort avatar
    //if available then upload them  to cloudinary
    //create user object - create entry in db
    //remove pass and refresh token field from response
    //check for user creation
    //return res

    const { fullName, email, username, password } = req.body
    //console.log("email", email)


    if (
        [fullName, email, username, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username exists")
    }
    //console.log(req.files)

    const avatarLocalPath = req.files?.avatar[0]?.path

   // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) &&  
    req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0]?.path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }


    const avatar = await uploadOnCLoudinary(avatarLocalPath)
    const coverImage = await uploadOnCLoudinary(coverImageLocalPath)


    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }


    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select( //in sleect method we mention the parameters we dont want as everything is selected by default
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user!!")
    }


    return res.status(201).json(
        new Apiresponse(200, createdUser, "User registered successfully")
    )



})




export { registerUser }