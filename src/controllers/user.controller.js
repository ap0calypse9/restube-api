import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCLoudinary } from "../utils/cloudinary.js"
import { Apiresponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await User.findOne(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    }catch{
        throw new ApiError(500, "something went wrong while generating refresh and access tokens")
    }
}




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

const loginUser = asyncHandler(async(req, res)=> {

//fetch data frotm req body
//take username or email to login the user
//is the password correct ?
//generate acess and refresh token
//send cookies
//generate a message if login is success or error

    const {email, username, password} = req.body

    if(!(username || email)) {
        throw new ApiError(400, "username and email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user) {
        throw new ApiError(400, "User doesnot exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }



    const {accessToken, refreshToken} = await
     generateAccessAndRefreshTokens(user._id)

    const loggedUSer = User.findById(user._id).
    select("-password -refreshToken")


    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiError(
            200,
            {
                user: loggedUSer,
                accessToken,
                refreshToken
            },
            "User Logged in Successfully"
        )
    )

})


const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

     const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken", options)
    .json(new Apiresponse(200, {}, "User logged Out"))

})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshtoken = req.cookies.
    refreshToken || req.body.refreshToken

    if (!incomingRefreshtoken) {
        throw new ApiError(401, "unauthorised request")
    }

try {
    
        const decodedToken = jwt.verify(
            incomingRefreshtoken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refersh Token")
        }
    
        if(incomingRefreshtoken != user?.refershToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
        const  {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200)
        .cookie("accessToken",accessToken, options)
        .cookie("refreshToken",newRefreshToken, options)
        .json(
            new Apiresponse(
                200,
                {accessToken, refershToken: newRefreshToken},
                "Access token refreshed"
            )
        )
} catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh Token")
}

})


const changeCurrentPassword = asyncHandler( async (req, res)=> {
    const {oldPassword, newPassword} = req.body
    
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) {
        throw new ApiError(400, "Password is incorrect")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new Apiresponse(200, {}, "Password changed successfully"))

})

const getCurrentuser = asyncHandler(async (req, res)=> {
    return res
    .status(200)
    .json(new Apiresponse(200, req.user, "Current user fetched scucessfully"))
})

const updateAccountDetails = asyncHandler(async(req, res)=> {
    const {fullName, email} = req.body

    if(!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new Apiresponse(200, user, "Account details updated successfully "))

})

const updateAvatar = asyncHandler(async(req, res)=> {
    const avatarLocalPath = req.file?.path 

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar file is missing")
    }

    const avatar = await uploadOnCLoudinary(avatarLocalPath)

    if(!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            set:{
                avatar: avatar.url
            }

        },
        {new: true}
    ).select("-password")
        return res
    .status(200)
    .json(new Apiresponse(200, user, "avatar updated successfully"))

})

const updateUserCoverImage = asyncHandler(async(req, res)=> {
    const coverImageLocalPath = req.file?.path 

    if(!coverImageLocalPath){
        throw new ApiError(400, "cover-image file is missing")
    }

    const coverImage = await uploadOnCLoudinary(coverImageLocalPath)

    if(!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover-image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            set:{
                coverImage: coverImage.url
            }

        },
        {new: true}
    ).select("-password")


    return res
    .status(200)
    .json(new Apiresponse(200, user, "cover image updated successfully"))

})


const getUserChannelProfile = asyncHandler(async(req, res)=> {
   const {username} = req.params

   if(!username?.trim()) {
    throw new ApiError(400, "username is missing")
   }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subcriptions",
                localField: "_id",
                foreignField: "channel",
                as:"subcribers"
            }
        },
        {
            $lookup: {
                from: "subcriptions",
                localField: "_id",
                foreignField: "subcriber",
                as:"subcriberdTo"
            }
        },
        {
            $addFields: {
                subcribersCount: {
                    $size: "$subcribers"
                },
                channelsSubcribedToCount: {
                    $size: "subcribedTo"
                },
                isSubcribed:{
                    $cond: {
                        if: {$in: [req.user?._id,"$subcribers.subcriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subcribersCount: 1,
                channelsSubcribedToCount: 1,
                isSubcribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,

            }
        }
    ])


    if(!channel?.length) {
        throw new ApiError(404,"channel does not exists")
    }

    return res
    .status(200)
    .json(new Apiresponse(200, channel[0], "user channel fetched successfully"))

})

const getWatchHistory = asyncHandler(async(req, res)=> {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new Apiresponse(200, user[0].watchHistory, "watch history fetched successfully"))

})



export { registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        getCurrentuser,
        changeCurrentPassword,
        updateAccountDetails,
        updateAvatar,
        updateUserCoverImage,
        getUserChannelProfile,
        getWatchHistory


 }