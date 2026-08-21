import { v2 as cloudinary } from "cloudinary";

export const uploadFile = async (req, res) => {
  // Configure Cloudinary INSIDE the route handler
  // This guarantees process.env is fully loaded before Cloudinary looks for it
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "devnet_chat" , resource_type: "auto" },  
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload failed:", error);
          return res.status(500).json({ message: "Cloudinary upload failed" });
        }
        
        res.status(200).json({ 
            fileUrl: result.secure_url, 
            fileName: req.file.originalname, 
            resourceType: result.resource_type
        });  
      }
    );

    uploadStream.end(req.file.buffer);

  } catch (error) {
    console.error("Server error during upload:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
