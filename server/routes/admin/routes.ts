/**
 * Admin Routes
 * Handles all administration-related endpoints
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { storage } from '../../storage';
import { 
  requireAdmin, 
  requireSuperAdmin, 
  logAdminAction 
} from '../../middleware/adminAuth';
import { z } from 'zod';
import { userRoleEnum, User } from '@shared/schema';

export const adminRoutes = Router();

/**
 * Session debug endpoint for troubleshooting
 * Does not require admin authentication
 */
adminRoutes.get('/api/admin/session-debug', (req: Request, res: Response) => {
  console.log('====== ADMIN SESSION DEBUG REQUEST ======');
  console.log('Session exists:', !!req.session);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('isAuthenticated():', req.isAuthenticated());
  console.log('req.user:', req.user ? `ID: ${req.user.id}, Role: ${req.user.role}` : 'Not available');
  console.log('Headers:', {
    cookie: req.headers.cookie?.substring(0, 50) + '...',
    'user-agent': req.headers['user-agent'],
  });
  console.log('============================');
  
  return res.status(200).json({
    sessionExists: !!req.session,
    sessionID: req.sessionID,
    sessionData: {
      userId: req.session?.userId,
      cookie: req.session?.cookie ? {
        originalMaxAge: req.session.cookie.originalMaxAge,
        expires: req.session.cookie.expires,
        secure: req.session.cookie.secure,
        httpOnly: req.session.cookie.httpOnly,
      } : null,
    },
    isAuthenticated: req.isAuthenticated(),
    user: req.user ? {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    } : null,
    hasCookieHeader: !!req.headers.cookie,
  });
});

/**
 * Authentication check for admin panel access
 */
adminRoutes.get('/api/admin/auth-check', requireAdmin, (req: Request, res: Response) => {
  return res.status(200).json({
    authorized: true,
    user: {
      id: req.user?.id,
      name: req.user?.name,
      email: req.user?.email,
      role: req.user?.role,
      lastAdminLogin: req.user?.lastAdminLogin
    }
  });
});

/**
 * Get all users (admin access)
 */
adminRoutes.get('/api/admin/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await storage.getAllUsers();
    
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      isIndividual: user.isIndividual,
      partnerId: user.partnerId,
      role: user.role,
      lastAdminLogin: user.lastAdminLogin,
      firebaseUid: user.firebaseUid ? '[connected]' : null,
      profilePicture: user.profilePicture ? true : false
    }));
    
    return res.status(200).json(sanitizedUsers);
  } catch (err) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Get specific user by ID (admin access)
 */
adminRoutes.get('/api/admin/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Sanitize sensitive fields before returning
    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      isIndividual: user.isIndividual,
      partnerId: user.partnerId,
      role: user.role,
      lastAdminLogin: user.lastAdminLogin,
      firebaseUid: user.firebaseUid ? '[connected]' : null,
      profilePicture: user.profilePicture ? true : false
    };
    
    return res.status(200).json(sanitizedUser);
  } catch (err) {
    console.error('Error fetching user:', err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * Update user (admin access)
 */
adminRoutes.patch('/api/admin/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Validate update data
    const updateSchema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      role: z.enum(['user', 'admin', 'superadmin']).optional(),
    });
    
    const updateData = updateSchema.parse(req.body);
    
    // Super admin check for role changes
    if (updateData.role && req.user?.role !== 'superadmin') {
      return res.status(403).json({ 
        error: 'Only super administrators can change user roles' 
      });
    }
    
    // Prevent downgrading your own admin role
    if (updateData.role && userId === req.user?.id && updateData.role !== req.user.role) {
      return res.status(403).json({ 
        error: 'You cannot change your own admin role' 
      });
    }
    
    const updatedUser = await storage.updateUser(userId, updateData);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Log the admin action
    logAdminAction(req, 'update', 'user', userId, { 
      fields: Object.keys(updateData) 
    });
    
    // Sanitize before returning
    const sanitizedUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isIndividual: updatedUser.isIndividual,
      partnerId: updatedUser.partnerId,
      lastAdminLogin: updatedUser.lastAdminLogin,
      firebaseUid: updatedUser.firebaseUid ? '[connected]' : null,
      profilePicture: updatedUser.profilePicture ? true : false
    };
    
    return res.status(200).json(sanitizedUser);
  } catch (err) {
    console.error('Error updating user:', err);
    
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid user data', details: err.errors });
    }
    
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * Admin password reset for a user (admin access)
 */
adminRoutes.post('/api/admin/users/:id/reset-password', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Validate password data
    const passwordSchema = z.object({
      newPassword: z.string().min(8)
    });
    
    const { newPassword } = passwordSchema.parse(req.body);
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    const updatedUser = await storage.updateUser(userId, { 
      password: hashedPassword 
    });
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Log the admin action
    logAdminAction(req, 'reset-password', 'user', userId);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Password reset successful' 
    });
  } catch (err) {
    console.error('Error resetting user password:', err);
    
    if (err instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid password data', 
        details: err.errors 
      });
    }
    
    return res.status(500).json({ error: 'Failed to reset user password' });
  }
});

/**
 * Delete user (superadmin access)
 */
adminRoutes.delete('/api/admin/users/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Prevent deleting your own account
    if (userId === req.user?.id) {
      return res.status(403).json({ 
        error: 'You cannot delete your own account' 
      });
    }
    
    const deleted = await storage.deleteUser(userId);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Log the admin action
    logAdminAction(req, 'delete', 'user', userId);
    
    return res.status(200).json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * Admin logs (admin access)
 */
adminRoutes.get('/api/admin/logs', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Parse date filters if provided
    let fromDate: Date | undefined = undefined;
    let toDate: Date | undefined = undefined;
    
    if (req.query.fromDate) {
      try {
        fromDate = new Date(req.query.fromDate as string);
        // Validate date
        if (isNaN(fromDate.getTime())) {
          fromDate = undefined;
          console.warn('Invalid fromDate parameter:', req.query.fromDate);
        }
      } catch (e) {
        console.warn('Error parsing fromDate:', e);
      }
    }
    
    if (req.query.toDate) {
      try {
        toDate = new Date(req.query.toDate as string);
        // Validate date
        if (isNaN(toDate.getTime())) {
          toDate = undefined;
          console.warn('Invalid toDate parameter:', req.query.toDate);
        }
      } catch (e) {
        console.warn('Error parsing toDate:', e);
      }
    }
    
    // Convert page/limit to offset/limit for the database
    const offset = (page - 1) * limit;
    
    // Parse admin filter if provided
    let adminId: number | undefined = undefined;
    if (req.query.adminId) {
      adminId = parseInt(req.query.adminId as string);
      if (isNaN(adminId)) {
        adminId = undefined;
      }
    }
    
    const logs = await storage.getAdminLogs(offset, limit, adminId, fromDate, toDate);
    
    return res.status(200).json(logs);
  } catch (err) {
    console.error('Error fetching admin logs:', err);
    return res.status(500).json({ error: 'Failed to fetch admin logs' });
  }
});

/**
 * Get all conversation starters (admin access)
 */
adminRoutes.get('/api/admin/conversation-starters', requireAdmin, async (req: Request, res: Response) => {
  try {
    const starters = await storage.getAllConversationStarters();
    return res.status(200).json(starters);
  } catch (err) {
    console.error('Error fetching conversation starters:', err);
    return res.status(500).json({ error: 'Failed to fetch conversation starters' });
  }
});

/**
 * Create new conversation starter (admin access)
 */
adminRoutes.post('/api/admin/conversation-starters', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Validate starter data
    const starterSchema = z.object({
      content: z.string().min(1),
      category: z.string().min(1),
      isActive: z.boolean().optional()
    });
    
    const starterData = starterSchema.parse(req.body);
    
    // Use the unified starter creation method
    const newStarter = await storage.createUnifiedStarter(
      starterData.content,
      starterData.category,
      false, // Not user-generated (admin created)
      req.user?.id // Current admin as creator
    );
    
    // Log the admin action
    logAdminAction(req, 'create', 'conversation-starter', newStarter.id, {
      category: starterData.category
    });
    
    return res.status(201).json(newStarter);
  } catch (err) {
    console.error('Error creating conversation starter:', err);
    
    if (err instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid starter data', 
        details: err.errors 
      });
    }
    
    return res.status(500).json({ error: 'Failed to create conversation starter' });
  }
});

/**
 * Update conversation starter (admin access)
 */
adminRoutes.patch('/api/admin/conversation-starters/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const starterId = parseInt(req.params.id);
    if (isNaN(starterId)) {
      return res.status(400).json({ error: 'Invalid starter ID' });
    }
    
    // Validate update data
    const updateSchema = z.object({
      content: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      isActive: z.boolean().optional()
    });
    
    const updateData = updateSchema.parse(req.body);
    
    // TODO: Implement proper update for starter+question together
    // For now, use existing method
    const updatedStarter = await storage.updateConversationStarter(starterId, updateData);
    if (!updatedStarter) {
      return res.status(404).json({ error: 'Conversation starter not found' });
    }
    
    // Log the admin action
    logAdminAction(req, 'update', 'conversation-starter', starterId, { 
      fields: Object.keys(updateData) 
    });
    
    return res.status(200).json(updatedStarter);
  } catch (err) {
    console.error('Error updating conversation starter:', err);
    
    if (err instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid starter data', 
        details: err.errors 
      });
    }
    
    return res.status(500).json({ error: 'Failed to update conversation starter' });
  }
});

/**
 * Delete conversation starter (admin access)
 */
adminRoutes.delete('/api/admin/conversation-starters/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const starterId = parseInt(req.params.id);
    if (isNaN(starterId)) {
      return res.status(400).json({ error: 'Invalid starter ID' });
    }
    
    const deleted = await storage.deleteConversationStarter(starterId);
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation starter not found' });
    }
    
    // Log the admin action
    logAdminAction(req, 'delete', 'conversation-starter', starterId);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Conversation starter deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting conversation starter:', err);
    return res.status(500).json({ error: 'Failed to delete conversation starter' });
  }
});

/**
 * Get all question categories (admin access)
 */
adminRoutes.get('/api/admin/themes', requireAdmin, async (req: Request, res: Response) => {
  try {
    // For backward compatibility, we still call this endpoint "/themes"
    // but it now returns categories from the unified question system
    const categories = await storage.getThemes();
    return res.status(200).json(categories);
  } catch (err) {
    console.error('Error fetching question categories:', err);
    return res.status(500).json({ error: 'Failed to fetch question categories' });
  }
});

/**
 * Dashboard statistics for admins
 */
adminRoutes.get('/api/admin/dashboard', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log("======== ADMIN DASHBOARD REQUEST ========");
    console.log("User authenticated:", req.isAuthenticated());
    console.log("User ID:", req.user?.id);
    console.log("User role:", req.user?.role);
    console.log("Session ID:", req.sessionID);
    console.log("Session userId:", req.session?.userId);
    console.log("Cookies:", req.headers.cookie?.substring(0, 50) + "...");
    console.log("=====================================");
    
    // Get basic stats
    console.log("[Admin Dashboard] Fetching userCount");
    const userCount = await storage.getUserCount();
    console.log("[Admin Dashboard] Fetching partnershipCount");
    const partnershipCount = await storage.getPartnershipCount();
    console.log("[Admin Dashboard] Fetching activeUserCount");
    const activeUserCount = await storage.getActiveUserCount();
    console.log("[Admin Dashboard] Fetching recentJournalCount");
    const recentJournalCount = await storage.getRecentJournalEntryCount();
    
    console.log("[Admin Dashboard] All stats fetched successfully");
    
    return res.status(200).json({
      userCount,
      partnershipCount,
      activeUserCount,
      recentJournalCount,
      timestamp: new Date().toISOString(),
      debug: {
        requestTime: new Date().toISOString(),
        userId: req.user?.id,
        role: req.user?.role
      }
    });
  } catch (err) {
    console.error('Error fetching admin dashboard stats:', err);
    return res.status(500).json({ 
      error: 'Failed to fetch dashboard statistics',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      debug: {
        sessionExists: !!req.session,
        userAuthenticated: req.isAuthenticated(),
        userId: req.user?.id,
        userRole: req.user?.role,
        sessionUserId: req.session?.userId
      }
    });
  }
});