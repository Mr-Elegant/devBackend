import { User } from "../models/user.js";
import ConnectionRequest from "../models/connectionRequest.js";

export const getStats = async (req, res) => {
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
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("firstName lastName emailId role isPremium createdAt")
      .sort({ createdAt: -1 }); // Newest first
      
    res.json({ data: users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
