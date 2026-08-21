import express from "express";
import userAuth from "../middlewares/auth.js";
import { getReceivedRequests, getAcceptedConnections, getFeed, searchUsers, getUserProfile } from "../controllers/user.controller.js";

const userRouter = express.Router();

userRouter.get("/user/requests/received", userAuth, getReceivedRequests);
userRouter.get("/user/connections", userAuth, getAcceptedConnections);
userRouter.get("/feed", userAuth, getFeed);
userRouter.get("/user/search", userAuth, searchUsers);
userRouter.get("/user/:userId", userAuth, getUserProfile);

export default userRouter;