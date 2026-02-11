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
 */
chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  try {
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

      // Populate after creation
      chat = await Chat.findById(chat._id)
        .populate("messages.senderId", "firstName lastName")
        .populate("participants", "firstName lastName");
    }

    // ✅ Mark messages as delivered (REST fallback)
    // This ensures delivery even if Socket.IO fails
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

    // Fetch updated chat
    chat = await Chat.findById(chat._id)
      .populate("messages.senderId", "firstName lastName")
      .populate("participants", "firstName lastName");

    res.json({
      chat,
      roomId: getSecretRoomId(userId, targetUserId),
    });
  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).json({ message: "Failed to fetch chat" });
  }
});

export default chatRouter;