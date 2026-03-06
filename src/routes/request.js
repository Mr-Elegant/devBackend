import express from "express";
const requestRouter = express.Router();

import userAuth from "../middleware/auth.js";
import ConnectionRequest from "../models/connectionRequest.js";
import { User } from "../models/user.js";
import { run } from "../utils/sendEmail.js";

// ==========================================
// 1. SEND CONNECTION REQUEST (Untouched)
// ==========================================
requestRouter.post("/request/send/:status/:toUserId", userAuth, async (req, res) => {
  try {
    const fromUserId = req.user._id;
    const toUserId = req.params.toUserId;
    const status = req.params.status;

    const allowedStatus = ["ignored", "interested"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status type: " + status });
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingConnectionRequest = await ConnectionRequest.findOne({
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    });
    if (existingConnectionRequest) {
      return res.status(400).send({ message: "Connection Request Already Exists!!" });
    }

    const connectionRequest = new ConnectionRequest({
      fromUserId,
      toUserId,
      status,
    });

    const data = await connectionRequest.save();

    const emailRes = await run(
      "A new friend request from " + req.user.firstName,
      req.user.firstName + " is " + status + " in " + toUser.firstName
    );
    console.log(emailRes);

    res.json({
      message: req.user.firstName + " is " + status + " in " + toUser.firstName,
      data,
    });
  } catch (error) {
    res.status(400).send("Error: " + error.message);
  }
});

// ==========================================
// 2. REVIEW CONNECTION REQUEST (Updated!)
// ==========================================
requestRouter.post("/request/review/:status/:requestId", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { status, requestId } = req.params;

    const allowedStatus = ["accepted", "rejected"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Status not allowed!" });
    }

    // ✨ THE FIX: We now allow reviewing requests that are EITHER "interested" OR "rejected"!
    const connectionRequest = await ConnectionRequest.findOne({
      _id: requestId,
      toUserId: loggedInUser._id,
      status: { $in: ["interested", "rejected"] }, 
    });
    
    if (!connectionRequest) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    connectionRequest.status = status;
    const data = await connectionRequest.save();

    res.json({ message: "Connection request " + status, data });
  } catch (error) {
    res.status(400).send("Error: " + error.message);
  }
});

// ==========================================
// 3. GET REJECTED REQUESTS (New!)
// ==========================================
requestRouter.get("/user/requests/rejected", userAuth, async (req, res) => {
  try {
    const rejectedRequests = await ConnectionRequest.find({
      toUserId: req.user._id,
      status: "rejected",
    }).populate("fromUserId", "firstName lastName photoUrl age gender about");

    res.json({ data: rejectedRequests });
  } catch (error) {
    console.error("Error fetching rejected requests:", error);
    res.status(500).send("Internal Server Error");
  }
});

export default requestRouter;