import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendEmail } from "./utils/sendgrid";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "loveslices-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        const user = await storage.getUserByEmail(email);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      }
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, name, isIndividual } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const user = await storage.createUser({
        email,
        password: await hashPassword(password),
        name,
        isIndividual: isIndividual === undefined ? true : isIndividual
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid email or password" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  
  // Forgot password - request password reset
  app.post("/api/forgot-password", async (req, res, next) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Create a reset token
      const resetToken = await storage.createPasswordResetToken(email);
      
      if (!resetToken) {
        // We don't want to reveal if an email exists in our system or not for security
        return res.status(200).json({ message: "If your email exists in our system, you will receive a password reset link" });
      }
      
      // Send the reset email
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
      
      await sendEmail({
        to: email,
        subject: "Reset your Loveslices password",
        html: `
          <h1>Reset your password</h1>
          <p>You requested a password reset for your Loveslices account.</p>
          <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #ef7c8e; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
          <p>The Loveslices Team</p>
        `,
        text: `Reset your password: ${resetUrl}. This link will expire in 1 hour.`
      });
      
      res.status(200).json({ message: "If your email exists in our system, you will receive a password reset link" });
    } catch (error) {
      next(error);
    }
  });
  
  // Verify reset token
  app.get("/api/reset-password/:token", async (req, res, next) => {
    try {
      const { token } = req.params;
      
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      res.status(200).json({ message: "Token is valid" });
    } catch (error) {
      next(error);
    }
  });
  
  // Reset password with token
  app.post("/api/reset-password/:token", async (req, res, next) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(password);
      
      // Update the password
      const success = await storage.resetPassword(token, hashedPassword);
      
      if (!success) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
      next(error);
    }
  });
  
  // Change password (when logged in)
  app.post("/api/change-password", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to change your password" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      // Verify current password
      const isCorrectPassword = await comparePasswords(currentPassword, req.user.password);
      
      if (!isCorrectPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the user's password
      await storage.updateUser(req.user.id, { password: hashedPassword });
      
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      next(error);
    }
  });
}
