import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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

    const existedUser=User.findOne({
        $or: [{email},{username}]
    })
    if(existedUser){
        throw new ApiError(409, "User with this email or username already exists");
    }
    const avatarLocalaPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;

    if(!avatarLocalaPath){
        throw new ApiError(400, "Please provide avatar image");
    }
    const avatar=await uploadOnCloudinary(avatarLocalaPath);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);
    
    const user=await User.create({
        username:username.toLowerCase(),
        email,
        password,
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?coverImage.url:""
    })
    const createdUser=await user.findById(user._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500, "User not created");
    }

    return res.status(201).json(
        new ApiResonse(201,createdUser,"User created successfully")
    )



})
export {registerUser}