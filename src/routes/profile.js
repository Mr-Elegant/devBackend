import express from "express";
import userAuth from "../middlewares/auth.js";
import { viewProfile, editProfile, updatePassword, updateProjects, linkGithub } from "../controllers/profile.controller.js";

const profileRouter = express.Router();

profileRouter.get("/profile/view", userAuth, viewProfile);
profileRouter.patch("/profile/edit", userAuth, editProfile);
profileRouter.patch("/profile/updatePassword", userAuth, updatePassword);
profileRouter.patch("/profile/projects", userAuth, updateProjects);
profileRouter.patch("/profile/github", userAuth, linkGithub);

export default profileRouter;
