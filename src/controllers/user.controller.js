import ConnectionRequest from "../models/connectionRequest.js";
import { User } from "../models/user.js";

const USER_SAFE_DATA = "firstName lastName photoUrl age gender about skills isPremium membershipType";

export const getReceivedRequests = async (req, res) => {
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
    res.status(400).send("Error : " + error.message);
  }
};

export const getAcceptedConnections = async (req, res) => {
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
};

export const getFeed = async (req, res) => {
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
};

export const searchUsers = async (req, res) => {
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
    });

    const interactionMap = new Map();
    const hideUsersFromSearch = new Set();

    existingInteractions.forEach((interaction) => {
      const otherUserId = interaction.fromUserId.equals(loggedInUserId)
        ? interaction.toUserId.toString()
        : interaction.fromUserId.toString();
      
      interactionMap.set(otherUserId, interaction.status);

      if (interaction.status === "ignored" || interaction.status === "rejected") {
        hideUsersFromSearch.add(otherUserId);
      }
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
    }).select(USER_SAFE_DATA);

    const usersWithStatus = users.map(user => {
      const userObj = user.toObject(); 
      userObj.connectionStatus = interactionMap.get(user._id.toString()) || "none";
      return userObj;
    });

    res.json({ data: usersWithStatus });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const loggedInUserId = req.user._id;

    const user = await User.findById(targetUserId)
      .select("firstName lastName photoUrl age gender about skills isPremium membershipType projects githubUsername");

    if (!user) {
      return res.status(404).json({ message: "Developer not found" });
    }

    const existingConnection = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: loggedInUserId, toUserId: targetUserId },
        { fromUserId: targetUserId, toUserId: loggedInUserId }
      ]
    });

    const userObj = user.toObject();
    
    if (loggedInUserId.toString() === targetUserId.toString()) {
      userObj.connectionStatus = "self";
    } else if (existingConnection) {
      userObj.connectionStatus = existingConnection.status;
    } else {
      userObj.connectionStatus = "none";
    }

    res.json({ data: userObj });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
