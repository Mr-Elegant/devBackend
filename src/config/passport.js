import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { User } from "../models/user.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.FRONTEND_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1. Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });
        
        if (!user) {
          // 2. Check if user exists with the same email (if they previously signed up manually)
          user = await User.findOne({ emailId: profile.emails[0].value });
          
          if (user) {
            // Link their Google account to existing email
            user.googleId = profile.id;
            await user.save();
          } else {
            // 3. Create a brand new user
            user = new User({
              googleId: profile.id,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName || "",
              emailId: profile.emails[0].value,
              // Note: Make sure your User schema doesn't strictly require a password!
            });
            await user.save();
          }
        }
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.FRONTEND_URL}/auth/github/callback`,
      scope: ["user:email"], // Request access to user's email
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1. Check if user already exists with this GitHub ID
        let user = await User.findOne({ githubId: profile.id });

        if (!user) {
          // Extract email (GitHub might return multiple, we take the primary)
          const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
          
          if (email) {
            // 2. Check if user exists with the same email
            user = await User.findOne({ emailId: email });
          }

          if (user) {
            // Link their GitHub account to existing email
            user.githubId = profile.id;
            user.githubUsername = profile.username; // Since you have this field in your schema!
            await user.save();
          } else {
            // 3. Create a brand new user
            const nameParts = (profile.displayName || profile.username).split(" ");
            user = new User({
              githubId: profile.id,
              githubUsername: profile.username,
              firstName: nameParts[0] || profile.username,
              lastName: nameParts.slice(1).join(" ") || "",
              emailId: email || `${profile.username}@github.local`, // Fallback if no public email
            });
            await user.save();
          }
        }
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);