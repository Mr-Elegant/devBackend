import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import { User } from "../models/user.js";
import ConnectionRequest from "../models/connectionRequest.js";

const adminRouter = express.Router();

// Get high-level system statistics
adminRouter.get("/admin/stats", adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ isPremium: true });
    const totalConnections = await ConnectionRequest.countDocuments({ status: "accepted" });

    res.json({
      data: { totalUsers, premiumUsers, totalConnections }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a paginated list of all users for moderation
adminRouter.get("/admin/users", adminAuth, async (req, res) => {
  try {
    const users = await User.find({})
      .select("firstName lastName emailId role isPremium createdAt")
      .sort({ createdAt: -1 }); // Newest first
      
    res.json({ data: users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default adminRouter;