import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if([name , description].some((field) => field?.trim() === "")){
        throw new ApiError(400, "name and description are required")
    }

    //TODO: create playlist

    const user_id = req.user?._id

    if(!user_id){
        throw new ApiError(400 , "user is not logged In")
    }

    const playlist = await Playlist.create({
        name: name,
        description: description,
        owner: user_id
    })

    if(!playlist){
        throw new ApiError(500 , "playlist is not being created")
    }

    res.status(200).json(new ApiResponse(200 , playlist , "playlist created successfully"))

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    /*
    user_id toh req se bhi mil sakti hai 
    aggregation pipeline to get playlist having owner as that user
    */
    // if(!isValidObjectId(playlistId)){
    //     throw new ApiError(400 , "playlist id is wrong")
    // }

    if(!isValidObjectId(userId)){
        throw new ApiError(400 , "user Id not found")
    }
    const playlist = await Playlist.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $project:{
                videos:1,
                name:1,
                description:1
            }
        }
    ])
    if(!playlist){
        throw new ApiError(400 , "playlist not found")
    }

    console.log(playlist)
    res.status(200).json(new ApiResponse(200 , playlist , "playlist fetched by id successfully"))

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400 , "playlist id is not valid")
    }

    const playlist = await Playlist.findById(playlistId).populate("videos")

    if(!playlist){
        throw new ApiError(400 , "playlist not exist")
    }

    res.status(200).json(new ApiResponse(200 , playlist , "playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    /*

     */

    if(!isValidObjectId(playlistId) && !isValidObjectId(videoId)){
        throw new ApiError(400 , "playlist_id or video_id is not correct")
    }

    const playlist = await Playlist.findById(playlistId);

    const videoFound = await Playlist.findOne({ _id : playlistId , videos : videoId})

    if(videoFound){
        throw new ApiError(400 , "video already exist in playlist")
    }

    if (!playlist.videos || playlist.videos.length === 0) {
        playlist.videos = []; // Initialize empty videos array if not present
      }

    const playlistData = await Playlist.findByIdAndUpdate(
        playlistId,
        { $push: { videos: videoId } },
        { new: true,populate: 'videos' } // To return the updated document
    );    

    if(!playlistData){
        throw new ApiError(500 , "video is not pushed in playlist")
    }

    res.status(200).json(new ApiResponse(200 , playlistData , "video added successfully"))

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId) && !isValidObjectId(videoId)){
        throw new ApiError(400 , "playlist_id or video_id is not correct")
    }

    const videoFound = await Playlist.findOne({ _id : playlistId , videos : videoId})

    if(!videoFound){
        throw new ApiError(400 , "video doesn't exist in playlist")
    }

    const playlistData = await Playlist.findByIdAndUpdate(
        playlistId,
        { $pull: { videos: videoId } },
        { new: true } // To return the updated document
    );    

    if(!playlistData){
        throw new ApiError(500 , "video is not popped out of playlist")
    }

    res.status(200).json(new ApiResponse(200 , playlistData , "video removed successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400 , "playlist id is not valid")
    }

    const playlist = await Playlist.findById(playlistId)

    if(playlist.owner === req.user?._id){
        throw new ApiError(400 , "you are not authenticated to update this playlist")
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)

    if(!deletePlaylist){
        throw new ApiError(400 , "playlist not found or not deleted")
    }

    res.status(200).json(new ApiResponse(200 , deletedPlaylist , "playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if([name , description].some((field) => field?.trim() === "")){
        throw new ApiError(400, "name and description are required")
    }

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400 , "playlist id is not valid")
    }

    const id = new mongoose.Types.ObjectId(playlistId)

    const playlist = await Playlist.findById(id)

    if(playlist.owner == req.user?._id){
        throw new ApiError(400 , "you are not authenticated to update this playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId , {name : name , description : description},{new: true})

    if(!updatedPlaylist){
        throw new ApiError(400 , "either playlist not exist or not updated successfully")
    }

    res.status(200).json(new ApiResponse(200 , updatedPlaylist , "playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}