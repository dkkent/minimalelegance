import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { adminRoutes } from "./routes/admin/routes";
import { randomBytes } from "crypto";
import { WebSocketServer, WebSocket } from 'ws';
import { validatePasswordStrength, comparePasswords, hashPassword } from "./utils/password-utils";
import { saveProfilePicture } from "./middleware/upload";
import { 
  insertResponseSchema, 
  insertConversationSchema, 
  insertConversationMessageSchema,
  insertSpokenLovesliceSchema,
  insertJournalEntrySchema,
  conversationOutcomeEnum,
  activeQuestions,
  responses,
  questions
} from "@shared/schema";
// We're importing the UploadedFile type from our declaration file, but
// we need to handle as a 'Request' with 'files' property
interface RequestWithFiles extends Request {
  files?: {
    [fieldname: string]: {
      name: string;
      encoding: string;
      mimetype: string;
      mv: (path: string) => Promise<void>;
      data: Buffer;
      truncated: boolean;
      size: number;
      md5: string;
      tempFilePath: string;
    } | Array<{
      name: string;
      encoding: string;
      mimetype: string;
      mv: (path: string) => Promise<void>;
      data: Buffer;
      truncated: boolean;
      size: number;
      md5: string;
      tempFilePath: string;
    }>;
  };
}
import { db } from "./db";
import { eq, and, or, isNull, not } from "drizzle-orm";


export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Register admin routes
  app.use(adminRoutes);
  
  // Debug endpoint to check session status (TEMPORARY, development only)
  app.get("/api/debug/session", (req, res) => {
    console.log("======== SESSION DEBUG INFO ========");
    console.log("Session ID:", req.sessionID);
    console.log("Session data:", req.session);
    console.log("isAuthenticated:", req.isAuthenticated());
    console.log("User in req.user:", req.user ? `User ID: ${req.user.id}, Role: ${req.user.role}` : 'Not available');
    console.log("==========================================");
    
    // Return sanitized info (don't expose passwords or tokens)
    return res.json({
      sessionExists: !!req.session,
      sessionID: req.sessionID,
      userAuthenticated: req.isAuthenticated(),
      userId: req.session?.userId,
      userInfo: req.user ? {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        lastAdminLogin: req.user.lastAdminLogin,
      } : null,
      cookieHeader: req.headers.cookie,
    });
  });
  
  // Debug endpoint to check environment variables (TEMPORARY)
  app.get("/api/debug/env", (req, res) => {
    // Check if request is from localhost for security
    const ip = req.ip || req.connection.remoteAddress;
    if (ip !== '127.0.0.1' && ip !== '::1' && ip !== '::ffff:127.0.0.1') {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    console.log("======== ENVIRONMENT VARIABLES DEBUG ========");
    console.log("VITE_APP_URL:", process.env.VITE_APP_URL);
    console.log("SENDGRID_VERIFIED_SENDER:", process.env.SENDGRID_VERIFIED_SENDER);
    console.log("SENDGRID_API_KEY exists:", !!process.env.SENDGRID_API_KEY);
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("==========================================");
    
    return res.json({
      VITE_APP_URL: process.env.VITE_APP_URL,
      SENDGRID_VERIFIED_SENDER: process.env.SENDGRID_VERIFIED_SENDER,
      SENDGRID_API_KEY_EXISTS: !!process.env.SENDGRID_API_KEY,
      NODE_ENV: process.env.NODE_ENV
    });
  });
  
  // Debug endpoint to test sendgrid email directly (TEMPORARY)
  app.get("/api/debug/email-test", async (req, res) => {
    // Allow all requests to this endpoint during development
    // (We'll remove this endpoint before production)
    
    // Set content-type to ensure proper JSON response
    res.setHeader('Content-Type', 'application/json');
    
    const { to, type } = req.query;
    
    if (!to) {
      return res.status(400).json({ message: "Email address is required via 'to' query parameter" });
    }
    
    console.log(`======== EMAIL TEST DEBUG ========`);
    console.log(`Test type: ${type || 'basic'}`);
    console.log(`Sending test email to: ${to}`);
    
    try {
      const { sendEmail, sendPartnerInvitationEmail, sendPasswordResetEmail } = await import('./utils/sendgrid');
      
      // Test results for the different email functions
      let basicResult = false;
      let inviteResult = false;
      let resetResult = false;
      
      // 1. Test the basic sendEmail function
      try {
        basicResult = await sendEmail({
          to: to as string,
          subject: "Loveslices Test Email",
          text: "This is a test email to debug the SendGrid integration.",
          html: "<p>This is a test email to debug the <strong>SendGrid integration</strong>.</p>",
          fromName: "Loveslices Test"
        });
        console.log(`Basic sendEmail test result: ${basicResult ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        console.error("Basic sendEmail error:", error);
      }
      
      // 2. Test the partner invitation email
      try {
        inviteResult = await sendPartnerInvitationEmail({
          to: to as string,
          inviterName: "Test User",
          inviteCode: "TEST123",
          personalMessage: "This is a test to check if partner invitations work."
        });
        console.log(`Partner invitation test result: ${inviteResult ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        console.error("Partner invitation error:", error);
      }
      
      // 3. Test the password reset email
      try {
        resetResult = await sendPasswordResetEmail(
          to as string,
          "TEST-TOKEN-XYZ-123456789"
        );
        console.log(`Password reset test result: ${resetResult ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        console.error("Password reset error:", error);
      }
      
      return res.json({
        basicEmailResult: basicResult,
        invitationEmailResult: inviteResult,
        passwordResetResult: resetResult,
        message: `Test email(s) attempted to ${to}`
      });
    } catch (error) {
      console.error("Email test error:", error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Unknown error", 
        message: "Failed to run email test" 
      });
    }
  });

  // Forgot password - Request a password reset
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      console.log(`====================================================`);
      console.log(`PASSWORD RESET DEBUG: Request received for email: ${email}`);
      
      if (!email) {
        console.log('PASSWORD RESET DEBUG: Request rejected: No email provided');
        return res.status(400).json({ message: "Email address is required" });
      }

      // Log environment variables (without exposing full API key)
      console.log('PASSWORD RESET DEBUG: Environment check:');
      console.log(`- SENDGRID_API_KEY exists: ${process.env.SENDGRID_API_KEY ? 'Yes (starts with ' + process.env.SENDGRID_API_KEY.substring(0, 5) + '...)' : 'NO!'}`);
      console.log(`- SENDGRID_VERIFIED_SENDER exists: ${process.env.SENDGRID_VERIFIED_SENDER ? 'Yes (' + process.env.SENDGRID_VERIFIED_SENDER + ')' : 'NO!'}`);
      console.log(`- VITE_APP_URL exists: ${process.env.VITE_APP_URL ? 'Yes (' + process.env.VITE_APP_URL + ')' : 'NO!'}`);
      
      // Create a password reset token
      console.log(`PASSWORD RESET DEBUG: Creating password reset token for: ${email}`);
      const token = await storage.createPasswordResetToken(email);
      
      if (!token) {
        console.log(`PASSWORD RESET DEBUG: Token not created for: ${email} (likely user not found)`);
        // Return 200 even when email is not found to prevent email enumeration
        return res.status(200).json({ message: "If your email is in our system, you will receive a password reset link shortly" });
      }

      console.log(`PASSWORD RESET DEBUG: Token created: ${token.substring(0, 3)}...${token.substring(token.length - 3)}`);
      
      // Import the sendgrid helper to avoid circular dependencies
      console.log('PASSWORD RESET DEBUG: Importing sendgrid module...');
      const sendgridModule = await import('./utils/sendgrid');
      console.log('PASSWORD RESET DEBUG: SendGrid module imported successfully');
      console.log('PASSWORD RESET DEBUG: sendPasswordResetEmail function exists:', !!sendgridModule.sendPasswordResetEmail);
      
      try {
        // Send the password reset email
        console.log(`PASSWORD RESET DEBUG: Attempting to send email to: ${email}`);
        
        // Check if the partner invitation function works for comparison
        console.log(`PASSWORD RESET DEBUG: Testing if partner invitation works for comparison...`);
        const inviteTestResult = await sendgridModule.sendPartnerInvitationEmail({
          to: email,
          inviterName: "Test User",
          inviteCode: "test123",
          personalMessage: "This is a test to see if partner invitations work while password resets don't."
        });
        console.log(`PASSWORD RESET DEBUG: Partner invitation test result: ${inviteTestResult ? 'SUCCESS' : 'FAILED'}`);
        
        // Try the actual password reset email
        const emailSent = await sendgridModule.sendPasswordResetEmail(email, token);
        console.log(`PASSWORD RESET DEBUG: Password reset email result: ${emailSent ? 'SUCCESS' : 'FAILED'}`);
        
        return res.status(200).json({ 
          message: "Password reset request processed", 
          debug: {
            emailSent,
            inviteTestResult
          }
        });
      } catch (error) {
        const emailError = error as Error;
        console.error('PASSWORD RESET DEBUG: Email sending error:', emailError);
        return res.status(200).json({ 
          message: "If your email is in our system, you will receive a password reset link shortly",
          debug: { error: emailError.message }
        });
      }
    } catch (error) {
      console.error('Error in forgot-password route:', error);
      console.error("Password reset request error:", error);
      return res.status(500).json({ message: "An error occurred while processing your request" });
    }
  });
  
  // Verify reset token
  app.get("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      return res.status(200).json({ valid: true });
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(500).json({ message: "An error occurred while verifying the token" });
    }
  });
  
  // Reset password with token
  app.post("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "New password is required" });
      }
      
      const success = await storage.resetPassword(token, password);
      
      if (!success) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      return res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      return res.status(500).json({ message: "An error occurred while resetting your password" });
    }
  });
  
  // Change password (for authenticated users)
  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      // Verify current password
      const isCorrect = await comparePasswords(currentPassword, req.user.password);
      if (!isCorrect) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the user's password
      const updatedUser = await storage.updateUser(req.user.id, { password: hashedPassword });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      return res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      return res.status(500).json({ message: "An error occurred while changing your password" });
    }
  });
  
  // Delete account (permanently remove user and all their data)
  app.post("/api/delete-account", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required to delete account" });
      }
      
      // Verify the password first
      const isCorrect = await comparePasswords(password, req.user.password);
      if (!isCorrect) {
        return res.status(400).json({ message: "Password is incorrect" });
      }
      
      // Delete the user account and all associated data
      const deleted = await storage.deleteUser(req.user.id);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete account" });
      }
      
      // Logout the user after successful account deletion
      req.logout((err) => {
        if (err) {
          console.error("Error logging out after account deletion:", err);
          return res.status(500).json({ message: "Account deleted but failed to log out" });
        }
        
        return res.status(200).json({ message: "Account successfully deleted" });
      });
    } catch (error) {
      console.error("Delete account error:", error);
      return res.status(500).json({ message: "An error occurred while deleting your account" });
    }
  });
  
  // Firebase Authentication Integration
  app.post("/api/auth/link-firebase", async (req, res) => {
    // Ensure user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Validate request body
    const linkFirebaseSchema = z.object({
      firebaseUid: z.string().min(1)
    });
    
    try {
      const { firebaseUid } = linkFirebaseSchema.parse(req.body);
      
      // Link the Firebase account to the user
      const updatedUser = await storage.linkFirebaseAccount(req.user.id, firebaseUid);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to link Firebase account" });
      }
      
      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error linking Firebase account:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      
      // Handle case where Firebase UID is already linked to another account
      if (error.message?.includes("already linked")) {
        return res.status(409).json({ message: error.message });
      }
      
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Unlink Firebase account
  app.post("/api/auth/unlink-firebase", async (req, res) => {
    // Ensure user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Unlink the Firebase account from the user
      const updatedUser = await storage.unlinkFirebaseAccount(req.user.id);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to unlink Firebase account" });
      }
      
      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error unlinking Firebase account:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Firebase Authentication Login/Registration
  app.post("/api/auth/firebase", async (req, res) => {
    // Validate request body
    const firebaseAuthSchema = z.object({
      firebaseUid: z.string().min(1),
      email: z.string().email(),
      name: z.string().min(1),
      isNewUser: z.boolean().optional()
    });
    
    try {
      const { firebaseUid, email, name, isNewUser } = firebaseAuthSchema.parse(req.body);
      
      // Check if user exists with this Firebase UID
      let user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (user) {
        // Existing user, log them in
        req.login(user, (err) => {
          if (err) {
            console.error("Error logging in Firebase user:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          return res.status(200).json(user);
        });
      } else {
        // Check if user exists with this email
        user = await storage.getUserByEmail(email);
        
        if (user) {
          // User exists but isn't linked to Firebase yet
          if (isNewUser) {
            // Link the existing account
            try {
              const updatedUser = await storage.linkFirebaseAccount(user.id, firebaseUid);
              
              // Log the user in
              req.login(updatedUser, (err) => {
                if (err) {
                  console.error("Error logging in Firebase user:", err);
                  return res.status(500).json({ message: "Login failed" });
                }
                return res.status(200).json(updatedUser);
              });
            } catch (linkError) {
              console.error("Error linking Firebase account:", linkError);
              return res.status(500).json({ message: "Failed to link account" });
            }
          } else {
            // User exists but hasn't linked their account - tell frontend to prompt for linking
            return res.status(202).json({ 
              message: "User exists but not linked to Firebase",
              user: {
                id: user.id,
                email: user.email,
                name: user.name
              }
            });
          }
        } else {
          // New user, create account with a random password
          const randomPassword = randomBytes(16).toString('hex');
          const hashedPassword = await hashPassword(randomPassword);
          
          try {
            // Create the user first
            const newUser = await storage.createUser({
              name,
              email,
              password: hashedPassword,
              isIndividual: true
            });
            
            // Then link Firebase account
            const userWithFirebase = await storage.linkFirebaseAccount(newUser.id, firebaseUid);
            
            // Log the user in
            req.login(userWithFirebase, (err) => {
              if (err) {
                console.error("Error logging in new Firebase user:", err);
                return res.status(500).json({ message: "User created but login failed" });
              }
              return res.status(201).json(userWithFirebase);
            });
          } catch (createError) {
            console.error("Error creating user from Firebase auth:", createError);
            return res.status(500).json({ message: "Failed to create user" });
          }
        }
      }
    } catch (error) {
      console.error("Error processing Firebase authentication:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upload profile picture
  app.post("/api/profile-picture", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      console.log('Profile picture upload request received');
      
      const fileUploadReq = req as unknown as RequestWithFiles;
      
      // Log what was received in the request
      console.log('Files in request:', fileUploadReq.files ? Object.keys(fileUploadReq.files) : 'No files');
      
      if (!fileUploadReq.files || !fileUploadReq.files.profilePicture) {
        console.error('No profile picture found in request');
        return res.status(400).json({ message: "No profile picture uploaded" });
      }
      
      const fileData = fileUploadReq.files.profilePicture;
      // Handle if multiple files were uploaded
      const file = Array.isArray(fileData) ? fileData[0] : fileData;
      
      console.log('Profile picture info:', {
        name: file.name,
        size: file.size,
        mimetype: file.mimetype,
        hasTempFile: !!file.tempFilePath,
        hasData: !!file.data
      });
      
      // Validate file type (only allow images)
      if (!file.mimetype.startsWith('image/')) {
        console.error('Invalid file type:', file.mimetype);
        return res.status(400).json({ message: "Only image files are allowed" });
      }
      
      // Validate file size
      if (file.size > 5 * 1024 * 1024) { // 5MB
        console.error('File too large:', file.size);
        return res.status(400).json({ message: "File size exceeds 5MB limit" });
      }
      
      console.log('Processing image with saveProfilePicture');
      
      try {
        // Process the image and get paths to all sizes
        const pictureResult = await saveProfilePicture(file);
        
        console.log('Image processed successfully, result:', {
          mainPath: pictureResult.mainPath,
          hasSizes: !!pictureResult.sizes,
          availableSizes: pictureResult.sizes ? Object.keys(pictureResult.sizes) : []
        });
        
        // Update the user's profile picture in the database
        // Use the original for backward compatibility in the profilePicture field
        // Store all sizes in the profilePictureSizes field
        console.log('Updating user with ID:', req.user!.id);
        
        const profilePictureSizes = {
          small: pictureResult.sizes.small,
          medium: pictureResult.sizes.medium,
          large: pictureResult.sizes.large
        };
        
        console.log('Profile picture sizes to save:', profilePictureSizes);
        
        const updatedUser = await storage.updateUser(req.user!.id, { 
          profilePicture: pictureResult.mainPath,
          profilePictureSizes
        });
        
        if (!updatedUser) {
          console.error('Failed to update user after profile picture upload');
          return res.status(500).json({ message: "Failed to update profile picture" });
        }
        
        console.log('User updated successfully');

        // Return the updated user without sensitive information
        const { password, resetToken, resetTokenExpiry, ...safeUserData } = updatedUser;
        
        return res.status(200).json({ 
          message: "Profile picture updated successfully", 
          user: safeUserData
        });
      } catch (processingError) {
        console.error('Error during image processing:', processingError);
        if (processingError instanceof Error) {
          console.error('Error details:', processingError.message);
          console.error('Stack trace:', processingError.stack);
        }
        throw processingError; // Rethrow to be caught by outer catch
      }
    } catch (error) {
      console.error("Profile picture upload error:", error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
      
      return res.status(500).json({ 
        message: "An error occurred while uploading your profile picture",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Invite a partner
  app.post("/api/invite-partner", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { email, message } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Partner email is required" });
    }
    
    try {
      // Generate or retrieve invite code
      let inviteCode = req.user.inviteCode;
      
      // If no invite code exists for the user, generate one
      if (!inviteCode) {
        inviteCode = randomBytes(6).toString('hex');
        await storage.updateUser(req.user.id, { inviteCode });
      }
      
      // Import the sendPartnerInvitationEmail function only when needed
      // to avoid circular dependencies
      const { sendPartnerInvitationEmail } = await import('./utils/sendgrid');
      
      try {
        // Send the invitation email
        const emailSent = await sendPartnerInvitationEmail({
          to: email,
          inviterName: req.user.name,
          inviteCode,
          personalMessage: message
        });
        
        console.log(`Email sending result: ${emailSent ? 'success' : 'failed'}`);
        
        if (emailSent) {
          res.status(200).json({ 
            inviteCode,
            emailSent: true,
            message: `Invitation successfully sent to ${email}`
          });
        } else {
          // The email was not sent, but we have an invite code
          res.status(202).json({ 
            inviteCode,
            emailSent: false,
            message: `The invitation code was generated (${inviteCode}), but the email could not be sent. Please check your SendGrid configuration.`
          });
        }
      } catch (error) {
        const emailError = error as Error;
        console.error('Error sending invitation email:', emailError);
        res.status(202).json({ 
          inviteCode,
          emailSent: false,
          message: `Error sending email: ${emailError.message || 'Unknown error'}. Your invite code is: ${inviteCode}`
        });
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  // Accept a partner invitation
  app.post("/api/accept-invitation", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ message: "Invite code is required" });
    }
    
    try {
      const inviter = await storage.getUserByInviteCode(inviteCode);
      if (!inviter) {
        return res.status(404).json({ message: "Invalid invite code" });
      }
      
      if (inviter.id === req.user.id) {
        return res.status(400).json({ message: "You cannot link with yourself" });
      }
      
      if (inviter.partnerId) {
        return res.status(400).json({ message: "This user is already linked with a partner" });
      }
      
      if (req.user.partnerId) {
        return res.status(400).json({ message: "You are already linked with a partner" });
      }
      
      const success = await storage.linkPartner(inviter.id, req.user.id);
      if (!success) {
        return res.status(500).json({ message: "Failed to link partners" });
      }
      
      const updatedUser = await storage.getUser(req.user.id);
      
      if (updatedUser) {
        const { password, ...userWithoutPassword } = updatedUser;
        res.status(200).json(userWithoutPassword);
      } else {
        res.status(500).json({ message: "Failed to retrieve updated user information" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Disconnect from partner
  app.post("/api/disconnect-partner", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { partnerId: requestedPartnerId } = req.body;
      
      if (!req.user.partnerId) {
        return res.status(400).json({ message: "You are not connected with a partner" });
      }
      
      // Get the partner before disconnecting
      const partnerId = req.user.partnerId;
      
      // Verify the requested partner ID matches the actual partner ID
      if (requestedPartnerId && parseInt(requestedPartnerId) !== partnerId) {
        return res.status(400).json({ message: "Invalid partner ID" });
      }
      
      const partner = await storage.getUser(partnerId);
      
      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }
      
      // Disconnect both users from each other
      const success = await storage.disconnectPartners(req.user.id, partnerId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to disconnect partnership" });
      }
      
      // Get the updated user
      const updatedUser = await storage.getUser(req.user.id);
      
      if (updatedUser) {
        const { password, resetToken, resetTokenExpiry, ...userWithoutPassword } = updatedUser;
        res.status(200).json(userWithoutPassword);
      } else {
        res.status(500).json({ message: "Failed to retrieve updated user information" });
      }
      
      // TODO: In a production app, we would notify the partner here
      // through a notification or email system
      
    } catch (error) {
      console.error("Error disconnecting partnership:", error);
      res.status(500).json({ message: "Failed to disconnect partnership" });
    }
  });

  // Get the current active question for the user
  app.get("/api/active-question", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const referer = req.query.referer as string || 'default';
      let result = await storage.getActiveQuestionForUser(userId);
      
      // If the user doesn't have an active question, or if the request is from question-page 
      // and the user has already answered the current question, assign a new one
      if (!result || (referer === 'question-page' && result && await storage.getResponsesByQuestionAndUser(result.question.id, userId))) {
        // Get all available questions
        const allQuestions = await storage.getQuestions();
        
        if (!allQuestions || allQuestions.length === 0) {
          return res.status(404).json({ message: "No questions available" });
        }
        
        // If we need to assign a new question, first mark the current one as answered if it exists
        if (result) {
          await storage.markActiveQuestionAsAnswered(result.activeQuestion.id);
        }
        
        // Find a question that hasn't been answered before or pick a random one if all have been answered
        let selectedQuestion;
        // This logic keeps track of answered questions to avoid showing them again
        const answeredQuestions = await db
          .select({
            questionId: activeQuestions.questionId
          })
          .from(activeQuestions)
          .where(eq(activeQuestions.userId, userId));
          
        const answeredQuestionIds = answeredQuestions.map(q => q.questionId);
        
        // Filter questions that haven't been answered yet
        const unansweredQuestions = allQuestions.filter(q => !answeredQuestionIds.includes(q.id));
        
        if (unansweredQuestions.length > 0) {
          // Randomly select from unanswered questions
          const randomIndex = Math.floor(Math.random() * unansweredQuestions.length);
          selectedQuestion = unansweredQuestions[randomIndex];
        } else {
          // If all questions have been answered, just pick a random one
          const randomIndex = Math.floor(Math.random() * allQuestions.length);
          selectedQuestion = allQuestions[randomIndex];
        }
        
        // Create an active question
        const activeQuestion = await storage.assignQuestionToUser({
          userId,
          questionId: selectedQuestion.id
        });
        
        result = {
          activeQuestion,
          question: selectedQuestion
        };
      }
      
      // Check if the user or their partner has already answered
      const userResponse = await storage.getResponsesByQuestionAndUser(
        result.question.id,
        userId
      );
      
      const partnerResponse = req.user.partnerId 
        ? await storage.getResponsesByQuestionAndUser(
            result.question.id,
            req.user.partnerId
          ) 
        : null;
      
      // For the home page, we don't want to automatically mark questions as answered
      // We only do that in the question-page view or after submitting a response
      if (userResponse && referer !== 'home-page') {
        await storage.markActiveQuestionAsAnswered(result.activeQuestion.id);
      }
      
      res.status(200).json({
        ...result,
        userHasAnswered: !!userResponse,
        partnerHasAnswered: !!partnerResponse,
        referer
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get active question" });
    }
  });
  
  // Skip the current active question
  app.post("/api/skip-question", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { questionId, skipNote } = req.body;
      
      if (!questionId) {
        return res.status(400).json({ message: "Question ID is required" });
      }
      
      // Get the active question for the user
      const activeQuestion = await storage.getActiveQuestionForUser(req.user.id);
      
      // Validate that it's the current active question
      if (!activeQuestion || activeQuestion.question.id !== questionId) {
        return res.status(400).json({ message: "Invalid question ID" });
      }
      
      // Mark the question as skipped
      await storage.markActiveQuestionAsSkipped(activeQuestion.activeQuestion.id, skipNote);
      
      // Get a new active question
      const allQuestions = await storage.getQuestions();
      
      if (!allQuestions || allQuestions.length === 0) {
        return res.status(404).json({ message: "No questions available" });
      }
      
      // Find questions that have been previously seen (answered or skipped)
      const previouslySeenQuestions = await db
        .select({
          questionId: activeQuestions.questionId,
          isSkipped: activeQuestions.isSkipped,
          isAnswered: activeQuestions.isAnswered
        })
        .from(activeQuestions)
        .where(eq(activeQuestions.userId, req.user.id));
        
      // Get IDs of questions that have been answered or skipped
      const previouslySeenQuestionIds = previouslySeenQuestions.map(q => q.questionId);
      
      // Current question that was just skipped
      const currentSkippedQuestionId = questionId;
      
      // Filter questions that haven't been answered or skipped yet
      // Also exclude the question that was just skipped to ensure we get a different one
      const unseenQuestions = allQuestions.filter(q => 
        !previouslySeenQuestionIds.includes(q.id) && q.id !== currentSkippedQuestionId
      );
      
      let selectedQuestion;
      
      if (unseenQuestions.length > 0) {
        // Randomly select from unseen questions
        const randomIndex = Math.floor(Math.random() * unseenQuestions.length);
        selectedQuestion = unseenQuestions[randomIndex];
      } else {
        // If all questions have been seen, pick a random one that's not the one just skipped
        // Filter out the current skipped question to ensure we get a different one
        const availableQuestions = allQuestions.filter(q => q.id !== currentSkippedQuestionId);
        
        // If somehow we've run out of questions, fall back to all questions
        const questionsPool = availableQuestions.length > 0 ? availableQuestions : allQuestions;
        
        const randomIndex = Math.floor(Math.random() * questionsPool.length);
        selectedQuestion = questionsPool[randomIndex];
      }
      
      // Create a new active question
      const newActiveQuestion = await storage.assignQuestionToUser({
        userId: req.user.id,
        questionId: selectedQuestion.id
      });
      
      // Return the new question
      res.status(200).json({
        activeQuestion: newActiveQuestion,
        question: selectedQuestion,
        userHasAnswered: false,
        partnerHasAnswered: false
      });
    } catch (error) {
      console.error("Error skipping question:", error);
      res.status(500).json({ message: "Failed to skip question" });
    }
  });

  // Submit a response to a question
  app.post("/api/responses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { questionId, content } = req.body;
      
      if (!questionId || !content) {
        return res.status(400).json({ message: "Question ID and response content are required" });
      }
      
      // Check if the question exists
      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Check if the user has already answered this question
      const existingResponse = await storage.getResponsesByQuestionAndUser(
        questionId,
        req.user.id
      );
      
      if (existingResponse) {
        return res.status(400).json({ message: "You have already answered this question" });
      }
      
      // Create the response
      const response = await storage.createResponse({
        userId: req.user.id,
        questionId,
        content
      });
      
      // Mark the active question as answered so it doesn't show up again in the question page
      const activeQuestion = await storage.getActiveQuestionForUser(req.user.id);
      if (activeQuestion && activeQuestion.activeQuestion.questionId === questionId) {
        await storage.markActiveQuestionAsAnswered(activeQuestion.activeQuestion.id);
      }
      
      // Check if a loveslice was created (if both partners have answered)
      const partner = req.user.partnerId 
        ? await storage.getUser(req.user.partnerId) 
        : null;
      
      const partnerResponse = partner 
        ? await storage.getResponsesByQuestionAndUser(questionId, partner.id) 
        : null;
      
      res.status(201).json({
        response,
        lovesliceCreated: !!partnerResponse
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to submit response" });
    }
  });
  
  // Get a specific question by ID
  app.get("/api/questions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const questionId = parseInt(req.params.id);
      const question = await storage.getQuestion(questionId);
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      res.status(200).json(question);
    } catch (error) {
      console.error("Failed to fetch question:", error);
      res.status(500).json({ message: "Failed to fetch question" });
    }
  });

  // Get loveslices for the user
  app.get("/api/loveslices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const loveslices = await storage.getLoveslices(req.user.id);
      
      // Sort by creation date, newest first
      loveslices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.status(200).json(loveslices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch loveslices" });
    }
  });
  
  // Get pending responses (questions user has answered but partner hasn't)
  app.get("/api/pending-responses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // First, get current user's partner ID
      const currentUser = req.user;
      const partnerId = currentUser.partnerId;

      // Collect all pending responses - both from the user and their partner
      const pendingResponses = [];
      
      // 1. Get all questions that the user has answered
      const userAnsweredQuestions = await db
        .select({
          questionId: responses.questionId
        })
        .from(responses)
        .where(eq(responses.userId, currentUser.id));
      
      const userQuestionIds = userAnsweredQuestions.map(q => q.questionId);
      
      // Process user's own pending responses
      for (const qId of userQuestionIds) {
        const userResponse = await storage.getResponsesByQuestionAndUser(qId, currentUser.id);
        const question = await storage.getQuestion(qId);
        
        // Check if a loveslice already exists for this question
        const existingLoveslices = await storage.getLoveslices(currentUser.id);
        const lovesliceExists = existingLoveslices.some(ls => ls.question_id === qId);
        
        // Only add if there's no loveslice yet
        if (userResponse && question && !lovesliceExists) {
          // Get and format the current user information for proper avatar display
          const currentUserData = await storage.getUser(currentUser.id);
          const formattedCurrentUser = storage.formatUserProfilePicture(currentUserData);
          
          console.log(`Pending response: Adding user response with profile picture: ${formattedCurrentUser?.profilePicture}`);
          
          pendingResponses.push({
            question,
            userResponse: {
              ...userResponse,
              user: formattedCurrentUser
            },
            answeredAt: userResponse.createdAt,
            waitingForPartner: true
          });
        }
      }
      
      // 2. If the user has a partner, also get questions that their partner has answered
      if (partnerId) {
        const partnerAnsweredQuestions = await db
          .select({
            questionId: responses.questionId
          })
          .from(responses)
          .where(eq(responses.userId, partnerId));
        
        const partnerQuestionIds = partnerAnsweredQuestions.map(q => q.questionId);
        
        // Process partner's pending responses
        for (const qId of partnerQuestionIds) {
          // Check if the user has already answered this question
          const userResponse = await storage.getResponsesByQuestionAndUser(qId, currentUser.id);
          
          // Only include if the user hasn't answered yet
          if (!userResponse) {
            const partnerResponse = await storage.getResponsesByQuestionAndUser(qId, partnerId);
            const question = await storage.getQuestion(qId);
            
            // Check if a loveslice already exists for this question
            const existingLoveslices = await storage.getLoveslices(currentUser.id);
            const lovesliceExists = existingLoveslices.some(ls => ls.question_id === qId);
            
            // Only add if there's no loveslice yet and the partner has responded
            if (partnerResponse && question && !lovesliceExists) {
              // Get the partner user information for the avatar
              const partnerUserData = await storage.getUser(partnerId);
              // Format the profile picture path properly
              const formattedPartnerUser = storage.formatUserProfilePicture(partnerUserData);
              
              // Log for debugging
              console.log(`Pending response: Adding partner response with profile picture: ${formattedPartnerUser?.profilePicture}`);

              // Include the properly formatted partner user data in the response
              pendingResponses.push({
                question,
                partnerResponse: {
                  ...partnerResponse,
                  user: formattedPartnerUser
                },
                answeredAt: partnerResponse.createdAt,
                waitingForYou: true
              });
            }
          }
        }
      }
      
      // Sort by creation date, newest first
      pendingResponses.sort((a, b) => new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime());
      
      res.status(200).json(pendingResponses);
    } catch (error) {
      console.error("Failed to fetch pending responses:", error);
      res.status(500).json({ message: "Failed to fetch pending responses" });
    }
  });

  // Get a specific loveslice
  app.get("/api/loveslices/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const loveslice = await storage.getLovesliceById(parseInt(req.params.id));
      
      if (!loveslice) {
        return res.status(404).json({ message: "Loveslice not found" });
      }
      
      // Check if the user is part of this loveslice
      const participant1Id = loveslice.responses[0].user.id;
      const participant2Id = loveslice.responses[1].user.id;
      
      const isDirectParticipant = participant1Id === req.user.id || participant2Id === req.user.id;
      
      // If not a direct participant, check if user is a partner of one of the participants
      let isPartnerOfParticipant = false;
      if (!isDirectParticipant && req.user.partnerId) {
        isPartnerOfParticipant = participant1Id === req.user.partnerId || participant2Id === req.user.partnerId;
      }
      
      if (!isDirectParticipant && !isPartnerOfParticipant) {
        return res.status(403).json({ message: "You do not have access to this loveslice" });
      }
      
      res.status(200).json(loveslice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch loveslice" });
    }
  });

  // Update a loveslice's private note
  app.patch("/api/loveslices/:id/note", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { note } = req.body;
      const lovesliceId = parseInt(req.params.id);
      
      // Get the loveslice to check ownership
      const loveslice = await storage.getLovesliceById(lovesliceId);
      
      if (!loveslice) {
        return res.status(404).json({ message: "Loveslice not found" });
      }
      
      // Check if the user is part of this loveslice
      const participant1Id = loveslice.responses[0].user.id;
      const participant2Id = loveslice.responses[1].user.id;
      
      const isDirectParticipant = participant1Id === req.user.id || participant2Id === req.user.id;
      
      // If not a direct participant, check if user is a partner of one of the participants
      let isPartnerOfParticipant = false;
      if (!isDirectParticipant && req.user.partnerId) {
        isPartnerOfParticipant = participant1Id === req.user.partnerId || participant2Id === req.user.partnerId;
      }
      
      if (!isDirectParticipant && !isPartnerOfParticipant) {
        return res.status(403).json({ message: "You do not have access to this loveslice" });
      }
      
      // Update the note
      const updatedLoveslice = await storage.updateLovesliceNote(lovesliceId, note);
      
      res.status(200).json({ success: true, privateNote: note });
    } catch (error) {
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  // Get conversation starters
  app.get("/api/conversation-starters", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { theme, category } = req.query;
      let starters: Awaited<ReturnType<typeof storage.getConversationStartersByTheme>> = [];
      
      // Allow 'theme' for backwards compatibility, but also support 'category'
      const categoryValue = (category || theme) as string;
      
      if (categoryValue && typeof categoryValue === 'string') {
        // Get starters for a specific category/theme
        starters = await storage.getConversationStartersByTheme(categoryValue);
      } else {
        // Get all categories from the dynamic list in the database
        const categoriesResult = await storage.getThemes();
        const categories = categoriesResult.themes.map(t => t.name);
        
        // Get starters from all categories
        for (const categoryItem of categories) {
          const categoryStarters = await storage.getConversationStartersByTheme(categoryItem);
          starters = [...starters, ...categoryStarters];
        }
      }
      
      // Sort starters by creation date (newest first)
      starters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.status(200).json(starters);
    } catch (error) {
      console.error("Failed to fetch conversation starters:", error);
      res.status(500).json({ message: "Failed to fetch conversation starters" });
    }
  });
  
  // Get all available themes
  app.get("/api/themes", async (req, res) => {
    try {
      // Get themes from the database
      const themes = await storage.getThemes();
      res.status(200).json(themes);
    } catch (error) {
      console.error("Failed to fetch themes:", error);
      res.status(500).json({ message: "Failed to fetch themes" });
    }
  });

  // Get a random conversation starter by category/theme
  app.get("/api/conversation-starters/random", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Accept either 'theme' or 'category' param for backwards compatibility
      const { theme, category } = req.query;
      const categoryValue = (category || theme) as string;
      const categoryParam = typeof categoryValue === 'string' ? categoryValue : undefined;
      
      const starter = await storage.getRandomConversationStarter(categoryParam);
      
      if (!starter) {
        return res.status(404).json({ message: "No conversation starters found" });
      }
      
      res.status(200).json(starter);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation starter" });
    }
  });
  
  // Create a conversation starter
  app.post("/api/conversation-starters", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Accept either 'theme' or 'category' for backwards compatibility
      const { content, theme, category, baseQuestionId, lovesliceId } = req.body;
      const categoryValue = category || theme;
      
      if (!content || !categoryValue) {
        return res.status(400).json({ message: "Content and category are required" });
      }
      
      // Use the unified starter creation approach
      const starter = await storage.createUnifiedStarter(
        content,
        categoryValue,
        true, // User-generated
        req.user.id // Created by current user
      );
      
      // Record user activity
      await storage.recordUserActivity(req.user.id, 'create_starter');
      
      res.status(201).json(starter);
    } catch (error) {
      res.status(500).json({ message: "Failed to create conversation starter" });
    }
  });
  
  // Get user activity stats (streak and garden health)
  app.get("/api/user-activity/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const streak = await storage.getCurrentStreak(req.user.id);
      const gardenHealth = await storage.getGardenHealth(req.user.id);
      
      res.status(200).json({ streak, gardenHealth });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity stats" });
    }
  });
  
  // Get user activity history
  app.get("/api/user-activity/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Default to last 30 days if not specified
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      
      const activities = await storage.getUserActivity(req.user.id, fromDate, toDate);
      
      res.status(200).json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity history" });
    }
  });
  
  // Record a user activity (manually trigger activity recording)
  app.post("/api/user-activity", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { actionType } = req.body;
      
      if (!actionType) {
        return res.status(400).json({ message: "Action type is required" });
      }
      
      const activity = await storage.recordUserActivity(req.user.id, actionType);
      
      res.status(201).json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to record activity" });
    }
  });

  // ==============================================
  // NEW API ENDPOINTS FOR CONVERSATIONS
  // ==============================================
  
  // Get all conversations for the user
  app.get("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversations = await storage.getConversationsByUserId(req.user.id);
      res.status(200).json(conversations);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get a specific conversation
  app.get("/api/conversations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversationById(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user is part of this conversation
      if (conversation.initiatedByUserId !== req.user.id && 
          (!req.user.partnerId || conversation.initiatedByUserId !== req.user.partnerId)) {
        return res.status(403).json({ message: "You do not have access to this conversation" });
      }
      
      // Get messages for this conversation
      const messages = await storage.getConversationMessages(conversationId);
      
      // Fetch user information for each message to include profile pictures
      const enhancedMessages = await Promise.all(messages.map(async (message) => {
        // Get the user for this message
        const messageUser = await storage.getUser(message.userId);
        if (messageUser) {
          // Only return necessary fields to avoid sending sensitive information
          return {
            ...message,
            user: {
              id: messageUser.id,
              name: messageUser.name,
              profilePicture: messageUser.profilePicture // Will be used directly, don't add /uploads/ prefix
            }
          };
        }
        return message;
      }));
      
      res.status(200).json({
        ...conversation,
        messages: enhancedMessages
      });
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // Start a new conversation
  app.post("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { lovesliceId, starterId } = req.body;
      
      if (!lovesliceId && !starterId) {
        return res.status(400).json({ message: "Either lovesliceId or starterId is required" });
      }
      
      // If lovesliceId is provided, check if user has access to it
      if (lovesliceId) {
        const loveslice = await storage.getLovesliceById(lovesliceId);
        if (!loveslice) {
          return res.status(404).json({ message: "Loveslice not found" });
        }
        
        const participant1Id = loveslice.responses[0].user.id;
        const participant2Id = loveslice.responses[1].user.id;
        
        const isDirectParticipant = participant1Id === req.user.id || participant2Id === req.user.id;
        
        // If not a direct participant, check if user is a partner of one of the participants
        let isPartnerOfParticipant = false;
        if (!isDirectParticipant && req.user.partnerId) {
          isPartnerOfParticipant = participant1Id === req.user.partnerId || participant2Id === req.user.partnerId;
        }
        
        if (!isDirectParticipant && !isPartnerOfParticipant) {
          return res.status(403).json({ message: "You do not have access to this loveslice" });
        }
        
        // Update loveslice to mark that a conversation was started from it
        await storage.updateLovesliceHasStartedConversation(lovesliceId, true);
      }
      
      // If starterId is provided, check if it exists and mark it as used
      if (starterId) {
        const starter = await storage.getConversationStarterById(starterId);
        if (!starter) {
          return res.status(404).json({ message: "Conversation starter not found" });
        }
        
        // Mark the conversation starter as used
        await storage.markConversationStarterAsUsed(starterId);
      }
      
      // Create the conversation
      const conversation = await storage.createConversation({
        lovesliceId: lovesliceId || null,
        starterId: starterId || null,
        initiatedByUserId: req.user.id,
      });
      
      // Record user activity
      await storage.recordUserActivity(req.user.id, 'start_conversation');
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Initiate conversation ending (for shared ending flow)
  app.patch("/api/conversations/:id/initiate-end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversationId = parseInt(req.params.id);
      
      // Get the conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      if (conversation.initiatedByUserId !== req.user.id && 
          (!req.user.partnerId || conversation.initiatedByUserId !== req.user.partnerId)) {
        return res.status(403).json({ message: "You do not have access to this conversation" });
      }
      
      // If a conversation is already ended, don't allow ending to be initiated
      if (conversation.endedAt) {
        return res.status(400).json({ message: "This conversation has already ended" });
      }
      
      // If ending is already initiated by this user, just return the conversation
      if (conversation.endInitiatedByUserId === req.user.id) {
        return res.status(200).json(conversation);
      }
      
      // Initiate ending
      const updatedConversation = await storage.initiateConversationEnding(conversationId, req.user.id);
      res.status(200).json(updatedConversation);
    } catch (error) {
      console.error("Failed to initiate conversation ending:", error);
      res.status(500).json({ message: "Failed to initiate conversation ending" });
    }
  });
  
  // Confirm conversation ending (when partner agrees to end)
  app.patch("/api/conversations/:id/confirm-end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversationId = parseInt(req.params.id);
      const { finalNote } = req.body;
      
      // Get the conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      if (conversation.initiatedByUserId !== req.user.id && 
          (!req.user.partnerId || conversation.initiatedByUserId !== req.user.partnerId)) {
        return res.status(403).json({ message: "You do not have access to this conversation" });
      }
      
      // If a conversation is already ended, don't allow it to be confirmed again
      if (conversation.endedAt) {
        return res.status(400).json({ message: "This conversation has already ended" });
      }
      
      // Check if an end has been initiated
      if (!conversation.endInitiatedByUserId) {
        return res.status(400).json({ message: "Conversation ending has not been initiated" });
      }
      
      // Don't let the same user who initiated also confirm
      if (conversation.endInitiatedByUserId === req.user.id) {
        return res.status(400).json({ message: "You already initiated the ending, waiting for partner confirmation" });
      }
      
      // Add final note if provided
      if (finalNote) {
        await storage.addConversationFinalNote(conversationId, finalNote);
      }
      
      // Confirm ending
      const updatedConversation = await storage.confirmConversationEnding(conversationId, req.user.id);
      res.status(200).json(updatedConversation);
    } catch (error) {
      console.error("Failed to confirm conversation ending:", error);
      res.status(500).json({ message: "Failed to confirm conversation ending" });
    }
  });
  
  // Cancel conversation ending (if either user changes their mind)
  app.patch("/api/conversations/:id/cancel-end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversationId = parseInt(req.params.id);
      
      // Get the conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      if (conversation.initiatedByUserId !== req.user.id && 
          (!req.user.partnerId || conversation.initiatedByUserId !== req.user.partnerId)) {
        return res.status(403).json({ message: "You do not have access to this conversation" });
      }
      
      // If a conversation is already ended, don't allow cancellation
      if (conversation.endedAt) {
        return res.status(400).json({ message: "This conversation has already ended" });
      }
      
      // Cancel ending
      const updatedConversation = await storage.cancelConversationEnding(conversationId);
      res.status(200).json(updatedConversation);
    } catch (error) {
      console.error("Failed to cancel conversation ending:", error);
      res.status(500).json({ message: "Failed to cancel conversation ending" });
    }
  });
  
  // End a conversation and optionally create a spoken loveslice (legacy direct ending)
  // Add final note to a conversation
  app.patch("/api/conversations/:id/final-note", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversationId = parseInt(req.params.id);
      const { note } = req.body;
      
      if (!note) {
        return res.status(400).json({ message: "Note is required" });
      }
      
      // Get the conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      if (conversation.initiatedByUserId !== req.user.id && 
          (!req.user.partnerId || conversation.initiatedByUserId !== req.user.partnerId)) {
        return res.status(403).json({ message: "You do not have access to this conversation" });
      }
      
      // Add final note
      const updatedConversation = await storage.addConversationFinalNote(conversationId, note);
      res.status(200).json(updatedConversation);
    } catch (error) {
      console.error("Failed to add final note:", error);
      res.status(500).json({ message: "Failed to add final note" });
    }
  });
  
  app.patch("/api/conversations/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversationId = parseInt(req.params.id);
      const { outcome, createSpokenLoveslice, theme, continueOffline } = req.body;
      
      // Validate outcome
      const validOutcomes = conversationOutcomeEnum.enumValues;
      if (!outcome || !validOutcomes.includes(outcome)) {
        return res.status(400).json({ 
          message: `Outcome is required and must be one of: ${validOutcomes.join(', ')}` 
        });
      }
      
      // Get the conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      if (conversation.initiatedByUserId !== req.user.id && 
          (!req.user.partnerId || conversation.initiatedByUserId !== req.user.partnerId)) {
        return res.status(403).json({ message: "You do not have access to this conversation" });
      }
      
      // If a conversation is already ended, don't allow it to be ended again
      if (conversation.endedAt) {
        return res.status(400).json({ message: "This conversation has already ended" });
      }
      
      // Calculate duration
      const now = new Date();
      const durationSeconds = Math.floor((now.getTime() - new Date(conversation.startedAt).getTime()) / 1000);
      
      // Update the conversation
      const updatedConversation = await storage.updateConversationOutcome(
        conversationId, 
        outcome, 
        durationSeconds
      );
      
      // If user wants to create a spoken loveslice or continue conversation offline
      let spokenLoveslice = null;
      // Only create a loveslice if the user has a partner (except for testing where we bypass this check)
      if ((createSpokenLoveslice || continueOffline)) {
        // We need a theme for the spoken loveslice
        if (!theme) {
          return res.status(400).json({ message: "Theme is required to create a spoken loveslice" });
        }
        
        // If continuing offline, add a message in the conversation noting this
        if (continueOffline) {
          await storage.createConversationMessage({
            conversationId,
            userId: req.user.id,
            content: "🌱 This conversation will continue in person. It has been saved as a Spoken Loveslice."
          });
        }
        
        // Create the spoken loveslice
        // For testing, if user doesn't have a partner, we can use their own ID
        const partnerId = req.user.partnerId || req.user.id;
        
        spokenLoveslice = await storage.createSpokenLoveslice({
          conversationId,
          user1Id: req.user.id,
          user2Id: partnerId,
          outcome,
          theme,
          durationSeconds,
          continuedOffline: !!continueOffline
        });
        
        // Mark the conversation as having created a spoken loveslice
        await storage.updateConversationCreatedSpokenLoveslice(conversationId, true);
        
        // Record user activity
        await storage.recordUserActivity(req.user.id, 'create_spoken_loveslice');
      }
      
      res.status(200).json({
        conversation: updatedConversation,
        spokenLoveslice
      });
    } catch (error) {
      console.error("Failed to end conversation:", error);
      res.status(500).json({ message: "Failed to end conversation" });
    }
  });

  // Add a message to a conversation
  app.post("/api/conversations/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      // Get the conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      if (conversation.initiatedByUserId !== req.user.id && 
          (!req.user.partnerId || conversation.initiatedByUserId !== req.user.partnerId)) {
        return res.status(403).json({ message: "You do not have access to this conversation" });
      }
      
      // Check if conversation has ended
      if (conversation.endedAt) {
        return res.status(400).json({ message: "Cannot add message to an ended conversation" });
      }
      
      // Create the message
      const message = await storage.createConversationMessage({
        conversationId,
        userId: req.user.id,
        content
      });
      
      // Record user activity
      await storage.recordUserActivity(req.user.id, 'send_message');
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Failed to create message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });
  
  // ==============================================
  // NEW API ENDPOINTS FOR JOURNAL ENTRIES
  // ==============================================
  
  // Get all journal entries for the user
  app.get("/api/journal", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { theme, search } = req.query;
      let entries;
      
      if (search && typeof search === 'string') {
        // Search journal entries
        entries = await storage.searchJournalEntries(req.user.id, search);
      } else if (theme && typeof theme === 'string') {
        // Get entries by theme
        entries = await storage.getJournalEntriesByTheme(req.user.id, theme);
      } else {
        // Get all entries
        entries = await storage.getJournalEntriesByUserId(req.user.id);
      }
      
      // Sort entries by creation date, newest first
      entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Sanitize user data in journal entries
      const sanitizedEntries = entries.map(entry => {
        // For entries with user data
        if (entry.user) {
          const { password, email, resetToken, resetTokenExpiry, ...safeUserData } = entry.user;
          entry.user = safeUserData;
          
          // Format profile picture if present
          if (entry.user.profilePicture) {
            entry.user.profilePicture = entry.user.profilePicture.startsWith('/') 
              ? entry.user.profilePicture 
              : `/uploads/profile_pictures/${entry.user.profilePicture}`;
          }
        }
        
        // For entries with partner data
        if (entry.partner) {
          const { password, email, resetToken, resetTokenExpiry, ...safePartnerData } = entry.partner;
          entry.partner = safePartnerData;
          
          // Format partner profile picture if present
          if (entry.partner.profilePicture) {
            entry.partner.profilePicture = entry.partner.profilePicture.startsWith('/') 
              ? entry.partner.profilePicture 
              : `/uploads/profile_pictures/${entry.partner.profilePicture}`;
          }
        }
        
        return entry;
      });
      
      res.status(200).json(sanitizedEntries);
    } catch (error) {
      console.error("Failed to fetch journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });
  
  // Create a new journal entry
  app.post("/api/journal", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { writtenLovesliceId, spokenLovesliceId, theme, searchableContent } = req.body;
      
      if (!theme || !searchableContent) {
        return res.status(400).json({ message: "Theme and searchableContent are required" });
      }
      
      if (!writtenLovesliceId && !spokenLovesliceId) {
        return res.status(400).json({ message: "Either writtenLovesliceId or spokenLovesliceId is required" });
      }
      
      // Check if the user has a partner
      if (!req.user.partnerId) {
        return res.status(400).json({ message: "You need a partner to create journal entries" });
      }
      
      // Create the journal entry
      const entry = await storage.createJournalEntry({
        user1Id: req.user.id,
        user2Id: req.user.partnerId,
        writtenLovesliceId: writtenLovesliceId || null,
        spokenLovesliceId: spokenLovesliceId || null,
        theme,
        searchableContent
      });
      
      // Record user activity
      await storage.recordUserActivity(req.user.id, 'create_journal_entry');
      
      res.status(201).json(entry);
    } catch (error) {
      console.error("Failed to create journal entry:", error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });
  
  // ==============================================
  // NEW API ENDPOINTS FOR SPOKEN LOVESLICES
  // ==============================================
  
  // Get all spoken loveslices for the user
  app.get("/api/spoken-loveslices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const spokenLoveslices = await storage.getSpokenLoveslicesByUserId(req.user.id);
      
      // Sort by creation date, newest first
      spokenLoveslices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Sanitize user data in spoken loveslices
      const sanitizedLoveslices = spokenLoveslices.map(loveslice => {
        // If there's user1 data, sanitize it
        if (loveslice.user1) {
          const { password, email, resetToken, resetTokenExpiry, ...safeUser1Data } = loveslice.user1;
          loveslice.user1 = safeUser1Data;
          
          // Format profile picture if present
          if (loveslice.user1.profilePicture) {
            loveslice.user1.profilePicture = loveslice.user1.profilePicture.startsWith('/') 
              ? loveslice.user1.profilePicture 
              : `/uploads/profile_pictures/${loveslice.user1.profilePicture}`;
          }
        }
        
        // If there's user2 data, sanitize it
        if (loveslice.user2) {
          const { password, email, resetToken, resetTokenExpiry, ...safeUser2Data } = loveslice.user2;
          loveslice.user2 = safeUser2Data;
          
          // Format profile picture if present
          if (loveslice.user2.profilePicture) {
            loveslice.user2.profilePicture = loveslice.user2.profilePicture.startsWith('/') 
              ? loveslice.user2.profilePicture 
              : `/uploads/profile_pictures/${loveslice.user2.profilePicture}`;
          }
        }
        
        return loveslice;
      });
      
      res.status(200).json(sanitizedLoveslices);
    } catch (error) {
      console.error("Failed to fetch spoken loveslices:", error);
      res.status(500).json({ message: "Failed to fetch spoken loveslices" });
    }
  });
  
  // Get a specific spoken loveslice
  app.get("/api/spoken-loveslices/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const spokenLovesliceId = parseInt(req.params.id);
      const spokenLoveslice = await storage.getSpokenLovesliceById(spokenLovesliceId);
      
      if (!spokenLoveslice) {
        return res.status(404).json({ message: "Spoken loveslice not found" });
      }
      
      // Check if the user is part of this spoken loveslice or is a partner of someone in the loveslice
      const isDirectParticipant = spokenLoveslice.user1Id === req.user.id || spokenLoveslice.user2Id === req.user.id;
      
      // If not a direct participant, check if user is a partner of one of the participants
      let isPartnerOfParticipant = false;
      if (!isDirectParticipant && req.user.partnerId) {
        isPartnerOfParticipant = 
          spokenLoveslice.user1Id === req.user.partnerId || 
          spokenLoveslice.user2Id === req.user.partnerId;
      }
      
      if (!isDirectParticipant && !isPartnerOfParticipant) {
        return res.status(403).json({ message: "You do not have access to this spoken loveslice" });
      }
      
      // Sanitize user data in the spoken loveslice
      if (spokenLoveslice.user1) {
        const { password, email, resetToken, resetTokenExpiry, ...safeUser1Data } = spokenLoveslice.user1;
        spokenLoveslice.user1 = safeUser1Data;
        
        // Format profile picture if present
        if (spokenLoveslice.user1.profilePicture) {
          spokenLoveslice.user1.profilePicture = spokenLoveslice.user1.profilePicture.startsWith('/') 
            ? spokenLoveslice.user1.profilePicture 
            : `/uploads/profile_pictures/${spokenLoveslice.user1.profilePicture}`;
        }
      }
      
      if (spokenLoveslice.user2) {
        const { password, email, resetToken, resetTokenExpiry, ...safeUser2Data } = spokenLoveslice.user2;
        spokenLoveslice.user2 = safeUser2Data;
        
        // Format profile picture if present
        if (spokenLoveslice.user2.profilePicture) {
          spokenLoveslice.user2.profilePicture = spokenLoveslice.user2.profilePicture.startsWith('/') 
            ? spokenLoveslice.user2.profilePicture 
            : `/uploads/profile_pictures/${spokenLoveslice.user2.profilePicture}`;
        }
      }
      
      // Get the associated conversation if it exists
      let conversation = null;
      if (spokenLoveslice.conversationId) {
        conversation = await storage.getConversationById(spokenLoveslice.conversationId);
        
        // Get messages for this conversation if it exists
        if (conversation) {
          const messages = await storage.getConversationMessages(spokenLoveslice.conversationId);
          
          // Fetch user information for each message to include profile pictures
          const enhancedMessages = await Promise.all(messages.map(async (message) => {
            // Get the user for this message
            const messageUser = await storage.getUser(message.userId);
            if (messageUser) {
              // Only return necessary fields to avoid sending sensitive information
              return {
                ...message,
                user: {
                  id: messageUser.id,
                  name: messageUser.name,
                  // Format profile picture if present
                  profilePicture: messageUser.profilePicture && !messageUser.profilePicture.startsWith('/')
                    ? `/uploads/profile_pictures/${messageUser.profilePicture}`
                    : messageUser.profilePicture
                }
              };
            }
            return message;
          }));
          
          conversation = { ...conversation, messages: enhancedMessages };
        }
      }
      
      res.status(200).json({
        ...spokenLoveslice,
        conversation
      });
    } catch (error) {
      console.error("Failed to fetch spoken loveslice:", error);
      res.status(500).json({ message: "Failed to fetch spoken loveslice" });
    }
  });
  
  // Mark a conversation starter as meaningful (after a good conversation)
  app.patch("/api/conversation-starters/:id/mark-meaningful", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const starterId = parseInt(req.params.id);
      
      const updatedStarter = await storage.markConversationStarterAsMeaningful(starterId);
      
      if (!updatedStarter) {
        return res.status(404).json({ message: "Conversation starter not found" });
      }
      
      // Record user activity
      await storage.recordUserActivity(req.user.id, 'mark_starter_meaningful');
      
      res.status(200).json(updatedStarter);
    } catch (error) {
      console.error("Failed to mark conversation starter as meaningful:", error);
      res.status(500).json({ message: "Failed to mark conversation starter as meaningful" });
    }
  });

  // Create the HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Map to store user connections
  const userConnections = new Map<number, WebSocket>();
  
  wss.on('connection', function connection(ws) {
    // Initial connection state
    let userId: number | null = null;
    
    ws.on('message', async function incoming(message) {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication message to identify user
        if (data.type === 'auth') {
          userId = data.userId;
          console.log(`User ${userId} connected to WebSocket`);
          // Ensure userId is a number before using it as a key
          if (typeof userId === 'number') {
            userConnections.set(userId, ws);
          }
        }
        
        // Handle conversation ending initiation
        else if (data.type === 'initiate_ending' && userId) {
          const { conversationId, partnerId, userName } = data;
          
          if (partnerId && userConnections.has(partnerId)) {
            const partnerWs = userConnections.get(partnerId);
            if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
              partnerWs.send(JSON.stringify({
                type: 'ending_requested',
                conversationId,
                requestedBy: {
                  id: userId,
                  name: userName
                }
              }));
              console.log(`Sent ending request notification to user ${partnerId}`);
            }
          }
        }
        
        // Handle conversation ending confirmation
        else if (data.type === 'confirm_ending' && userId) {
          const { conversationId, partnerId } = data;
          
          if (partnerId && userConnections.has(partnerId)) {
            const partnerWs = userConnections.get(partnerId);
            if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
              partnerWs.send(JSON.stringify({
                type: 'ending_confirmed',
                conversationId
              }));
              console.log(`Sent ending confirmation to user ${partnerId}`);
            }
          }
        }
        
        // Handle conversation ending cancellation
        else if (data.type === 'cancel_ending' && userId) {
          const { conversationId, partnerId } = data;
          
          if (partnerId && userConnections.has(partnerId)) {
            const partnerWs = userConnections.get(partnerId);
            if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
              partnerWs.send(JSON.stringify({
                type: 'ending_cancelled',
                conversationId
              }));
              console.log(`Sent ending cancellation to user ${partnerId}`);
            }
          }
        }
        
        // Handle adding final note
        else if (data.type === 'add_final_note' && userId) {
          const { conversationId, partnerId, note } = data;
          
          if (partnerId && userConnections.has(partnerId)) {
            const partnerWs = userConnections.get(partnerId);
            if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
              partnerWs.send(JSON.stringify({
                type: 'final_note_added',
                conversationId,
                note
              }));
              console.log(`Sent final note update to user ${partnerId}`);
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', function() {
      if (userId) {
        console.log(`User ${userId} disconnected from WebSocket`);
        userConnections.delete(userId);
      }
    });
  });
  
  // Debug route to check if profile pictures are accessible
  app.get("/api/debug/profile-pictures", async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const uploadsDir = path.join(process.cwd(), 'uploads', 'profile_pictures');
      const files = fs.readdirSync(uploadsDir);
      
      const results = files.map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          absolutePath: filePath,
          urlPath: `/uploads/profile_pictures/${file}`,
          exists: fs.existsSync(filePath)
        };
      });
      
      res.json({
        workingDirectory: process.cwd(),
        uploadsDirectory: uploadsDir,
        files: results
      });
    } catch (error) {
      console.error("Error checking profile pictures:", error);
      res.status(500).json({ error: "Failed to check profile pictures" });
    }
  });

  return httpServer;
}
