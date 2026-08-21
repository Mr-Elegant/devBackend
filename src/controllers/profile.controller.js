import { validateEditProfileData } from "../utils/validation.js";
import { User } from "../models/user.js";
import bcrypt from "bcrypt";

export const viewProfile = async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (error) {
    res.status(400).send("Error: " + error.message);
  }
};

export const editProfile = async (req, res) => {
  try {
    if (!validateEditProfileData(req)) {
      throw new Error("Invalid edit request");
    }

    const loggedInUser = req.user;

    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));

    await loggedInUser.save();

    res.json({
      message: `${loggedInUser.firstName} , Your Profile Changes Successfully done.`,
      data: loggedInUser,
    });
  } catch (error) {
    res.status(400).send("Error : " + error.message);
  }
};

export const updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  // validate the input
  if (!oldPassword || !newPassword) {
    return res
      .status(404)
      .json({ msg: "Please provide both old and new password" });
  }
  try {
    const user = req.user;
    // Comparing password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "incorrect old password" });
    }

    // hash the new pasword
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // update the pasword in the db
    user.password = passwordHash;
    await user.save();
    return res.status(200).json({ message: "Password updated succesfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateProjects = async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { projects } = req.body;
    
    if (!Array.isArray(projects)) {
      return res.status(400).json({ message: "Projects should be an array" });
    }

    loggedInUser.projects = projects;
    await loggedInUser.save();
    
    res.json({
      message: "Projects updated successfully",
      data: loggedInUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating portfolio", error: error.message });
    console.log("Error updating portfolio", error);
  }
};

export const linkGithub = async (req, res) => {
  try {
    const { githubUsername } = req.body;

    if (githubUsername === undefined) {
      return res.status(400).json({ message: "GitHub username is required" });
    }

    req.user.githubUsername = githubUsername;
    await req.user.save();

    res.json({ 
      message: "GitHub linked successfully!", 
      data: req.user 
    });
  } catch (error) {
    console.error("Error linking GitHub:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
