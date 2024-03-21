import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/likes.model.js"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import {Tweet} from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    /*
    check in the liked dataset where if video is liked then delete the data and if not then create it
     */

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "video id is not valid")
    }

    const id = new mongoose.Types.ObjectId(videoId)

    const video = await Video.findById(id)

    if(!video){
        throw new ApiError(400 , "comment id is not valid")
    }

    const user_id = req.user?._id;

    if(!user_id){
        throw new ApiError(400 , "user is not logged in")
    }

    const like = await Like.findOne({ likedBy : user_id , video : id });

    let likeDone;

    if(!like){
        likeDone = await Like.create({
            video: id,
            likedBy: user_id
        })

        if(!likeDone){
            throw new ApiError(500 , "video is not liked")
        }
    }

    else{
        likeDone = await Like.deleteOne({ _id : like._id })

        if(!likeDone){
            throw new ApiError(500 , "video is not disliked")
        }
    }

    res.status(200).json(new ApiResponse(200 , likeDone , "toggle functionality working"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {

    const {commentId} = req.params
    //TODO: toggle like on comment

    /*
    check in the liked dataset where if video is liked then delete the data and if not then create it
     */

    if(!isValidObjectId(commentId)){
        throw new ApiError(400 , "comment id is not valid")
    }

    const id = new mongoose.Types.ObjectId(commentId)

    const comment = await Comment.findById(id)

    if(!comment){
        throw new ApiError(400 , "comment id is not valid")
    }

    const user_id = req.user?._id;

    if(!user_id){
        throw new ApiError(400 , "user is not logged in")
    }

    const like = await Like.findOne({ likedBy : user_id , comment : id });

    let likeDone;

    if(!like){
        likeDone = await Like.create({
            comment: id,
            likedBy: user_id
        })

        if(!likeDone){
            throw new ApiError(500 , "comment is not liked")
        }
    }

    else{
        likeDone = await Like.deleteOne({ _id : like._id })

        if(!likeDone){
            throw new ApiError(500 , "comment is not disliked")
        }
    }

    res.status(200).json(new ApiResponse(200 , likeDone , "comment toggle functionality working"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    /*
    check in the liked dataset where if tweet is liked then delete the data and if not then create it
     */

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400 , "tweet id is not valid")
    }

    const id = new mongoose.Types.ObjectId(tweetId)

    const tweet = await Tweet.findById(id)

    if(!tweet){
        throw new ApiError(400 , "Tweet id is not valid")
    }

    const user_id = req.user?._id;

    if(!user_id){
        throw new ApiError(400 , "user is not logged in")
    }

    const like = await Like.findOne({ likedBy : user_id , tweet : id });

    let likeDone;

    if(!like){
        likeDone = await Like.create({
            tweet: id,
            likedBy: user_id
        })

        if(!likeDone){
            throw new ApiError(500 , "tweet is not liked")
        }
    }

    else{
        likeDone = await Like.deleteOne({ _id : like._id })

        if(!likeDone){
            throw new ApiError(500 , "tweet is not disliked")
        }
    }

    res.status(200).json(new ApiResponse(200 , likeDone , "tweet toggle functionality working"))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const user = req.user?._id;

    const allVideos = await Like.aggregate([
        {
            $match:{
                likedBy: user
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"likedVideo",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerOfVideo",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }, 
                                {
                                    $addFields:{
                                        ownerOfVideo: {
                                            $arrayElemAt: ["$ownerOfVideo",0]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        {
            $project:{
                likedVideo:1
            }
        },
        {
            $addFields:{
                totalLikedVideos : {
                    $size: "$likedVideo"
                }
            }
        }
    ])

    if(!allVideos){
        throw new ApiError(400 , "user have not liked any video")
    }

    res.status(200).json(new ApiResponse(200 , allVideos , "liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}