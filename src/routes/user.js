import ConnectionRequestModel from "../models/connectionRequest.js";
import express from "express";
import userAuth from "../middleware/auth.js";
import ConnectionRequest from "../models/connectionRequest.js";
import { User } from "../models/user.js";
const userRouter = express.Router();

// ✨ ADDED isPremium to the safe data string
const USER_SAFE_DATA = "firstName lastName photoUrl age gender about skills isPremium membershipType";

// get all pending connection request for the loggedIn user
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", USER_SAFE_DATA);

    res.json({
      message: "Data Fetched Successfully",
      data: connectionRequests,
    });
  } catch (error) {
    req.status(400).send("Error : " + error.message);
  }
});

// retrieves all accepted connection requests for the logged-in user
userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      $or: [
        { toUserId: loggedInUser._id, status: "accepted" },
        { fromUserId: loggedInUser._id, status: "accepted" },
      ],
    })
      .populate("fromUserId", USER_SAFE_DATA)
      .populate("toUserId", USER_SAFE_DATA);

    const data = connectionRequests.map((row) => {
      if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
        return row.toUserId;
      }
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

// SEARCH USERS (EXCLUDING ALREADY INTERACTED)
userRouter.get("/user/search", userAuth, async (req, res) => {
  try {
    const searchQuery = req.query.q || "";
    const loggedInUserId = req.user._id;

    if (!searchQuery.trim()) {
      return res.json({ data: [] });
    }

    const existingInteractions = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUserId },
        { toUserId: loggedInUserId }
      ]
    }).select("fromUserId toUserId");

    const hideUsersFromSearch = new Set();
    existingInteractions.forEach((interaction) => {
      hideUsersFromSearch.add(interaction.fromUserId.toString());
      hideUsersFromSearch.add(interaction.toUserId.toString());
    });
    const hiddenUsersArray = Array.from(hideUsersFromSearch);

    const users = await User.find({
      $and: [
        { _id: { $ne: loggedInUserId } }, 
        { _id: { $nin: hiddenUsersArray } }, 
        {
          $or: [
            { firstName: { $regex: searchQuery, $options: "i" } },
            { lastName: { $regex: searchQuery, $options: "i" } },
            { headline: { $regex: searchQuery, $options: "i" } }
          ],
        },
      ],
    })
    // ✨ ADDED isPremium HERE
    .select("firstName lastName photoUrl headline isPremium membershipType")
    .limit(20);

    res.json({ data: users });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default userRouter;