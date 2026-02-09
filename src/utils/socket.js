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

    /**
     * JOIN PRIVATE ROOM
     */
    socket.on("joinChat", ({ roomId }) => {
      if (!roomId) return;
      socket.join(roomId);
    });

    /**
     * SEND MESSAGE
     */
    socket.on("sendMessage", async (data) => {
      const { chatId, roomId, userId, text, firstName, lastName } = data;
      if (!chatId || !roomId || !text) return;

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
    });

    /**
     * MESSAGE SEEN
     */
    socket.on("messageSeen", async ({ chatId, messageId, roomId }) => {
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
  });
};



export default initializeSocket;