import { Server } from "socket.io";
import { Chat } from "../models/chat.js";

// ✅ NEW: Global map to track who is currently connected
const userSocketMap = new Map();

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
     * ✅ NEW: REGISTER USER ONLINE STATUS
     */
    socket.on("registerUser", (userId) => {
      userSocketMap.set(userId, socket.id);
      // Tell everyone this user just came online
      io.emit("userOnline", userId); 
      console.log(`User ${userId} is Online`);
    });


    /**
     * ✅ NEW: CHECK IF TARGET USER IS ONLINE
     */
    socket.on("checkOnlineStatus", (targetUserId) => {
      const isOnline = userSocketMap.has(targetUserId);
      socket.emit("onlineStatus", { userId: targetUserId, isOnline });
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
     */
    socket.on("messagesDelivered", async ({ chatId, roomId, userId }) => {
      if (!chatId || !roomId || !userId) return;

      try {
        console.log(`Marking messages as delivered for chatId: ${chatId}, userId: ${userId}`);

        const chat = await Chat.findById(chatId);
        if (!chat) return;

        let updated = false;

        chat.messages.forEach((msg) => {
          if (msg.senderId.toString() !== userId && msg.status === "sent") {
            msg.status = "delivered";
            msg.deliveredAt = new Date();
            updated = true;

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
     * ✅ MARK EXISTING MESSAGES AS SEEN
     * Called when user opens the chat page
     */
    socket.on("markMessagesSeen", async ({ chatId, roomId, userId }) => {
      if (!chatId || !roomId || !userId) return;

      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        let updated = false;

        chat.messages.forEach((msg) => {
          // Upgrade any unread message to "seen"
          if (msg.senderId.toString() !== userId && msg.status !== "seen") {
            msg.status = "seen";
            msg.seenAt = new Date();
            updated = true;

            io.to(roomId).emit("updateMessageStatus", {
              messageId: msg._id.toString(),
              status: "seen",
            });
          }
        });

        if (updated) {
          await chat.save();
          console.log(`Chat ${chatId} saved with 'seen' statuses`);
        }
      } catch (error) {
        console.error("Error marking messages as seen:", error);
      }
    });

    /**
     * MESSAGE SEEN (Individual)
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

      // ✅ NEW: Find the user who disconnected and remove them from the map
      let disconnectedUserId = null;
      for (let [id, sId] of userSocketMap.entries()) {
        if (sId === socket.id) {
          disconnectedUserId = id;
          userSocketMap.delete(id);
          break;
        }
      }
      // Tell everyone this user went offline
      if (disconnectedUserId) {
        io.emit("userOffline", disconnectedUserId);
        console.log(`User ${disconnectedUserId} went Offline`);
      }




    });
  });

  return io;
};

export default initializeSocket;