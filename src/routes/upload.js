import express from "express";
import multer from "multer";
import userAuth from "../middlewares/auth.js";
import { uploadFile } from "../controllers/upload.controller.js";

const uploadRouter = express.Router();

// 1. Configure Multer to keep the file in memory
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// 2. The Upload Route
uploadRouter.post("/uploadFile", userAuth, upload.single("file"), uploadFile);

export default uploadRouter;