import connectDB from './config/database.js';
import { User } from './models/user.js';
import express from 'express';
import dotenv from "dotenv";
const app = express();
dotenv.config();

app.use(express.json())

app.post('/signup', async(req,res) => {
    // creating instance of user model and passing the data from request body to it
   const user = new User(req.body);
   try {
     await user.save();
     res.send("User created successfully")
   } catch (error) {
     res.status(400).send("Error creating user: " + error.message)  
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

// Feed Api - GET /feed - get all the users from the database
app.get("/feed", async (req, res)=> {
  try {
    const users = await User.find({});
    if(users.length === 0) {
      res.status(404).send("No users found");
    }
    res.send(users);
  } catch (error) {
      res.status(400).send("Something went wrong");
  }
})

// delete user by id
app.delete("/user", async (req, res) => {
  const userId = req.body.userId;

  try {
    // const user = await User.findByIdAndDelete({_id : userId});
    const user = await User.findByIdAndDelete(userId);
    res.send("user deleted successfully");
  } catch (error) {
    res.status(400).send("Something went wrong");
  }
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


