import connectDB from './config/database.js';
import { User } from './models/user.js';
import express from 'express';
import dotenv from "dotenv";
import { validateSignUpData } from './utils/validation.js';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import jwt from "jsonwebtoken";
import userAuth from './middleware/auth.js';

const app = express();
dotenv.config();

app.use(express.json())
app.use(cookieParser())

app.post('/signup', async(req,res) => {
  
  // validate data through validator function in util
   validateSignUpData(req);

   const {firstName, lastName, emailId, password} = req.body;

   // encrypt password using bcrypt
   const passwordHash = await bcrypt.hash(password, 10);
   console.log(passwordHash);

   // creating User Instance
   const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
   }) 

   try {
     await user.save();
     res.send("User created successfully")
   } catch (error) {
     res.status(400).send("Error creating user: " + error.message)  
   }
})

// login user
app.post("/login", async(req, res)=> {
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
      res.send("Login Sucessfull");
    }else{
      throw new Error("Invalid credentials");
    }
  } catch (error) {
      res.status(400).send("Error: " + error.message)
  }

})



app.get("/profile", userAuth,  async (req, res) => {
  try {
    const user = req.user;
  
    res.send(user)
    
  } catch (error) {
      res.status(400).send("Error: " + error.message)
  }
})




// get user by email
app.get("/user", async (req, res) => {
    const userEmail = req.body.emailId;
  
    try {
      const user = await User.findOne({emailId: userEmail});
      if(!user) {
        res.status(404).send("User not found");
      }else{
        res.send(user);
      }
    } catch (error) {
      res.status(400).send("Something went wrong");
    }
})


app.post("/sendConnectionRequest", userAuth, async(req,res)=> {

  // sending a connection request
  console.log("Sending a connection request");

  res.send("Connection Request Send!");
})



// patch user
app.patch("/user/:userId", async(req,res)=> {
  const userId = req.params?.userId;
  const data = req.body;
  // console.log(data); 

  try {
    const ALLOWED_UPDATES = ["firstName", "lastName", "photoUrl",  "password", "about", "gender", "age","skills"];

    const isUpdateAllowed = Object.keys(data).every((update) => {
      return ALLOWED_UPDATES.includes(update);
    });

    if(!isUpdateAllowed){
      throw new Error("Invalid data provided for update");
    }
    if(data?.skills.length > 10) {
      throw new Error("Skills array should not exceed 10 items");
    }
    // const user = await User.findByIdAndUpdate(userId, req.body, {
    //   new: true,
    //   runValidators: true
    // });
    const user = await User.findByIdAndUpdate(userId, data, {
      returnDocument: 'after',
      runValidators: true,
    });
  } catch (error) {
    res.status(400).send("Data Updation failed: " + error.message);
  }
  res.send("User updated successfully");  
})




connectDB()
    .then(() => {
        app.listen(3000, () => {
            console.log('Server is running on port 3000');
        })
    })
    .catch((err) => {
        console.log("Database connection failed", err);
    });


