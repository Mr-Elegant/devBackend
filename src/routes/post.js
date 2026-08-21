import express from "express";
import userAuth from "../middlewares/auth.js";
import { 
  createPost, 
  getGlobalFeed, 
  toggleLike, 
  addComment, 
  acceptAnswer, 
  getSinglePost, 
  addReply, 
  deletePost, 
  editPost 
} from "../controllers/post.controller.js";

const postRouter = express.Router();

postRouter.post("/post/create", userAuth, createPost);
postRouter.get("/post/feed", userAuth, getGlobalFeed);
postRouter.post("/post/like/:postId", userAuth, toggleLike);
postRouter.post("/post/comment/:postId", userAuth, addComment);
postRouter.patch("/post/comment/accept/:postId/:commentId", userAuth, acceptAnswer);
postRouter.get("/post/:postId", userAuth, getSinglePost);
postRouter.post("/post/comment/reply/:postId/:commentId", userAuth, addReply);
postRouter.delete("/post/:postId", userAuth, deletePost);
postRouter.patch("/post/:postId", userAuth, editPost);

export default postRouter;