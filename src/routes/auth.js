import express from "express";
import passport from "passport";
import { signup, login, logout, oauthCallback } from "../controllers/auth.controller.js";

const authRouter = express.Router();

authRouter.post('/signup', signup);

authRouter.post("/login", login);

authRouter.post("/logout", logout);

// ==========================================
// GOOGLE OAUTH 2.0 ROUTES
// ==========================================

// 1. Redirect user to Google to authenticate
authRouter.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// 2. Google redirects back to this URL
authRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  oauthCallback
);

// ==========================================
// GITHUB OAUTH 2.0 ROUTES
// ==========================================

// 1. Redirect user to GitHub to authenticate
authRouter.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

// 2. GitHub redirects back to this URL
authRouter.get(
  "/auth/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  oauthCallback
);

export default authRouter;
