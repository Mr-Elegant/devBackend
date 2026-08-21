import express from "express";
import userAuth from "../middlewares/auth.js";
import { sendRequest, reviewRequest, getRejectedRequests } from "../controllers/request.controller.js";

const requestRouter = express.Router();

requestRouter.post("/request/send/:status/:toUserId", userAuth, sendRequest);
requestRouter.post("/request/review/:status/:requestId", userAuth, reviewRequest);
requestRouter.get("/user/requests/rejected", userAuth, getRejectedRequests);

export default requestRouter;