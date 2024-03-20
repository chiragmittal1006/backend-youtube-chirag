import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAvatar,
  updateCoverImage,
  updateUserDetails,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secure routes

router.route("/logout").post(verifyJwt, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJwt, changeCurrentPassword);

router.route("/current-user").get(verifyJwt, getCurrentUser);

router.route("/update-user").patch(verifyJwt, updateUserDetails);

router.route("/avatar").patch(verifyJwt, upload.single("avatar"), updateAvatar);

router
  .route("/coverImage")
  .patch(verifyJwt, upload.single("coverImage"), updateCoverImage);

router.route("/c/:username").get(verifyJwt, getUserProfile);

router.route("/get-watch-history").get(verifyJwt, getWatchHistory);

export default router;

//   getUserProfile,
//   getWatchHistory,
