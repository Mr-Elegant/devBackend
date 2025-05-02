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



export default profileRouter;

