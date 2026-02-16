import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import userAuth from "../middleware/auth.js";

const uploadRouter = express.Router();

// 1. Configure Cloudinary with your hidden credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Configure Multer to keep the file in memory
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Optional: Limit files to 5MB
});

// 3. The Upload Route (Protected by userAuth)
uploadRouter.post("/uploadImage", userAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }

    // 4. Stream the buffer securely to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "devnet_chat" }, // Organizes images into a specific folder in your dashboard
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload failed:", error);
          return res.status(500).json({ message: "Cloudinary upload failed" });
        }
        
        // 5. Return the secure URL back to React
        res.status(200).json({ imageUrl: result.secure_url });
      }
    );

    // Start the upload process
    uploadStream.end(req.file.buffer);

  } catch (error) {
    console.error("Server error during upload:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default uploadRouter;