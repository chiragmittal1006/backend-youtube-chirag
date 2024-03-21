import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet

  const { content } = req.body;

  if (!content || content.trim() === "") {
    throw new ApiError(400, "comment is required");
  }

  const user = req.user;

  if (!user) {
    throw new ApiError(400, "user is not logged In");
  }

  const tweet = await Tweet.create({
    content:content,
    owner:user._id
  })

  if(!tweet){
    throw new ApiError(500 , "tweet is not done")
  }

  res.status(200).json(new ApiResponse(200 , tweet , "tweet done successfully"))
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets

  const {userId} = req.params

  if (!isValidObjectId(userId)) {
    throw new ApiError(400 , "user Id is not valid")
  }

  if(!userId){
    throw new ApiError(400 , "user is not logged in")
  }

  const tweets = await Tweet.aggregate([
    {
        $match:{
            owner: new mongoose.Types.ObjectId(userId)
        }
    },
    {
        $project:{
            content:1
        }
    }
  ])

  res.status(200).json(new ApiResponse(200 , tweets , "all tweets are fetched"))
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet

  const {tweetId} = req.params

  const {content} = req.body

  if(!content || content.trim()===""){
    throw new ApiError(400 , "tweet is required")
  }

  if(!isValidObjectId(tweetId)){
    throw new ApiError(400 , "in valid tweet id")
  }

  const tweet = await Tweet.findByIdAndUpdate(tweetId , {content : content}, {new:true})

  if(!tweet){
    throw new ApiError(400 , "tweet doesn't exist")
  }

  res.status(200).json(new ApiResponse(200 , tweet , "tweet updated successfully"))

});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet

  const {tweetId} = req.params

  if(!isValidObjectId(tweetId)){
    throw new ApiError(400 , "in valid tweet id")
  }

  const tweet = await Tweet.findByIdAndDelete(tweetId)

  if(!tweet){
    throw new ApiError(400 , "tweet doesn't exist")
  }

  res.status(200).json(new ApiResponse(200 , "" , "tweet updated successfully"))

});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
