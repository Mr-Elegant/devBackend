import jwt from "jsonwebtoken";
import { User } from "../models/user.js";

const adminAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (!token) return res.status(401).send("Please Login!");

    const decodedObj = await jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedObj._id);

    if (!user) throw new Error("User not found");
    
    // ✨ THE CRITICAL CHECK
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access Denied: Admins Only" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(403).send("ERROR: " + error.message);
  }
};

export default adminAuth;