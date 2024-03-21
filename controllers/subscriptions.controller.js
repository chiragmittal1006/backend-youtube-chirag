import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Subscription} from "../models/subscriptions.model.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    const channel_id = new mongoose.Types.ObjectId(channelId)
    
    const user = req.user?._id;

    if(!isValidObjectId(channel_id)){
        throw new ApiError(400 , "channel id is not correct")
    }

    if(!user){
        throw new ApiError(400, "user is not logged In")
    }

    const channel = await Subscription.findOne({channel : channel_id , subscriber : user?._id})

    if(!channel){
        const subscriber = await Subscription.create({
            subscriber: user._id,
            channel : channel_id,
        })

        if(!subscriber){
            throw new ApiError(500 , "channel did't got subscribed")
        }

        res.status(200).json(new ApiResponse(200 , subscriber , "channel subscribed successfully"))
    }

    else{
        const oldSubscriber = await Subscription.findOneAndDelete({channel : channel_id})

        if(!oldSubscriber){
            throw new ApiError(500 , "channel didn't got unsubscribed")
        }

        res.status(200).json(new ApiResponse(200 , {} , "user got unsubscribed successfully"))
    }


})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new ApiError(400 , "channel id is not valid")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match:{
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscriber",
                pipeline:[
                    {
                        $project:{
                            fullname:1,
                            avatar:1,
                            username:1
                        }
                    },
                ]
            }
        }
    ])

    if(!subscribers){
        throw new ApiError(400 , "subscribers not found")
    }

    const totalSubscriberCount = subscribers[0].subscriber.length;

    const responseData = {
        totalSubscriberCount: totalSubscriberCount,
        subscribers : subscribers
    }

    res.status(200).json(new ApiResponse(200 , responseData , "subescribers fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const user_id = req.user?._id;

    if(!user_id){
        throw new ApiError(400 , "user is not logged In")
    }

    const channels = await Subscription.aggregate([
        {
            $match:{
                subscriber: user_id
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"subscribedChannels",
                pipeline:[
                    {
                        $project:{
                            fullname:1,
                            username:1,
                            avatar:1
                        }
                    }
                ]
            }
        }
    ])

    const responseData = {
        subscribedChannelCount : channels[0].subscribedChannels.length,
        channels: channels[0].subscribedChannels
    }

    res.status(200).json(new ApiResponse(200 , responseData , "subscribed channels fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}