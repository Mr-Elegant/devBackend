import express from "express";
const requestRouter = express.Router();

import userAuth from "../middleware/auth.js";




requestRouter.post("/sendConnectionRequest", userAuth, async(req,res)=> {
    const user = req.user;
    // sending a connection request
    console.log("Sending a connection request");
  
    res.send(user.firstName + ' sent the connection request');
})



export default requestRouter