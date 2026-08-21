import express from "express";
import adminAuth from "../middlewares/adminAuth.js";
import { getStats, getUsers } from "../controllers/admin.controller.js";

const adminRouter = express.Router();

// Get high-level system statistics
adminRouter.get("/admin/stats", adminAuth, getStats);

// Get a paginated list of all users for moderation
adminRouter.get("/admin/users", adminAuth, getUsers);

export default adminRouter;