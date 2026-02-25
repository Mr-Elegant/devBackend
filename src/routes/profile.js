import express from "express";
const profileRouter = express.Router();

import userAuth from "../middleware/auth.js";
import { validateEditProfileData } from "../utils/validation.js";
import { User } from "../models/user.js";
import bcrypt from "bcrypt"
  



profileRouter.get("/profile/view", userAuth,  async (req, res) => {
    try {
      const user = req.user;
    
      res.send(user)
      
    } catch (error) {
        res.status(400).send("Error: " + error.message)
    }
})


profileRouter.patch("/profile/edit", userAuth, async (req,res) => {

    try {
        if(!validateEditProfileData(req)){
            throw new Error("Invalid edit request");
        }

        const loggedInUser = req.user;

        Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));

        await loggedInUser.save();

        res.json({
            message: `${loggedInUser} , Your Profile Changes Successfully done.`,
            data: loggedInUser,
        })

    } catch (error) {
        res.status(400).send("Error : " + error.message);
    }
})




profileRouter.patch("/profile/updatePassword", userAuth, async (req,res) => {

    const {oldPassword , newPassword} = req.body;
    // validate the input
    if(!oldPassword || !newPassword){
        return res.status(404).json({msg: 'Please provide both old and new password'});
    }
    try {
        const user = req.user;        
        // Comparing password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if(!isMatch){
            return res.status(400).json({msg: 'incorrect old password'});
        }

        // hash the new pasword
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // update the pasword in the db
        user.password = passwordHash;
        await user.save();
        return res.status(200).json({message: "Password updated succesfully"});
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: "Server error"})
    }
})

profileRouter.patch("/profile/projects", userAuth, async (req,res) => {
    try {
        // 1. Grab the currently authenticated user from the request (attached by userAuth middleware)
        const loggedInUser = req.user;

        // 2. Extract projects array from the incoming frontend reqest body
        const { projects } = req.body;
        // 3. Validate the projects data (ensure it's an array and has the required fields)
        if (!Array.isArray(projects)) {
            return res.status(400).json({message: "Projects should be an array"});
        }

        // 4. Overwrite the user's existing projects with the new updated array
        loggedInUser.projects = projects;
        // 5. Save the updated user document to the database
        await loggedInUser.save();
        // 6. Send a success response back to the frontend with the updated user data
        res.json({
            message: "Projects updated successfully",
            data: loggedInUser,
        });
    
    } catch (error) {
        res.status(500).json({message: "Error updating portfolio", error: error.message});
        console.log("Error updating portfolio", error);
    }


})


export default profileRouter;

