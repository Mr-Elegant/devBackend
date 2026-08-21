import { Post } from "../models/post.js";

export const createPost = async (req, res) => {
  try {
    const { type, title, content, codeSnippet, codeLanguage, images, tags, projectUrl } = req.body;

    if (!type || !content) {
      return res.status(400).json({ message: "Type and content are required." });
    }

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

    await newPost.save();

    res.status(201).json({ message: "Post created successfully!", post: newPost });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getGlobalFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit; 
    
    const searchQuery = req.query.q || "";
    
    let queryFilter = {};

    if (searchQuery.trim()) {
      queryFilter = {
        $or: [
          { title: { $regex: searchQuery, $options: "i" } },
          { content: { $regex: searchQuery, $options: "i" } },
          { tags: { $regex: searchQuery, $options: "i" } }
        ]
      };
    }

    const posts = await Post.find(queryFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "firstName lastName photoUrl headline isPremium membershipType")
      .populate("comments.user", "firstName lastName photoUrl isPremium membershipType");

    res.json({ data: posts });
  } catch (error) {
    console.error("Error fetching feed:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    
    res.json({ 
      message: isLiked ? "Post unliked" : "Post liked", 
      totalLikes: post.likes.length,
      isLiked: !isLiked 
    });
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text.trim()) return res.status(400).json({ message: "Comment cannot be empty" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({
      user: userId,
      text: text,
    });

    await post.save();

    const updatedPost = await Post.findById(postId).populate("comments.user", "firstName lastName photoUrl");

    res.json({ message: "Comment added!", comments: updatedPost.comments });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const acceptAnswer = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the author can accept an answer." });
    }

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.isAcceptedAnswer = !comment.isAcceptedAnswer;
    
    await post.save();
    res.json({ message: "Answer status updated!", isAccepted: comment.isAcceptedAnswer });
  } catch (error) {
    console.error("Error accepting answer:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getSinglePost = async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findById(postId)
      .populate("author", "firstName lastName photoUrl headline isPremium membershipType")
      .populate("comments.user", "firstName lastName photoUrl isPremium membershipType")
      .populate("comments.replies.user", "firstName lastName photoUrl membershipType");

    if (!post) return res.status(404).json({ message: "Post not found" });

    res.json({ data: post });
  } catch (error) {
    console.error("Error fetching single post:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addReply = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text.trim()) return res.status(400).json({ message: "Reply cannot be empty" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.replies.push({ user: userId, text });
    await post.save();

    const updatedPost = await Post.findById(postId)
      .populate("comments.user", "firstName lastName photoUrl")
      .populate("comments.replies.user", "firstName lastName photoUrl");

    const updatedComment = updatedPost.comments.id(commentId);
    res.json({ message: "Reply added!", comment: updatedComment });
  } catch (error) {
    console.error("Error adding reply:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const {postId} = req.params;
    const loggedInUserId = req.user._id.toString();

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== loggedInUserId) {
      return res.status(403).json({ message: "You are not authorized to delete this post." });
    }

    await Post.findByIdAndDelete(postId);
    res.json({ message: "Post deleted successfully" });

  } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Internal Server Error" });
  }
};

export const editPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const loggedInUserId = req.user._id.toString();
    const { title, content, codeSnippet, codeLanguage, tags } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== loggedInUserId) {
      return res.status(403).json({ message: "You are not authorized to edit this post." });
    }

    post.title = title || post.title;
    post.content = content || post.content;
    post.codeSnippet = codeSnippet !== undefined ? codeSnippet : post.codeSnippet;
    post.codeLanguage = codeLanguage || post.codeLanguage;
    post.tags = tags || post.tags;

    const updatedPost = await post.save();
    
    await updatedPost.populate("author", "firstName lastName photoUrl headline");

    res.json({ message: "Post updated successfully", data: updatedPost });
  } catch (error) {
    console.error("Error editing post:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
