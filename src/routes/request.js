import express from "express";
const requestRouter = express.Router();

import userAuth from "../middleware/auth.js";
import ConnectionRequest from "../models/connectionRequest.js";
import {User} from "../models/user.js";
 

// Route: Send a connection request with a status ("ignored" or "interested")
requestRouter.post("/request/send/:status/:toUserId" , userAuth, async(req,res)=> {
    try {
        // Extract user IDs and status from the request
        const fromUserId = req.user._id;
        const toUserId = req.params.toUserId;   
        const status = req.params.status;

        // Validate status value
        const allowedStatus = ["ignored", "interested"];
        if(!allowedStatus.includes(status)) {
            return res.status(400).json({message: "Invalid status type: " + status});
        }

        const toUser = await User.findById(toUserId);
        if(!toUser){
            return res.status(404).json({
                message: "User not found"
            })
        }
        
        // Check for existing connection request in either direction
        const existingConnectionRequest = await ConnectionRequest.findOne({
            $or: [
                {fromUserId, toUserId}, {fromUserId: toUserId, toUserId: fromUserId}
            ],
        })
        if( existingConnectionRequest){
           return res.status(400).send({message: "Connection Request Already Exists!!" });
        }
        
        // Create and save new connection request
        const connectionRequest = new ConnectionRequest({
            fromUserId,
            toUserId,
            status,
        })

        const data = await connectionRequest.save();

        res.json({
            message: req.user.firstName + " is " + status + " in " + toUser.firstName,
            data,
        })

    } catch (error) {
        res.status(400).send("Error: " + error.message)
    }
})



export default requestRouter