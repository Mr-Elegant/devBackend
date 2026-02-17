import mongoose ,{ Schema } from "mongoose";


const messageSchema = new Schema(
    {
        // Who sent the message
        senderId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
          // Message content
        text: {
            type: String,
            default: "", // Allow empty text if they just send an image
        },
        image: {
            type: String,
            default: "",
        },
        fileUrl: {
            type: String,
            default: "",
        },
        fileName: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["sent", "delivered", "seen"],
            default: "sent"
        },
        deliveredAt: {
            type: Date,
            default: null,
        },
        seenAt: {
            type: Date,
            default: null,
        },  
    }, {timestamps : true }
)


const chatSchema = new Schema({
    participants: [
        {type: Schema.Types.ObjectId, ref: "User"},
    ],
    messages: [messageSchema], 
    
}, {timeStamps: true})

export const Chat = mongoose.model("Chat", chatSchema) 