import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { User } from '@shared/schema';
import { Session, SessionData } from 'express-session';

// Extend Express Request type to add user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Extend the Session interface
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

/**
 * Middleware to verify admin permissions
 * Checks if user is authenticated and has admin or superadmin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Use Passport's isAuthenticated method to check if user is logged in
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHENTICATED'
    });
  }

  // Check if user has admin or superadmin role
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ 
      error: 'Access denied. Admin privileges required.', 
      code: 'UNAUTHORIZED' 
    });
  }
  
  // Update last admin login
  storage.updateUser(req.user.id, { lastAdminLogin: new Date() })
    .catch((err: Error) => console.error('Failed to update last admin login:', err));
  
  next();
}

/**
 * Middleware to verify superadmin permissions
 * Checks if user is authenticated and has superadmin role
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  // Use Passport's isAuthenticated method to check if user is logged in
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHENTICATED'
    });
  }

  // Check if user has superadmin role
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ 
      error: 'Access denied. Super admin privileges required.', 
      code: 'UNAUTHORIZED' 
    });
  }
  
  // Update last admin login
  storage.updateUser(req.user.id, { lastAdminLogin: new Date() })
    .catch((err: Error) => console.error('Failed to update last admin login:', err));
  
  next();
}

/**
 * Helper to log admin actions
 */
export function logAdminAction(req: Request, action: string, entityType: string, entityId?: number, details?: any) {
  if (!req.user?.id) return;
  
  try {
    storage.createAdminLog({
      adminId: req.user.id,
      action,
      entityType,
      entityId,
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || 'unknown',
    }).catch((err: Error) => console.error('Failed to log admin action:', err));
  } catch (err: unknown) {
    console.error('Error logging admin action:', err);
  }
}