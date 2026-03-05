// ==========================================
// 1. IMPORTS & SETUP
// ==========================================
import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxLength: 1000,
    },
  },
  { timestamps: true }
);



// We create a separate schema for comments so they are cleanly nested inside posts
const commentSchema = new mongoose.Schema(
  {
    // The user who wrote the comment
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The actual text of the comment
    text: {
      type: String,
      required: true,
      maxLength: 1000,
    },
    // 🔥 Q&A Feature: The author of the post can mark a comment as the "Accepted Answer" to a bug
    isAcceptedAnswer: {
      type: Boolean,
      default: false,
    },
    replies: [replySchema], // Nested replies to comments
  },
  { timestamps: true }
);

// ==========================================
// 2. THE MAIN POST SCHEMA
// ==========================================
const postSchema = new mongoose.Schema(
  {
    // Who wrote this post?
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔥 THE MAGIC FIELD: This tells the frontend how to render the post
    type: {
      type: String,
      enum: ["devlog", "article", "question", "launch"],
      default: "devlog",
      required: true,
    },

    // Title (Required for 'article' and 'question', optional for quick 'devlogs')
    title: {
      type: String,
      trim: true,
      maxLength: 200,
    },

    // The main body of the post. We will let the frontend send raw Markdown here!
    content: {
      type: String,
      required: true,
      maxLength: 10000, // Big enough for a solid tutorial
    },

    // 🔥 Dedicated field for raw code snippets (makes syntax highlighting easier on frontend)
    codeSnippet: {
      type: String,
      default: "",
    },

    // What language is the snippet? (e.g., "javascript", "python" - tells frontend how to color it)
    codeLanguage: {
      type: String,
      default: "javascript",
    },

    // Reusing your Cloudinary upload pipeline for post attachments!
    images: [
      {
        type: String,
      },
    ],

    // Searchable tags (e.g., ["React", "Bug", "Help"])
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Social Features: Array of User IDs who liked the post
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Embed the comments schema we built above
    comments: [commentSchema],

    // If type === 'launch', we can store the live link here
    projectUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

// ==========================================
// 3. INDEXING FOR PERFORMANCE
// ==========================================
// This makes fetching the global feed incredibly fast, sorting by newest first
postSchema.index({ createdAt: -1 });
// This makes searching by tags lightning fast
postSchema.index({ tags: 1 });

export const Post = mongoose.model("Post", postSchema);