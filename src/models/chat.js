import mongoose ,{ Schema } from "mongoose";


const messageSchema = new Schema(
    {
        senderId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
            required : true,
        },
        image: {
            type: String,
        }
    }, {timestamps : true }
)


const chatSchema = new Schema({
    participants: [
        {type: Schema.Types.ObjectId, ref: "User", required: true},
    ],
    messages: [messageSchema], 
})

export const Chat = mongoose.model("Chat", chatSchema)