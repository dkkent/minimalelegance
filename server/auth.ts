import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sendEmail, sendPasswordResetEmail } from "./utils/sendgrid";
import { 
  hashPassword, 
  comparePasswords, 
  validatePasswordStrength, 
  PASSWORD_REQUIREMENTS 
} from "./utils/password-utils";

// Track login attempts for additional security (in-memory for simplicity)
// In production, you'd use a Redis store or similar to handle this across instances
interface LoginAttempt {
  count: number;
  firstAttempt: Date;
  lastAttempt: Date;
  blocked: boolean;
  blockedUntil?: Date;
}
const loginAttempts: Record<string, LoginAttempt> = {};

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

/**
 * Helper function to track failed login attempts
 */
function trackFailedLoginAttempt(email: string): boolean {
  const now = new Date();
  if (!loginAttempts[email]) {
    loginAttempts[email] = {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
      blocked: false
    };
    return false;
  }

  const attempt = loginAttempts[email];
  
  // If they're blocked, check if the block has expired
  if (attempt.blocked && attempt.blockedUntil) {
    if (now > attempt.blockedUntil) {
      // Block expired, reset
      loginAttempts[email] = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false
      };
      return false;
    }
    return true; // Still blocked
  }

  // Update attempt count
  attempt.count++;
  attempt.lastAttempt = now;
  
  // Check if we need to block this account
  // Block after 5 failed attempts within 15 minutes
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  if (attempt.count >= 5 && attempt.firstAttempt > fifteenMinutesAgo) {
    attempt.blocked = true;
    attempt.blockedUntil = new Date(now.getTime() + 30 * 60 * 1000); // Block for 30 minutes
    return true;
  }
  
  return false;
}

/**
 * Reset login attempts when login is successful
 */
function resetLoginAttempts(email: string): void {
  delete loginAttempts[email];
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "loveslices-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true, // Prevent JavaScript access
      secure: process.env.NODE_ENV === 'production', // Require HTTPS in production
      sameSite: 'lax' // Prevent CSRF
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
        try {
          // Check if this account is temporarily blocked due to too many login attempts
          if (loginAttempts[email]?.blocked) {
            return done(null, false, { message: "Account temporarily locked due to too many failed login attempts. Please try again later." });
          }

          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            // Track failed login attempts
            trackFailedLoginAttempt(email);
            return done(null, false, { message: "Invalid email or password" });
          }
          
          const passwordMatches = await comparePasswords(password, user.password);
          
          if (!passwordMatches) {
            // Track failed login attempts
            const blocked = trackFailedLoginAttempt(email);
            const message = blocked 
              ? "Account temporarily locked due to too many failed login attempts. Please try again later."
              : "Invalid email or password";
            return done(null, false, { message });
          }
          
          // Success - reset login attempts
          resetLoginAttempts(email);
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // API endpoint to get password requirements
  app.get("/api/password-requirements", (req, res) => {
    res.json({
      minLength: PASSWORD_REQUIREMENTS.minLength,
      minScore: PASSWORD_REQUIREMENTS.minScore,
      message: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters and reasonably strong`
    });
  });

  // Check password strength
  app.post("/api/check-password-strength", (req, res) => {
    const { password, userInputs = [] } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }
    
    const result = validatePasswordStrength(password, userInputs);
    
    res.json(result);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, name, isIndividual } = req.body;
      
      // Validate inputs
      if (!email || !password || !name) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Check if email is already in use
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Validate password strength
      const passwordValidation = validatePasswordStrength(password, [email, name]);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          message: "Password is too weak", 
          passwordValidation
        });
      }

      // Create user with hashed password
      const user = await storage.createUser({
        email,
        password: await hashPassword(password),
        name,
        isIndividual: isIndividual === undefined ? true : isIndividual
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      // Log user in
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
      
      if (!user) {
        return res.status(401).json({ 
          message: info?.message || "Invalid email or password" 
        });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Log successful login for security monitoring
        console.log(`User ${user.id} (${user.email}) logged in successfully at ${new Date().toISOString()}`);
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    if (req.user) {
      // Log logout for security monitoring
      console.log(`User ${req.user.id} (${req.user.email}) logged out at ${new Date().toISOString()}`);
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Use the storage.getSanitizedUser method to properly sanitize user data
      // This removes sensitive fields like password, resetToken, etc. AND formats profile picture
      const sanitizedUser = await storage.getSanitizedUser(req.user.id);
      
      if (!sanitizedUser) {
        return res.sendStatus(404);
      }
      
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Error fetching sanitized user data:", error);
      res.status(500).json({ message: "Error fetching user data" });
    }
  });
  
  // Get partner information
  app.get("/api/partner", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Get the partner's user ID first
      const partnership = await storage.getCurrentPartnership(req.user.id);
      
      if (!partnership || !req.user.partnerId) {
        return res.status(404).json({ message: "No partner found" });
      }
      
      // Use the sanitizeUser method to properly sanitize partner data
      const sanitizedPartner = await storage.getSanitizedUser(req.user.partnerId);
      
      if (!sanitizedPartner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      res.json(sanitizedPartner);
    } catch (error) {
      console.error("Error fetching partner data:", error);
      res.status(500).json({ message: "Failed to fetch partner information" });
    }
  });
  
  // Forgot password - request password reset
  app.post("/api/forgot-password", async (req, res, next) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Log password reset request for security monitoring
      console.log(`Password reset requested for email: ${email} at ${new Date().toISOString()}`);
      
      // Create a reset token
      const resetToken = await storage.createPasswordResetToken(email);
      
      if (!resetToken) {
        // We don't want to reveal if an email exists in our system or not for security
        return res.status(200).json({ message: "If your email exists in our system, you will receive a password reset link" });
      }
      
      // Use our dedicated password reset email function
      await sendPasswordResetEmail(email, resetToken);
      
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
      
      // First, verify token is valid and get the user
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      // Validate password strength
      const passwordValidation = validatePasswordStrength(password, [user.email, user.name]);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          message: "Password is too weak", 
          passwordValidation
        });
      }
      
      // Log password reset for security monitoring
      console.log(`Password reset completed for user ID: ${user.id} (${user.email}) at ${new Date().toISOString()}`);
      
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
      
      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword, [req.user.email, req.user.name]);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          message: "New password is too weak", 
          passwordValidation
        });
      }
      
      // Log password change for security monitoring
      console.log(`Password changed for user ID: ${req.user.id} (${req.user.email}) at ${new Date().toISOString()}`);
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the user's password
      await storage.updateUser(req.user.id, { password: hashedPassword });
      
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      next(error);
    }
  });
  
  // User account deletion API
  app.post("/api/delete-account", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to delete your account" });
      }
      
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required to confirm account deletion" });
      }
      
      // Verify password
      const isCorrectPassword = await comparePasswords(password, req.user.password);
      
      if (!isCorrectPassword) {
        return res.status(400).json({ message: "Password is incorrect" });
      }
      
      // Log account deletion for security monitoring
      console.log(`Account deletion requested for user ID: ${req.user.id} (${req.user.email}) at ${new Date().toISOString()}`);
      
      // Perform account deletion
      const success = await storage.deleteUser(req.user.id);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete account" });
      }
      
      // Log the user out
      req.logout((err) => {
        if (err) return next(err);
        res.status(200).json({ message: "Account successfully deleted" });
      });
    } catch (error) {
      next(error);
    }
  });
}
