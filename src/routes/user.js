import ConnectionRequestModel from "../models/connectionRequest.js";
import express from "express";
import userAuth from "../middleware/auth.js";
import ConnectionRequest from "../models/connectionRequest.js";
import { User } from "../models/user.js";
const userRouter = express.Router();
const USER_SAFE_DATA = "firstName lastName photoUrl age gender about skills";

// get all pending connection request for the loggedIn user
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", USER_SAFE_DATA);
    // populate("fromUserId", "firstName lastName")
    // populate("fromUserId", ["firstName","lastName"])

    res.json({
      message: "Data Fetched Successfully",
      data: connectionRequests,
    });
  } catch (error) {
    req.status(400).send("Error : " + error.message);
  }
});

// retrieves all accepted connection requests for the logged-in user, returning the list of connected users.
userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    // Get the currently logged-in user from the request object (set by userAuth)
    const loggedInUser = req.user;

    // Find all accepted connection requests where the logged-in user is either the sender or receiver
    const connectionRequests = await ConnectionRequest.find({
      $or: [
        // Case 1: The user received the request and it was accepted
        { toUserId: loggedInUser._id, status: "accepted" },
        // Case 2: The user sent the request and it was accepted
        { fromUserId: loggedInUser._id, status: "accepted" },
      ],
    })
      // Populate sender user info (safe fields only)
      .populate("fromUserId", USER_SAFE_DATA)
      // Populate receiver user info (safe fields only)
      .populate("toUserId", USER_SAFE_DATA);

    // console.log(connectionRequests);

    // Transform the connectionRequests into a list of "other users" (the ones connected to logged-in user)
    const data = connectionRequests.map((row) => {
      // If the logged-in user is the sender, return the receiver's user data
      if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
        return row.toUserId;
      }
      // Otherwise, return the sender's user data
      return row.fromUserId;
    });

    res.json({ data });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

userRouter.get("/feed", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    limit = limit > 50 ? 50 : limit;
    const skip = (page - 1) * limit;

    const connectionRequests = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
    }).select("fromUserId toUserId");

    const hideUsersFromFeed = new Set();
    connectionRequests.forEach((req) => {
      hideUsersFromFeed.add(req.fromUserId.toString());
      hideUsersFromFeed.add(req.toUserId.toString());
    });

    const users = await User.find({
      $and: [
        { _id: { $nin: Array.from(hideUsersFromFeed) } },
        { _id: { $ne: loggedInUser._id } },
      ],
    })
      .select(USER_SAFE_DATA)
      .skip(skip)
      .limit(limit);

    res.json({ data: users });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ==========================================
// SEARCH USERS (EXCLUDING ALREADY INTERACTED)
// ==========================================
userRouter.get("/user/search", userAuth, async (req, res) => {
  try {
    // Grab the search text from the URL (e.g., /user/search?q=preet)
    const searchQuery = req.query.q || "";
    const loggedInUserId = req.user._id;

    // If the search is empty, return an empty array to save server load
    if (!searchQuery.trim()) {
      return res.json({ data: [] });
    }

    // 1. Find EVERY connection request involving the logged-in user 
    // (This includes pending, accepted, and rejected requests, sent OR received)
    const existingInteractions = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUserId },
        { toUserId: loggedInUserId }
      ]
    }).select("fromUserId toUserId");

    // 2. Extract those IDs into a single "Hidden List" array
    const hideUsersFromSearch = new Set();
    existingInteractions.forEach((interaction) => {
      hideUsersFromSearch.add(interaction.fromUserId.toString());
      hideUsersFromSearch.add(interaction.toUserId.toString());
    });
    // Convert the Set back to an array for Mongoose
    const hiddenUsersArray = Array.from(hideUsersFromSearch);




    // 3. Perform the search, but EXCLUDE everyone in the Hidden List
    const users = await User.find({
      $and: [
        { _id: { $ne: loggedInUserId } }, // Always hide yourself
        { _id: { $nin: hiddenUsersArray } }, // 🔥 THE FIX: Hide anyone you've already interacted with
        {
          $or: [
            { firstName: { $regex: searchQuery, $options: "i" } },
            { lastName: { $regex: searchQuery, $options: "i" } },
            { headline: { $regex: searchQuery, $options: "i" } }
          ],
        },
      ],
    })
    .select("firstName lastName photoUrl headline")
    .limit(20);

    res.json({ data: users });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default userRouter;
