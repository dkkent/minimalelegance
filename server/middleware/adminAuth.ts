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
  const userId = req.session.userId;
  
  if (!userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHENTICATED'
    });
  }

  storage.getUser(userId)
    .then(user => {
      if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
        return res.status(403).json({ 
          error: 'Access denied. Admin privileges required.', 
          code: 'UNAUTHORIZED' 
        });
      }
      
      // Add user to request for later use
      req.user = user;
      
      // Update last admin login
      storage.updateUser(userId, { lastAdminLogin: new Date() })
        .catch((err: Error) => console.error('Failed to update last admin login:', err));
      
      next();
    })
    .catch((err: Error) => {
      console.error('Admin auth middleware error:', err);
      res.status(500).json({ 
        error: 'Internal server error during authorization check', 
        code: 'SERVER_ERROR' 
      });
    });
}

/**
 * Middleware to verify superadmin permissions
 * Checks if user is authenticated and has superadmin role
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  
  if (!userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHENTICATED'
    });
  }

  storage.getUser(userId)
    .then(user => {
      if (!user || user.role !== 'superadmin') {
        return res.status(403).json({ 
          error: 'Access denied. Super admin privileges required.', 
          code: 'UNAUTHORIZED' 
        });
      }
      
      // Add user to request for later use
      req.user = user;
      
      // Update last admin login
      storage.updateUser(userId, { lastAdminLogin: new Date() })
        .catch((err: Error) => console.error('Failed to update last admin login:', err));
      
      next();
    })
    .catch((err: Error) => {
      console.error('SuperAdmin auth middleware error:', err);
      res.status(500).json({ 
        error: 'Internal server error during authorization check', 
        code: 'SERVER_ERROR' 
      });
    });
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