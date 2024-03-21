import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, fileUploadCloudinary } from "../utils/cloudinary.js";

// completed all the controllers

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  const pageNum = Number(page);
  const limitNum = Number(limit);

  if (!Number.isInteger(pageNum) || !Number.isInteger(limitNum) || pageNum <= 0 || limitNum <= 0) {
    throw new ApiError(400, "Please provide valid page and limit values as positive integers");
  }

  // Build match stage for query parameter //written by chatgpt
  const matchStage = {};
  if (query) {
    matchStage.$match = { $or: [{ title: { $regex: query, $options: 'i' } }, { description: { $regex: query, $options: 'i' } }] };
  }

  // Build sort stage for sortBy and sortType parameters
  const sortStage = {};
  if (sortBy && sortType) {
    sortStage.$sort = { [sortBy]: sortType === 'asc' ? 1 : -1 };
  }

  const getAllVideo = await Video.aggregate([
    {
        $match:{
          isPublished: true
        }
    },
    {
      $skip: (pageNum - 1) * limitNum,
    },
    {
      $limit: limitNum,
    },
    // matchStage,
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerOfVideo",
        pipeline: [
          {
            $addFields: {
              owner: {
                $arrayElemAt: ["$ownerOfVideo", 0],
              },
            },
          },
          {
            $project: {
              fullname: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    // sortStage,
  ]);

  if (!getAllVideo?.length) {
    throw new ApiError(404, "videos not found");
  }


  return res
    .status(200)
    .json(new ApiResponse(200, getAllVideo, "videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

//checking if the title and description is empty?
  if (
    [title , description].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Please enter valid title and description");
  }

  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    const videoFileLocalPath = req.files?.videoFile[0]?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail file is required");
  }

  if (!videoFileLocalPath) {
    throw new ApiError(400, "videoFile file is required");
  }

  const thumbnail = await fileUploadCloudinary(thumbnailLocalPath);

  const videoFile = await fileUploadCloudinary(videoFileLocalPath);

  if (!thumbnail) {
    throw new ApiError(400, "thumbnail file is required");
  }

  if (!videoFile) {
    throw new ApiError(400, "videoFile file is required");
  }

  const owner = req.user?._id;

  if(!isValidObjectId(owner)){
    throw new ApiError(400 , "owner is not logged in or user_id is not valid")
  }

  const videoPublished = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title: title,
    description: description,
    owner: owner
  })

  if(!videoPublished){
    throw new ApiError(500 , "internal issue the video is not published")
  }

  res.status(200).json(new ApiResponse(200 , videoPublished , "video is published successfuly"))

});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "videoID is not valid")
  }
  //TODO: get video by id
  /*
  video ke sath sath owner ki details bhi chahiye
   */

  const videoFile = await Video.aggregate([
    {
        $match:{
            _id: new mongoose.Types.ObjectId(videoId)
        }
    },
    {
        $lookup:{
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"ownerDetails",
            pipeline:[
                {
                    $project:{
                        fullname:1,
                        username:1,
                        avatar:1,
                    }
                }
            ]
        }
    },
    {
        $addFields:{
            ownerDetails:{
                $arrayElemAt:["$ownerDetails",0]
            }
        }
    },
    {
        $lookup:{
            from: "comments",
            localField: "_id",
            foreignField: "video",
            as:"comment",
            pipeline:[
                {
                    $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"commentedBy",
                        pipeline:[
                            {
                                $project:{
                                    fullname:1,
                                    username:1,
                                    avatar:1,
                                }
                            }
                        ]
                    },
                },
                {
                  $project:{
                    content:1,
                    owner:1,
                    commentedBy:1
                  }
                },
                {
                    $addFields: {
                        commentedBy: {
                            $arrayElemAt : ["$commentedBy",0]
                        }
                    }
                },
            ]
        }
    },
    {
      $lookup:{
        from:"likes",
        localField:"_id",
        foreignField:"video",
        as:"liked",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"likedBy",
              foreignField:"_id",
              as:"likedBy",
              pipeline:[
                {
                  $project:{
                    fullname:1,
                    avatar:1,
                    username:1
                  }
                },
                {
                  $addFields:{
                    likedBy:{
                      $arrayElemAt: ["$likedBy",0]
                    }
                  }
                }
              ]
            }
          },
        ]
      }
    },
    {
      $addFields:{
        likeCount: {
          $size: "$liked"
        }
      }
    }
    
  ])

  if(!videoFile){
    throw new ApiError(400 , "video not found")
  }

  res.status(200).json(new ApiResponse(200 , videoFile , "video fetched successfully"))

});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail

  const id = new mongoose.Types.ObjectId(videoId)

  const videofind = await Video.findById(id);

  const oldImage = videofind.thumbnail;

  const {title , description} = req.body;

  const thumbnail = req.file?.path;

  if(!title || !description){
    throw new ApiError(400 , "please enter valid either title, description or thumbnail")
  }

  if(!thumbnail){
    throw new ApiError(400 , "thumbnail is required")
  }

  const thumbnailPath = await fileUploadCloudinary(thumbnail)

  if(!thumbnailPath){
    throw new ApiError(400 , "thumbnail is required")
  }

  const videoFile = await Video.findByIdAndUpdate(id , {
    $set: {
      thumbnail: thumbnailPath.url,
      title:title,
      description : description
    },
  },
  { new: true })

  if(!videoFile){
    throw new ApiError(500 , "video is not updated")
  }

  deleteFromCloudinary(oldImage)

res.status(200).json(new ApiResponse(200, videoFile, "video updated successfully"))
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  /*
    find the video id
    perform findByIdAndDelete operation
  */

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "video id is not valid")
    }

    const id = new mongoose.Types.ObjectId(videoId)

    const video = await Video.findById(id)

    if(!video){
        throw new ApiError(404, "video not found")
    }

    const deletedVideo = await Video.findByIdAndDelete(id)

    if(!deletedVideo){
        throw new ApiError(400 , "video is not deleted")
    }

    res.status(200).json(new ApiResponse(200 , deletedVideo , "video has been deleted successfully"))
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  /*
  get the video through video
  get the isPublished status if it is true make it false and if it is false make it true
  save kro new: true , validateBeforeSave false kro done
  */

  const id = new mongoose.Types.ObjectId(videoId);

  const video = await Video.findById(id);

  if(video.isPublished === true){
    video.isPublished = false;
  }
  else{
    video.isPublished = true;
  }

  await video.save({validateBeforeSave : false})

  const updatedVideo = await Video.findById(id)

  res.status(200).json(new ApiResponse(200 , updatedVideo , "isPublished has been toggled"))
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
