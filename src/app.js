import express from 'express';
import connectDB from './config/database.js';
import { User } from './models/user.js';
const app = express();


app.post('/signup', async(req,res) => {
    // const user = new User({
    //     firstName: req.body.firstName,
    //     lastName: req.body.lastName,
    //     emailId: req.body.emailId,
    //     password: req.body.password,
    //     age: req.body.age
    // })
    const user = new User({
        firstName: "Preet1",
        lastName: "Karwal",
        emailId: "preet1@gmail.com",
        password: "12345",
        age: 25,
        gender: "male"
    })
   try {
     await user.save();
     res.send("User created successfully")
   } catch (error) {
     res.status(400).send("Error creating user: " + error.message)
    
   }
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


