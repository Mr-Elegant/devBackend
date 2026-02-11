import { Server } from "socket.io";
import { Chat } from "../models/chat.js";

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    /**
     * JOIN PRIVATE ROOM
     */
    socket.on("joinChat", ({ roomId }) => {
      if (!roomId) return;
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    /**
     * SEND MESSAGE
     */
    socket.on("sendMessage", async (data) => {
      const { chatId, roomId, userId, text, firstName, lastName } = data;
      if (!chatId || !roomId || !text) return;

      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        chat.messages.push({
          senderId: userId,
          text,
          status: "sent",
        });

        await chat.save();
        const msg = chat.messages.at(-1);

        io.to(roomId).emit("messageReceived", {
          _id: msg._id,
          senderId: userId,
          firstName,
          lastName,
          text: msg.text,
          createdAt: msg.createdAt,
          status: msg.status,
        });

        console.log(`Message sent to room ${roomId}`);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    });

    /**
     * ✅ MARK MESSAGES AS DELIVERED
     * Called when user opens chat
     */
    socket.on("messagesDelivered", async ({ chatId, roomId, userId }) => {
      if (!chatId || !roomId || !userId) return;

      try {
        console.log(`Marking messages as delivered for chatId: ${chatId}, userId: ${userId}`);

        const chat = await Chat.findById(chatId);
        if (!chat) return;

        let updated = false;

        // Find and update all messages that need to be marked as delivered
        chat.messages.forEach((msg) => {
          // Only update messages that:
          // 1. Were NOT sent by the current user (userId)
          // 2. Are still in "sent" status
          if (msg.senderId.toString() !== userId && msg.status === "sent") {
            msg.status = "delivered";
            msg.deliveredAt = new Date();
            updated = true;

            // Emit update for each message
            io.to(roomId).emit("updateMessageStatus", {
              messageId: msg._id.toString(),
              status: "delivered",
            });

            console.log(`Message ${msg._id} marked as delivered`);
          }
        });

        if (updated) {
          await chat.save();
          console.log(`Chat ${chatId} saved with delivered status`);
        }
      } catch (error) {
        console.error("Error marking messages as delivered:", error);
      }
    });

    /**
     * MESSAGE SEEN
     */
    socket.on("messageSeen", async ({ chatId, messageId, roomId }) => {
      if (!chatId || !messageId || !roomId) return;

      try {
        console.log(`Marking message ${messageId} as seen`);

        const result = await Chat.updateOne(
          { _id: chatId, "messages._id": messageId },
          {
            $set: {
              "messages.$.status": "seen",
              "messages.$.seenAt": new Date(),
            },
          }
        );

        if (result.modifiedCount) {
          io.to(roomId).emit("updateMessageStatus", {
            messageId,
            status: "seen",
          });

          console.log(`Message ${messageId} marked as seen, emitted to room ${roomId}`);
        }
      } catch (error) {
        console.error("Error marking message as seen:", error);
      }
    });

    /**
     * TYPING INDICATOR
     */
    socket.on("typing", ({ roomId, firstName }) => {
      socket.to(roomId).emit("userTyping", { firstName });
    });

    socket.on("stopTyping", ({ roomId }) => {
      socket.to(roomId).emit("userStopTyping");
    });

    /**
     * DISCONNECT
     */
    socket.on("disconnect", () => {
      console.log(`Socket ${socket.id} disconnected`);
    });
  });

  return io;
};

export default initializeSocket;