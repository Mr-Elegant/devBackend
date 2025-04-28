import jwt from "jsonwebtoken";
import {User} from "../models/user.js";

const userAuth = async (req,res, next) => {
    try {

        // read the token from the req cookie
        const {token} = req.cookies;
        if (!token) {
            return res.status(401).send("Please Login!");
        }

        // validate the token
        const decodedObj = await jwt.verify(token, process.env.JWT_SECRET, {expiresIn: "30d"});

        const {_id} = decodedObj;

        // find the user
        const user = await User.findById(_id);
        if(!user){
            throw new Error("User not found");
        }

        req.user = user;
        next();

    } catch (error) {
        res.status(400).send("ERROR: " + error.message);
    }
}



export default userAuth