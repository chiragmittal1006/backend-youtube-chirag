import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { fileUploadCloudinary , deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
// generate access and refresh token

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); // validate krr rhe hai ki jab user ka refresh token le rhe hai toh baar baar usko password na daalna pade aur mongoose ke methods kick in na hojae

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating refresh and access token"
    );
  }
};

//register new user

const registerUser = asyncHandler(async (req, res) => {
  // res.status("200").json({
  //     message : "ok"
  // })

  // get user details through postman
  // validation ....not empty
  // check if user already exist: username,email
  // check if file is correct (images , avatar)
  // upload them to cloudinary .... avatar on cloudinary hogya ya nahi
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  //getting details from frontend
  const { fullname, username, password, email } = req.body;
  //   console.log(`email : ${email}`);

  //checking if the name,email,password,username is empty?
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Please enter valid details");
  }

  //checking if the email is having any blank space or any special character
  let flag1 = false;
  let flag2 = true;
  var splittedname = email.split("");
  for (var i = 0; i < splittedname.length; i++) {
    if (splittedname[i] === "@") {
      flag1 = true;
    }
    if (
      splittedname[i] === " " /* || !/^[a-zA-Z0-9]+$/.test(splittedname[i]) */
    ) {
      flag2 = false;
    }
  }

  if (flag1 === false || flag2 === false) {
    throw new ApiError(400, "Please enter valid email id");
  } else {
    // console.log("valid email is given");
  }

  //checking ki kya user phle se exist krta hai kya?
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exist , please enter valid details");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is required");
  }

  const avatar = await fileUploadCloudinary(avatarLocalPath);

  const coverImage = await fileUploadCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "avatar file is required");
  }

  //creating the user
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //making it possible to be a user without refreshtoken and password
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while user registering");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered successfully"));
});

// login controller

const loginUser = asyncHandler(async (req, res) => {
  //get the username or email ..req.body se data lelenge
  //get password
  //find if the user with the email or username exist or not and password is correct or not
  //accesstoken and refreshtoken ??
  //send cookies
  //send response

  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "please provide atleast email or username");
  }

  const userFinded = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!userFinded) {
    throw new ApiError(404, "user don't exist");
  }

  const isPasswordValid = await userFinded.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    userFinded._id
  );

  const loggedInUser = await User.findById(userFinded._id).select(
    "-password -refreshtoken"
  );

  //making sure ki cookie frontend se koi ched chaad na kar paye
  const options = {
    httpOnly: true,
    secure: true,
  };

  //cookie parsor
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken }, //sending this accesstoken and refreshtoken ki agar user ko cookie store krni hai locally ya mobile app wgera ke liye toh....
        "user logged in successfully"
      )
    );
});

//logout functionality

const logoutUser = asyncHandler(async (req, res) => {
  try {
    //clear the cookie
    //expire refresh access token
    await User.findByIdAndUpdate(
      req.user._id,
    { $unset: { refreshToken: 1 /* it will remove the field from document */ } },
      { new: true }
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "user Logout successfully"));
  } catch (error) {
    throw new ApiError(500, "Internal Server Error");
  }
});

//refresh access token

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    // .select("-password -refreshToken");

    if (!user) {
      throw new ApiError(401, "Invalid refresh Token");
    }

    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    //res ke liye cookie use krte hai aur req ke liye cookies
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "please enter the valid old password");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(
      new ApiResponse(200, req.user, "fetched the current user successfully")
    );
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const toUpdateUser = await User.findById(req.user._id);

  if (!toUpdateUser) {
    throw new ApiError(400, "user is not logged in");
  }

  const { fullname, email } = req.body;

  if (!(fullname || email)) {
    throw new ApiError(400, "please provide fullName or email");
  }

  //checking if the email is having any blank space or any special character
  if (email) {
    let flag1 = false;
    let flag2 = true;
    var splittedname = email.split("");
    for (var i = 0; i < splittedname.length; i++) {
      if (splittedname[i] === "@") {
        flag1 = true;
      }
      if (
        splittedname[i] === " " /* || !/^[a-zA-Z0-9]+$/.test(splittedname[i]) */
      ) {
        flag2 = false;
      }
    }

    if (flag1 === false || flag2 === false) {
      throw new ApiError(400, "Please enter valid email id");
    } else {
      // console.log("valid email is given");
    }
  }

  const user = await User.findById(req.user._id);

  if (fullname && email) {
    user.fullname = fullname;
    user.email = email;
  } else if (!fullname) {
    user.fullname = user.fullname;
    user.email = email;
  } else if (!email) {
    user.email = user.email;
    user.fullname = fullname;
  }

  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "details updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const userFind = await User.findById(req.user._id);

  const oldImage = userFind.avatar;

  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(404, "avatar file not found");
  }

  const avatar = await fileUploadCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(500, "file not uploaded on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

deleteFromCloudinary(oldImage)

  res
    .status(200)
    .json(new ApiResponse(200, user, "avatar is updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const userFind = await User.findById(req.user._id);

  const oldImage = userFind.coverImage;

  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(404, "coverImage file not found");
  }

  const coverImage = await fileUploadCloudinary(coverImageLocalPath);

  if (!coverImage) {
    throw new ApiError(500, "file not uploaded on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true } // To return the updated document
  ).select("-password");

  deleteFromCloudinary(oldImage)

  res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage is updated successfully"));
});

const getUserProfile = asyncHandler(async (req,res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: { username: username?.toLowerCase() },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "channel_subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$channel_subscribedTo",
        },
        isSubcribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        email: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubcribed: 1,
        avatar: 1,
        coverImage: 1,
        username: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exist");
  }

  console.log(channel);

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "user channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req,res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory", //yaha prr $addFields nahi lagayege kyuki addfield krege fir  $arrayElemAt se sirf first object out of the complete array of objects containing information of videos through video model yaha sirf pehla video milega jabki hume pura array chahiye.
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
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
                {
                  $addFields: {
                    owner_details: {
                      $first: "$owner",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      $addFields: {
        watchHistoryCount: {
          $size: "$watchHistory",
        },
      },
    },
  ]);

  if (!user || user.length === 0) {
    throw new ApiError(404, "user is not logged in.");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watchHistory fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateAvatar,
  updateCoverImage,
  getUserProfile,
  getWatchHistory,
};
