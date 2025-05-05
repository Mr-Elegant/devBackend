import mongoose , { Schema } from "mongoose";

const connectionRequestSchema = new Schema({

    fromUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    toUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: {
            values: ["ignored", "interested", "accepted", "rejected"], 
            message: `{VALUE} is incorrect status type`
        },
    },
},
    {   timestamps: true}
)

// Add a compound index to prevent duplicate requests between same users
// It helps optimize queries and optionally enforce uniqueness between two users. Though this line alone doesn't prevent duplicates, it prepares for efficient querying and can support uniqueness if modified.
connectionRequestSchema.index({ fromUserId: 1, toUserId: 1});

// Pre-save middleware to prevent users from sending requests to themselves
connectionRequestSchema.pre("save", function (next){
    const connectionRequest = this;
    // check if the fromUserId is same as the toUserId
    if(connectionRequest.fromUserId.equals(connectionRequest.toUserId)){
        throw new Error("You can't send connection request to yourself");
    }
    next();
})



const ConnectionRequestModel = mongoose.model("ConnectionRequest", connectionRequestSchema);

export default ConnectionRequestModel