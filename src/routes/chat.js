import express from "express";
import userAuth from "../middlewares/auth.js";
import { getChat } from "../controllers/chat.controller.js";

const chatRouter = express.Router();

/**
 * GET OR CREATE CHAT
 */
chatRouter.get("/chat/:targetUserId", userAuth, getChat);

export default chatRouter;