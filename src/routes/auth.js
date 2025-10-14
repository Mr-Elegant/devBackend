import express from "express";
const authRouter = express.Router();
import { User } from "../models/user.js";
import bcrypt from 'bcrypt';
import { validateSignUpData } from "../utils/validation.js";


authRouter.post('/signup', async(req,res) => {
  
  try {
  // validate data through validator function in util
   validateSignUpData(req);

   const {firstName, lastName, emailId, password} = req.body;

   // encrypt password using bcrypt
   const passwordHash = await bcrypt.hash(password, 10);
  //  console.log(passwordHash);

   // creating User Instance
   const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
   }) 

   
     const savedUser = await user.save();
    const token = await savedUser.getJWT();

    res.cookie("token", token, {
      expires: new Date(Date.now() + 8 * 3600000),
    });

    res.json({ message: "User Added successfully!", data: savedUser });
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
})



authRouter.post("/login", async(req, res)=> {
  try {
    const {emailId, password} = req.body;
  
    const user = await User.findOne({emailId: emailId});
    if(!user){
      throw new Error("Invalid credentials");
    }

    // (validatePassword()) is coming from User model functions
    const isPasswordValid = await user.validatePassword(password);

    if(isPasswordValid) { 

      // generating a jwt token  (getJWT method is coming from User model methods )
      const token = await user.getJWT();
      console.log(token)

      // add the token to the cookie and send response back to the user
      res.cookie("token", token);
      res.send(user);
    }else{
      throw new Error("Invalid credentials");
    }
  } catch (error) {
      res.status(400).send("Error: " + error.message)
  }

})


authRouter.post("/logout", async (req,res) => {
    res.cookie("token", null, {
        expires : new Date(Date.now())
    })
    res.send("Logout Succesfull!");
})







export default authRouter;