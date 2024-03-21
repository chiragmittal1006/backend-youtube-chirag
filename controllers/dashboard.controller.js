import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Subscription } from "../models/subscriptions.model.js";
import { Like } from "../models/likes.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  const { username } = req.params;

  const creater = await User.findOne({ username: username });

  if (!creater) {
    throw new ApiError(400, "username is wrong");
  }

  const data = await User.aggregate([
    {
      $match: {
        _id: creater._id,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "videos",
        pipeline: [
          {
            $match: {
              owner: creater._id,
              isPublished: true,
            },
          },
          {
            $lookup: {
              from: "comments",
              localField: "_id",
              foreignField: "video",
              as: "commented",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                    },
                  },
                ],
            },
          },
          {
            $addFields: {
              totalCommentCount: {
                $size: "$commented",
              },
            },
          },
          {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes",
            }
          },
          {
            $addFields: {
                totalLikes: {
                    $size : "$likes"
                }
            }
          }
        ],
      },
    },
    {
      $addFields: {
        totalVideoCount: {
          $size: "$videos",
        },
      },
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:'subscribers',
            pipeline:[
                {
                    $project:{
                        _id:1
                    }
                }
            ]
        }
    },
    {
        $addFields:{
            subscriberCount:{
                $size: "$subscribers"
            }
        }
    },
    {
        $project:{
            fullname:1,
            username:1,
            email:1,
            avatar:1,
            coverImage:1,
            totalCommentCount:1,
            totalVideoCount:1,
            videos:1,
            subscriberCount:1
        }
    }
  ]);

  let totalCommentCount = 0;
  data.forEach((user) => {
    user.videos.forEach((video) => {
      totalCommentCount += video.totalCommentCount;
    });
  });

  let totalVideoCount = 0;
  data.forEach((user) => {
    totalVideoCount += user.videos.length;
  });

  let totalLikes = 0;
  data.forEach((user)=>{
    user.videos.forEach((video)=>{
        totalLikes += video.totalLikes;
    })
  })

  let subscriberCount = 0;
  data.forEach((user) => {
        subscriberCount += user.subscriberCount;
    });

  if (!data) {
    throw new ApiError(400, "no data fetched");
  }

  const responseData = {
    data: data,
    totalCommentCount: totalCommentCount,
    totalVideoCount: totalVideoCount,
    totalLikes: totalLikes,
    subscriberCount: subscriberCount
  };

//   console.log(responseData)  //this is the object having information about total video count , total comment count , total likes count , and videos

  res.status(200).json(new ApiResponse(200, responseData, "data fetched successfully"));
});

export { getChannelStats };
