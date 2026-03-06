// ==========================================
// 1. IMPORTS
// ==========================================
import express from "express"; // The framework powering our API
import userAuth from "../middleware/auth.js"; // Your existing security middleware to ensure the user is logged in
import { Post } from "../models/post.js"; // The unified Post schema we just built!

const postRouter = express.Router();

// ==========================================
// 2. CREATE A NEW POST (Any Type)
// ==========================================
postRouter.post("/post/create", userAuth, async (req, res) => {
  try {
    // 1. Extract all possible fields from the frontend request
    // The frontend will only send the fields it needs based on the post 'type'
    const { type, title, content, codeSnippet, codeLanguage, images, tags, projectUrl } = req.body;

    // 2. Basic Validation: A post must have a type and some content
    if (!type || !content) {
      return res.status(400).json({ message: "Type and content are required." });
    }

    // 3. Create the new Post document
    // req.user._id comes automatically from your userAuth middleware
    const newPost = new Post({
      author: req.user._id, 
      type,
      title,
      content,
      codeSnippet,
      codeLanguage,
      images,
      tags,
      projectUrl,
    });

    // 4. Save to MongoDB
    await newPost.save();

    // 5. Send success response
    res.status(201).json({ message: "Post created successfully!", post: newPost });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ==========================================
// 3. GET GLOBAL FEED (With Pagination)
// ==========================================
// ==========================================
// 3. GET GLOBAL FEED (With Pagination & Search)
// ==========================================
postRouter.get("/post/feed", userAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit; 
    
    // Grab the search query from the URL
    const searchQuery = req.query.q || "";
    
    //  Build a dynamic filter object
    let queryFilter = {};

    if (searchQuery.trim()) {
      queryFilter = {
        $or: [
          { title: { $regex: searchQuery, $options: "i" } },   // Search titles (case-insensitive)
          { content: { $regex: searchQuery, $options: "i" } }, // Search body content
          { tags: { $regex: searchQuery, $options: "i" } }     // Search tags array
        ]
      };
    }

    // Pass the queryFilter into the .find() method
    const posts = await Post.find(queryFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "firstName lastName photoUrl headline")
      .populate("comments.user", "firstName lastName photoUrl");

    res.json({ data: posts });
  } catch (error) {
    console.error("Error fetching feed:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ==========================================
// 4. TOGGLE LIKE ON A POST
// ==========================================
postRouter.post("/post/like/:postId", userAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if the user's ID is already in the 'likes' array
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // If they already liked it, REMOVE their ID (Unlike)
      post.likes.pull(userId);
    } else {
      // If they haven't liked it, PUSH their ID (Like)
      post.likes.push(userId);
    }

    await post.save();
    
    // Send back the new total like count and whether the current user likes it
    res.json({ 
      message: isLiked ? "Post unliked" : "Post liked", 
      totalLikes: post.likes.length,
      isLiked: !isLiked 
    });
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ==========================================
// 5. ADD A COMMENT
// ==========================================
postRouter.post("/post/comment/:postId", userAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text.trim()) return res.status(400).json({ message: "Comment cannot be empty" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Push the new comment object into the post's comments array
    post.comments.push({
      user: userId,
      text: text,
    });

    await post.save();

    // We fetch the post again and populate it so the frontend instantly has the user's name/photo for the new comment
    const updatedPost = await Post.findById(postId).populate("comments.user", "firstName lastName photoUrl");

    res.json({ message: "Comment added!", comments: updatedPost.comments });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ==========================================
// 6. Q&A: MARK COMMENT AS ACCEPTED ANSWER
// ==========================================
postRouter.patch("/post/comment/accept/:postId/:commentId", userAuth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // SECURITY: Only the person who created the post can mark an answer as "Accepted"
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the author can accept an answer." });
    }

    // Find the specific comment inside the array
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // Toggle the accepted status
    comment.isAcceptedAnswer = !comment.isAcceptedAnswer;
    
    await post.save();
    res.json({ message: "Answer status updated!", isAccepted: comment.isAcceptedAnswer });
  } catch (error) {
    console.error("Error accepting answer:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// ==========================================
// GET A SINGLE POST BY ID
// ==========================================
postRouter.get("/post/:postId", userAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Find the post and populate both the author AND the users who commented
    const post = await Post.findById(postId)
      .populate("author", "firstName lastName photoUrl headline")
      .populate("comments.user", "firstName lastName photoUrl")
      .populate("comments.replies.user", "firstName lastName photoUrl"); // Also populate the repliers!

    if (!post) return res.status(404).json({ message: "Post not found" });

    res.json({ data: post });
  } catch (error) {
    console.error("Error fetching single post:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// ==========================================
// ADD A REPLY TO A COMMENT
// ==========================================
postRouter.post("/post/comment/reply/:postId/:commentId", userAuth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text.trim()) return res.status(400).json({ message: "Reply cannot be empty" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // Push the new reply
    comment.replies.push({ user: userId, text });
    await post.save();

    // Re-fetch and fully populate so the frontend gets the names and photos of the repliers!
    const updatedPost = await Post.findById(postId)
      .populate("comments.user", "firstName lastName photoUrl")
      .populate("comments.replies.user", "firstName lastName photoUrl");

    // Send back the specific comment that was updated
    const updatedComment = updatedPost.comments.id(commentId);
    res.json({ message: "Reply added!", comment: updatedComment });
  } catch (error) {
    console.error("Error adding reply:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});




export default postRouter;