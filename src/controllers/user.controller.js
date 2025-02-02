import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshToken=async (userId)=>{
    try {
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();

        user.refreshToken=refreshToken;

        await user.save({validateBeforeSave:false});

        return {accessToken,refreshToken};
        
    } catch (error) {
        throw new ApiError(500, "Error in generating tokens");
    }
}

const registerUser = asyncHandler(async (req, res) => {
   
//1. Get the data from req.body and check if all fields are present (ex: username, email, password)
// 2. Check in the db, if a user with provided email is already present or not.
// 3. If present, then return. If not, then proceed further.
// 4. Create a new user in the db with provided details from req.body.
// 5. Send a success message to client.

    const {username, email, password,fullName} = req.body;
    if(!username || !email || !password || !fullName){
        throw new ApiError(400, "Please provide all the details");
    }

    const existedUser=await User.findOne({
        $or: [{email},{username}]
    })
    if(existedUser){
        throw new ApiError(409, "User with this email or username already exists");
    }
    const avatarLocalPath=req.files?.avatar[0]?.path;
    //const coverImageLocalPath=req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path;
    }
    else{
        coverImageLocalPath="";
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Please provide avatar image");
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);
    //console.log(avatar);
    
    const user=await User.create({
        username:username.toLowerCase(),
        email,
        password,
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?coverImage.url:""
    })
    const createdUser=await User.findById(user._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500, "User not created");
    }

    return res.status(201).json(
        new ApiResponse(201,createdUser,"User created successfully")
    )



})

const loginUser = asyncHandler(async (req, res) => {
    // req body —> data
    // username or email
    // find the user
    //password check
    //generate access and referesh token
    // send cookie

    const {username,email, password} = req.body;
    if(!username && !email){
        throw new ApiError(400, "Please provide username or email");
    }

    const user =await User.findOne({
        $or:[{username},{email}] // $or mongoose operator
    })
    if(!user){
        throw new ApiError(404, "User not found");
    }
    const isPasswordValid=await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401, "Incorrect Password");
    }
    //now generate access and refresh token
    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id);

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken");

    const cookieOptions={
        httpOnly:true,
        secure:true // this is done so that cookie cant be modified in frontend 
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,cookieOptions)
    .cookie("refreshToken",refreshToken,cookieOptions)
    .json(new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken //video 16 time 31:00
            },
            "User logged in successfully"
        )
    )



})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            },
            $unset: {
                accessToken: 1 // this removes the field from document
            }
        },
        {
            new:true
        }
    )
    const cookieOptions={
        httpOnly:true,
        secure:true 
    }
    return res
    .status(200)
    .clearCookie("accessToken",cookieOptions)
    .clearCookie("refreshToken",cookieOptions)
    .json(new ApiResponse(200,{},"User logged out successfully"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})


export {registerUser, loginUser,logoutUser,refreshAccessToken}