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
            required : true,
        },
        image: {
            type: String,
        },
        /**
   * MESSAGE STATUS
   * sent      -> saved in DB
   * delivered -> received by other user
   * seen      -> read by other user
   */
        status: {
            type: String,
            enum: ["sent", "delivered", "seen"],
            default: "sent"
        },
        deliveredAt: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: ["sent", "delivered", "seen"],
            default: "sent"
        },
         // When delivered to recipient
        deliveredAt: {
            type: Date,
            default: null,
        },
        // When seen by recipient
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