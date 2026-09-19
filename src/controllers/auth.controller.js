import { User } from "../models/user.js";
import bcrypt from 'bcrypt';
import { validateSignUpData } from "../utils/validation.js";

const isProduction = process.env.NODE_ENV === "production";

const getCookieOptions = (expires = new Date(Date.now() + 8 * 3600000)) => ({
  expires,
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
});

export const signup = async (req, res) => {
  try {
    validateSignUpData(req);

    const { firstName, lastName, emailId, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });

    const savedUser = await user.save();
    const token = await savedUser.getJWT();

    res.cookie("token", token, getCookieOptions());

    res.json({ message: "User Added successfully!", data: savedUser });
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
};

export const login = async (req, res) => {
  try {
    const { emailId, password } = req.body;
  
    const user = await User.findOne({ emailId: emailId });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await user.validatePassword(password);

    if (isPasswordValid) { 
      const token = await user.getJWT();
      
      res.cookie("token", token, getCookieOptions());
      res.send(user);
    } else {
      throw new Error("Invalid credentials");
    }
  } catch (error) {
    res.status(400).send("Error: " + error.message);
  }
};

export const logout = async (req, res) => {
  res.cookie("token", null, getCookieOptions(new Date(Date.now())));
  res.send("Logout Succesfull!");
};

export const oauthCallback = async (req, res) => {
  try {
    const user = req.user;
    const token = await user.getJWT();

    res.cookie("token", token, getCookieOptions());

    res.redirect(process.env.FRONTEND_URL || "http://localhost:5173/");
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
};
