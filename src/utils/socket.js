import { Server } from "socket.io";
import { Chat } from "../models/chat.js";
import crypto from "crypto";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

// Global map to track who is currently connected
const userSocketMap = new Map();

// In-memory room store for real-time whiteboard collaboration
const whiteboardRooms = new Map(); // roomId -> Map(recordId -> record)

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        callback(null, true);
      },
      credentials: true,
    },
  });

  // ==========================================
  // REDIS ADAPTER SETUP (For Production Scaling)
  // ==========================================
  // const pubClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
  // const subClient = pubClient.duplicate();

  // Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  //   io.adapter(createAdapter(pubClient, subClient));
  //   console.log("Redis Adapter connected to Socket.IO successfully!");
  // }).catch((err) => {
  //   console.error("Redis connection failed. Falling back to in-memory adapter:", err.message);
  // });

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
      if (!userId) return;
      const uidStr = userId.toString();
      userSocketMap.set(uidStr, socket.id);
      io.emit("userOnline", uidStr);
      console.log(`User ${uidStr} is Online`);

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
      if (!targetUserId) return;
      const tidStr = targetUserId.toString();
      const isOnline = userSocketMap.has(tidStr);
      socket.emit("onlineStatus", { userId: tidStr, isOnline });
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

// ==========================================
    // DELETE MESSAGE LOGIC
    // ==========================================
    socket.on("deleteMessage", async ({ chatId, messageId, roomId, userId }) => {
      // 1. Basic validation to ensure we have all required data
      if (!chatId || !messageId || !roomId || !userId) return;

      try {
        // 2. Secure Database Deletion
        // We use MongoDB's $pull operator to remove the specific message from the array.
        // SECURITY CHECK: We explicitly include "senderId: userId" in the query.
        // This guarantees a user can ONLY delete their own messages, preventing hacks!
        const result = await Chat.updateOne(
          { _id: chatId },
          { 
            $pull: { 
              messages: { _id: messageId, senderId: userId } 
            } 
          }
        );

        // 3. If the database successfully removed it (modifiedCount > 0)
        if (result.modifiedCount) {
          // Tell everyone in this specific chat room (including the sender) 
          // to instantly remove this message from their UI.
          io.to(roomId).emit("messageDeleted", { messageId });
          console.log(`Message ${messageId} securely deleted by user ${userId}`);
        }
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    });


    // ==========================================
    // COMMUNITY POST REAL-TIME SYNC
    // ==========================================

    // 1. User opens a post
    socket.on("joinPost", ({ postId }) => {
      socket.join(`post_${postId}`);
      console.log(`User joined post room: post_${postId}`);
    });

    // 2. User leaves the post (goes back to feed)
    socket.on("leavePost", ({ postId }) => {
      socket.leave(`post_${postId}`);
      console.log(`User left post room: post_${postId}`);
    });
    // 3. User submits a new comment
    socket.on("newComment", ({ postId, comment }) => {
      // Broadcast the new comment to everyone ELSE in this specific post room
      socket.to(`post_${postId}`).emit("commentReceived", comment);
    });

    // User submits a new reply to a comment
    socket.on("newReply", ({ postId, commentId, reply }) => {
      // Broadcast the reply to everyone else looking at this post
      socket.to(`post_${postId}`).emit("replyReceived", { commentId, reply });
    });

    // 4. Post Author marks an answer as accepted
    socket.on("acceptAnswer", ({ postId, commentId, isAccepted }) => {
      // Broadcast the green checkmark update to everyone viewing the post
      socket.to(`post_${postId}`).emit("answerAcceptedUpdate", { commentId, isAccepted });
    });

    // ==========================================
    // WHITEBOARD REAL-TIME SYNC
    // ==========================================
    socket.on("joinWhiteboard", ({ roomId }) => {
      if (!roomId) return;
      socket.join(`whiteboard_${roomId}`);
      console.log(`Socket ${socket.id} joined whiteboard: ${roomId}`);

      // 1. Send existing whiteboard snapshot to newly joined peer
      if (whiteboardRooms.has(roomId)) {
        const roomMap = whiteboardRooms.get(roomId);
        const snapshot = Array.from(roomMap.values());
        if (snapshot.length > 0) {
          socket.emit("whiteboardSnapshot", { snapshot });
        }
      }

      // 2. Notify other peers in this room that a new collaborator joined
      socket.to(`whiteboard_${roomId}`).emit("whiteboardPeerJoined", { peerSocketId: socket.id });
    });

    socket.on("leaveWhiteboard", ({ roomId }) => {
      if (!roomId) return;
      socket.leave(`whiteboard_${roomId}`);
      socket.to(`whiteboard_${roomId}`).emit("whiteboardPeerLeft", { peerSocketId: socket.id });
      console.log(`Socket ${socket.id} left whiteboard: ${roomId}`);
    });

    // 1. Live Element Draw (Real-time creation)
    socket.on("whiteboardDraw", ({ roomId, element }) => {
      if (!roomId || !element || !element.id) return;
      if (!whiteboardRooms.has(roomId)) {
        whiteboardRooms.set(roomId, new Map());
      }
      whiteboardRooms.get(roomId).set(element.id, element);
      socket.to(`whiteboard_${roomId}`).emit("whiteboardDraw", element);
    });

    // 2. Element Update (Move, resize, text change)
    socket.on("whiteboardUpdateElement", ({ roomId, element }) => {
      if (!roomId || !element || !element.id) return;
      if (!whiteboardRooms.has(roomId)) {
        whiteboardRooms.set(roomId, new Map());
      }
      whiteboardRooms.get(roomId).set(element.id, element);
      socket.to(`whiteboard_${roomId}`).emit("whiteboardUpdateElement", element);
    });

    // 3. Delete Elements
    socket.on("whiteboardDeleteElements", ({ roomId, elementIds }) => {
      if (!roomId || !Array.isArray(elementIds)) return;
      const roomMap = whiteboardRooms.get(roomId);
      if (roomMap) {
        for (const id of elementIds) {
          roomMap.delete(id);
        }
      }
      socket.to(`whiteboard_${roomId}`).emit("whiteboardDeleteElements", elementIds);
    });

    // 4. Clear Canvas
    socket.on("whiteboardClear", ({ roomId }) => {
      if (!roomId) return;
      const roomMap = whiteboardRooms.get(roomId);
      if (roomMap) {
        roomMap.clear();
      }
      socket.to(`whiteboard_${roomId}`).emit("whiteboardClear");
    });

    // 5. Multiplayer Cursor Streaming
    socket.on("whiteboardCursor", ({ roomId, cursor }) => {
      if (!roomId || !cursor) return;
      socket.to(`whiteboard_${roomId}`).emit("whiteboardCursorUpdate", {
        peerId: socket.id,
        cursor,
      });
    });

    // 6. Legacy/Diff Updates (Backward compatibility)
    socket.on("whiteboardUpdate", ({ roomId, update }) => {
      if (!roomId || !update) return;

      if (!whiteboardRooms.has(roomId)) {
        whiteboardRooms.set(roomId, new Map());
      }
      const roomMap = whiteboardRooms.get(roomId);

      if (update.added) {
        for (const record of Object.values(update.added)) {
          if (record && record.id) roomMap.set(record.id, record);
        }
      }
      if (update.updated) {
        for (const [_from, to] of Object.values(update.updated)) {
          if (to && to.id) roomMap.set(to.id, to);
        }
      }
      if (update.removed) {
        for (const id of Object.keys(update.removed)) {
          roomMap.delete(id);
        }
      }

      socket.to(`whiteboard_${roomId}`).emit("whiteboardUpdateReceived", update);
    });

    socket.on("whiteboardSendSync", ({ roomId, snapshot }) => {
      if (!roomId || !Array.isArray(snapshot)) return;
      if (!whiteboardRooms.has(roomId)) {
        whiteboardRooms.set(roomId, new Map());
      }
      const roomMap = whiteboardRooms.get(roomId);
      for (const record of snapshot) {
        if (record && record.id) {
          roomMap.set(record.id, record);
        }
      }
      socket.to(`whiteboard_${roomId}`).emit("whiteboardSnapshot", { snapshot });
    });

    // ✨ Whiteboard Invitation Logic
    socket.on("whiteboard-invite", ({ targetUserId, roomId, senderInfo }) => {
      if (!targetUserId) return;
      const tidStr = targetUserId.toString();
      const receiverSocketId = userSocketMap.get(tidStr);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("whiteboard-invite-received", {
          roomId,
          senderInfo,
        });
      }
    });

    socket.on("whiteboard-invite-rejected", ({ senderId, rejecterInfo }) => {
      if (!senderId) return;
      const sidStr = senderId.toString();
      const senderSocketId = userSocketMap.get(sidStr);
      if (senderSocketId) {
        io.to(senderSocketId).emit("whiteboard-invite-was-rejected", { rejecterInfo });
      }
    });







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