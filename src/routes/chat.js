import express from "express";
import userAuth from "../middleware/auth.js";
import { Chat } from "../models/chat.js";
import crypto from "crypto";

const chatRouter = express.Router();

/**
 * 🔐 Deterministic private room ID
 * SAME for (A,B) and (B,A)
 */
export const getSecretRoomId = (userId, targetUserId) =>
  crypto
    .createHash("sha256")
    .update([userId.toString(), targetUserId.toString()].sort().join("$"))
    .digest("hex");

/**
 * GET OR CREATE CHAT
 * Identity = participants (THIS PART IS CORRECT)
 */
chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  const { targetUserId } = req.params;
  const userId = req.user._id;

  let chat = await Chat.findOne({
    participants: { $all: [userId, targetUserId] },
  })
    .populate("messages.senderId", "firstName lastName")
    .populate("participants", "firstName lastName");

  if (!chat) {
    chat = await Chat.create({
      participants: [userId, targetUserId],
      messages: [],
    });
  }

  /**
   * OFFLINE DELIVERY FIX (CRITICAL)
   * Mark messages as delivered when receiver opens chat
   */
  await Chat.updateOne(
    { _id: chat._id },
    {
      $set: {
        "messages.$[msg].status": "delivered",
        "messages.$[msg].deliveredAt": new Date(),
      },
    },
    {
      arrayFilters: [
        {
          "msg.senderId": { $ne: userId },
          "msg.status": "sent",
        },
      ],
    }
  );

  chat = await Chat.findById(chat._id).populate(
    "messages.senderId",
    "firstName lastName"
  );

  res.json({
    chat,
    roomId: getSecretRoomId(userId, targetUserId), // 🔑 frontend uses THIS
  });
});

export default chatRouter;
