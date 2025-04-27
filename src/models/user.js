import mongoose, { Schema } from "mongoose";

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
    },
    password: {
      type: String,
      required: true,
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
    photoUrl: {
      type: String,
      default: "https://www.w3schools.com/howto/img_avatar.png",
      // validate(value) {
      //   if(!validator.isUrl(value)) {
      //     throw new Error("Invalid URL : " + value);
      //   }
      // }
    },
    about: {
      type: String,
      default: "Introvert by nature",
    },
    skills: {
      type: [String],
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);
