import { Server } from "socket.io";
import { Chat } from "../models/chat.js";
import crypto from "crypto";

// Global map to track who is currently connected
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
     * REGISTER USER ONLINE STATUS & CATCH UP DELIVERIES
     */
    socket.on("registerUser", async (userId) => {
      userSocketMap.set(userId, socket.id);
      io.emit("userOnline", userId);
      console.log(`User ${userId} is Online`);

      // OFFLINE DELIVERY CATCH-UP ROUTINE
      try {
        // Find chats where this user has pending 'sent' messages from OTHERS
        const chats = await Chat.find({
          participants: userId,
          messages: { $elemMatch: { senderId: { $ne: userId }, status: "sent" } },
        });

        for (const chat of chats) {
          const otherUserId = chat.participants.find(
            (p) => p.toString() !== userId.toString()
          );
          if (!otherUserId) continue;

          // Recreate the secret room ID
          const roomId = crypto
            .createHash("sha256")
            .update([userId.toString(), otherUserId.toString()].sort().join("$"))
            .digest("hex");

          // Emit updates back to the sender for every missed message
          chat.messages.forEach((msg) => {
            if (
              msg.senderId.toString() !== userId.toString() &&
              msg.status === "sent"
            ) {
              const payload = {
                messageId: msg._id.toString(),
                status: "delivered",
              };

              // Update the sender's active chat window
              io.to(roomId).emit("updateMessageStatus", payload);

              // Update the sender's global app status (if they are on the Feed)
              const senderSocketId = userSocketMap.get(msg.senderId.toString());
              if (senderSocketId) {
                io.to(senderSocketId).emit("updateMessageStatus", payload);
              }
            }
          });
        }

        // Atomically update the database to mark them all as delivered
        if (chats.length > 0) {
          await Chat.updateMany(
            { participants: userId },
            {
              $set: {
                "messages.$[msg].status": "delivered",
                "messages.$[msg].deliveredAt": new Date(),
              },
            },
            {
              arrayFilters: [
                { "msg.senderId": { $ne: userId }, "msg.status": "sent" },
              ],
            }
          );
          console.log(`Caught up offline deliveries for user ${userId}`);
        }
      } catch (error) {
        console.error("Error catching up offline messages:", error);
      }
    });

    /**
     * CHECK IF TARGET USER IS ONLINE
     */
    socket.on("checkOnlineStatus", (targetUserId) => {
      const isOnline = userSocketMap.has(targetUserId);
      socket.emit("onlineStatus", { userId: targetUserId, isOnline });
    });

    /**
     * SEND MESSAGE (Supports Text & Images)
     */
    socket.on("sendMessage", async (data) => {
      // 1. MUST extract imageUrl here
      const { chatId, roomId, userId, text, imageUrl, fileUrl, fileName, firstName, lastName } = data;
      
      // Allow sending either text OR an image
      if (!chatId || !roomId || (!text && !imageUrl && !fileUrl)) return;

      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        chat.messages.push({
          senderId: userId,
          text: text || "",
          image: imageUrl || "",  // 2. MUST save imageUrl to the DB
          fileUrl: fileUrl || "",
          fileName: fileName || "",
          status: "sent",
        });

        await chat.save();
        const msg = chat.messages.at(-1);

        const payload = {
          _id: msg._id,
          senderId: userId,
          firstName,
          lastName,
          text: msg.text,
          image: msg.image,    // 3. MUST send the image back to the frontend
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          createdAt: msg.createdAt,
          status: msg.status,
          chatId,
          roomId,
        };

        // Chain the targets together to deduplicate automatically
        let emitTargets = io.to(roomId);

        const targetUserId = chat.participants.find(
          (p) => p.toString() !== userId.toString()
        );

        if (targetUserId) {
          const receiverGlobalSocketId = userSocketMap.get(
            targetUserId.toString()
          );
          if (receiverGlobalSocketId) {
            emitTargets = emitTargets.to(receiverGlobalSocketId);
          }
        }

        // Emit exactly ONCE to the combined targets
        emitTargets.emit("messageReceived", payload);

        console.log(`Message sent to room ${roomId}`);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    });

    /**
     * MARK SINGLE MESSAGE AS DELIVERED (Atomic & Global)
     */
    socket.on("markMessageDelivered", async ({ chatId, messageId, roomId }) => {
      if (!chatId || !messageId || !roomId) return;

      try {
        const result = await Chat.updateOne(
          {
            _id: chatId,
            messages: { $elemMatch: { _id: messageId, status: "sent" } },
          },
          {
            $set: {
              "messages.$.status": "delivered",
              "messages.$.deliveredAt": new Date(),
            },
          }
        );

        if (result.modifiedCount) {
          io.to(roomId).emit("updateMessageStatus", {
            messageId: messageId,
            status: "delivered",
          });
          console.log(`Message ${messageId} marked as delivered (Real-time)`);
        }
      } catch (error) {
        console.error("Error marking message delivered:", error);
      }
    });

    /**
     * MARK BULK MESSAGES AS DELIVERED
     */
    socket.on("messagesDelivered", async ({ chatId, roomId, userId }) => {
      if (!chatId || !roomId || !userId) return;

      try {
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
          }
        });

        if (updated) {
          await chat.save();
        }
      } catch (error) {
        console.error("Error marking messages as delivered:", error);
      }
    });

    /**
     * MARK BULK MESSAGES AS SEEN (Opening Chat Page)
     */
    socket.on("markMessagesSeen", async ({ chatId, roomId, userId }) => {
      if (!chatId || !roomId || !userId) return;

      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        let updated = false;

        chat.messages.forEach((msg) => {
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
        }
      } catch (error) {
        console.error("Error marking messages as seen:", error);
      }
    });

    /**
     * MARK SINGLE MESSAGE AS SEEN (Atomic while chatting)
     */
    socket.on("messageSeen", async ({ chatId, messageId, roomId }) => {
      if (!chatId || !messageId || !roomId) return;

      try {
        const result = await Chat.updateOne(
          {
            _id: chatId,
            messages: {
              $elemMatch: { _id: messageId, status: { $ne: "seen" } },
            },
          },
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
          console.log(`Message ${messageId} marked as seen`);
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

    socket.on("sendConnectionRequest", ({ senderId, receiverId, firstName, lastName, profilePic }) => {
        // Look up if the receiver is currently online
      const receiverSocketId = userSocketMap.get(receiverId.toString());
      
      if (receiverSocketId) {
        // If they are online, instantly send them the notification!
        io.to(receiverSocketId).emit("connectionRequestReceived", {
          senderId,
          firstName,
          lastName,
          text: "Sent you a connection request!"
        });
      }
    })


    /**
     * DISCONNECT
     */
    socket.on("disconnect", () => {
      console.log(`Socket ${socket.id} disconnected`);

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