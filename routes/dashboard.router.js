import { Router } from 'express';
import {
    getChannelStats,
} from "../controllers/dashboard.controller.js"
import {verifyJwt} from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJwt); // Apply verifyJWT middleware to all routes in this file

router.route("/stats/:username").get(getChannelStats);

export default router