import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //get all comments for a video

  /*
  1) get the video through its id in params
  2) get the user who is commenting and then in sub pipeline project his fullname , username , avatar only
  3) get the person who is liking the comment and size of the array of person liking the comment
  4) find the number of likes on the comment through the size of the array of person liking the comment
  5) sort the comments and then return the comment
  */

  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  if (!videoId || !pageNum || !limitNum || pageNum === 0) {
    throw new ApiError(400, "Please provide a valid input");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $skip: (pageNum - 1) * limitNum,
    },
    {
      $limit: limitNum,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "commentedBy",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        commentedBy: {
          $arrayElemAt: ["$commentedBy", 0],
        },
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likeOnComment",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "likedBy",
              foreignField: "_id",
              as: "likedByUser",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    email: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              totalLikesOnComment: {
                $size: "$likedByUser",
              },
              createdAt: "$$ROOT.createdAt", // Add created time of the comment
              updatedAt: "$$ROOT.updatedAt", // Add updated time of the comment
            },
          },
        ],
      },
    },
  ]);

  if (!comments?.length) {
    throw new ApiError(
      400,
      "No comments found for this video. Or, you may try a lower page number."
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  /*
  
  find the video
  find the user
  get the comment
  validate all these
  create comment

  */

  const { videoId } = req.params;
  const { content } = req.body;
  const user = await User.findById(req.user?._id).select("-password -refreshtoken -email -avatar -coverImage -watchHistory");

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "wrong video or wrong url searched");
  }

  if (!content || content.trim() === "") {
    throw new ApiError(400, "comment is required");
  }

  if (!user) {
    throw new ApiError(404, "user is not found");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "This video does not exist");
  }

  const comment = await Comment.create({
    content: content,
    video: video,
    owner: user,
  });

  const postedComment = await Comment.findById(comment._id);

  if (!postedComment) {
    throw new ApiError(500, "Something went wrong while posting a comment");
  }

  res
    .status(200)
    .json(new ApiResponse(200, comment, "comment done successfully"));

  await comment.populate("video owner").execPopulate();
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  /*
  get the video
  get the user
  get the new comment
  validate all these things
  findByOwner and update 
   */

  const { videoId } = req.params;

  if(!isValidObjectId(videoId)){
    throw new ApiError(400, "video is not available or wrong url")
  }

  const user = await User.findById(req.user?._id);

  const { content } = req.body;

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Either the url is wrong or video is unavailable");
  }

  if (!user) {
    throw new ApiError(404, "user is not logged in");
  }

  if (!content || content.trim() === "") {
    throw new ApiError(400, "comment is required");
  }

  const comment = await Comment.findOneAndUpdate(
    { owner: user._id, video: video._id },
    { content: content },
    { new: true, runValidators: true }
  );

  res
    .status(200)
    .json(new ApiResponse(200, comment, "comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  /*
  get the video
  get the user
  get the new comment
  validate all these things
  findByOwner and delete
  */

  const { videoId } = req.params;

  if(!isValidObjectId(videoId)){
    throw new ApiError(400, "video is not available or wrong url")
  }

  const user = await User.findById(req.user?._id);

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Either the url is wrong or video is unavailable");
  }

  if (!user) {
    throw new ApiError(404, "user is not logged in");
  }

  const comment = await Comment.findOneAndDelete(
    { owner: user._id, video: video._id }
  );

  if(!comment){
    throw new ApiError(404, "comment not found")
  }

  res
    .status(200)
    .json(new ApiResponse(200, comment, "comment updated successfully"));

});

export { getVideoComments, addComment, updateComment, deleteComment };
