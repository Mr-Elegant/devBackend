import mongoose, { Schema } from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 4,
      maxLength: 50,
    },
    lastName: {
      type: String,
    },
    emailId: {
      type: String,
      lowercase: true,
      required: true,
      unique: true,
      trim: true,
      validate(value){
        if(!validator.isEmail(value)){
          throw new Error("Invalid email address : " + value);
        }
      }
    },
    password: {
      type: String,
      required: true,
      // validate(value) {
      //   if (!validator.isStrongPassword(value)) {
      //     throw new Error("Enter a Strong Password: " + value);
      // }
    },
    age: {
      type: Number,
      min: 18,
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: `{VALUE} is not a valid gender type`,
      },
      // validate(value) {
      //   if (!["male", "female", "others"].includes(value)) {
      //     throw new Error("Gender data is not valid");
      //   }
      // },
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    membershipType: {
      type: String,
    },
    photoUrl: {
      type: String,
      default: "https://www.w3schools.com/howto/img_avatar.png",
      validate(value) {
        if (!validator.isURL(value)) {
          throw new Error("Invalid Photo URL: " + value);
        }
      },
    },
    about: {
      type: String,
      default: "Introvert by nature",
    },
    skills: {
      type: [String],
    },
    // ==========================================
    // DEVELOPER PORTFOLIO SECTION
    // ==========================================
    projects: [
      {
         // The name of the project (e.g "Devnet chat engine")
         title :{
          type: String,
          required: true,
          trim: true,
          maxLength: 100, // concise for ui layout
         },
         // A short description about the project (e.g "A real time chat engine built using socket.io and nodejs")
         description : {
          type: String,
          trim: true,
          maxLength: 500,  // concise for ui layout
         },
         // The URL OF LIVE DEPLOYED project
         liveUrl: {
          type: String,
          trim: true,
         },
          // The URL of the github repository of the project 
         githubUrl: {
          type: String,
          trim: true,
         },
         // Array to store Cloudinary screenshot URLs of the project
         images: [
          {
            type: String
          },
         ]
      }
    ]
  },
  {
    timestamps: true,
  }
);


// dont use arrow function in userSchema function otherwise it will break bcz of (this)
userSchema.methods.getJWT = async function () {
  const user = this;

  const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET);

  return token;
}

userSchema.methods.validatePassword = async function (passwordInputByUser) {
  const user = this;
  const passwordHash = user.password;

  const isPasswordValid = await bcrypt.compare(passwordInputByUser,passwordHash)

  return isPasswordValid;
}





export const User = mongoose.model("User", userSchema);
