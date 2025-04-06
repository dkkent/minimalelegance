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
  // First check if the session exists and has a userId
  if (!req.session || !req.session.userId) {
    console.log('[Admin Auth] No session or userId in session');
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHENTICATED'
    });
  }

  // If req.user doesn't exist yet (passport might have failed to deserialize)
  // we'll try to get the user from storage directly
  const processRequest = async () => {
    let user = req.user;
    
    // If user is not available in req.user, try to get it from storage
    if (!user) {
      console.log('[Admin Auth] User not in req.user, fetching from storage using session userId:', req.session.userId);
      user = await storage.getUser(req.session.userId);
      
      if (!user) {
        console.log('[Admin Auth] User not found in storage');
        return res.status(401).json({ 
          error: 'Authentication failed - user not found',
          code: 'UNAUTHENTICATED'
        });
      }
      
      // Attach the user to the request
      req.user = user;
    }
    
    // Now check the role
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      console.log('[Admin Auth] User does not have admin role:', user.role);
      return res.status(403).json({ 
        error: 'Access denied. Admin privileges required.', 
        code: 'UNAUTHORIZED' 
      });
    }
    
    // Update last admin login
    storage.updateUser(user.id, { lastAdminLogin: new Date() })
      .catch((err: Error) => console.error('Failed to update last admin login:', err));
    
    next();
  };
  
  // Process the request and handle any errors
  processRequest().catch(err => {
    console.error('[Admin Auth] Error in requireAdmin middleware:', err);
    res.status(500).json({ 
      error: 'Authentication error', 
      code: 'SERVER_ERROR' 
    });
  });
}

/**
 * Middleware to verify superadmin permissions
 * Checks if user is authenticated and has superadmin role
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  // First check if the session exists and has a userId
  if (!req.session || !req.session.userId) {
    console.log('[Admin Auth] No session or userId in session');
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHENTICATED'
    });
  }

  // If req.user doesn't exist yet (passport might have failed to deserialize)
  // we'll try to get the user from storage directly
  const processRequest = async () => {
    let user = req.user;
    
    // If user is not available in req.user, try to get it from storage
    if (!user) {
      console.log('[Admin Auth] User not in req.user, fetching from storage using session userId:', req.session.userId);
      user = await storage.getUser(req.session.userId);
      
      if (!user) {
        console.log('[Admin Auth] User not found in storage');
        return res.status(401).json({ 
          error: 'Authentication failed - user not found',
          code: 'UNAUTHENTICATED'
        });
      }
      
      // Attach the user to the request
      req.user = user;
    }
    
    // Now check the role
    if (user.role !== 'superadmin') {
      console.log('[Admin Auth] User does not have superadmin role:', user.role);
      return res.status(403).json({ 
        error: 'Access denied. Super admin privileges required.', 
        code: 'UNAUTHORIZED' 
      });
    }
    
    // Update last admin login
    storage.updateUser(user.id, { lastAdminLogin: new Date() })
      .catch((err: Error) => console.error('Failed to update last admin login:', err));
    
    next();
  };
  
  // Process the request and handle any errors
  processRequest().catch(err => {
    console.error('[Admin Auth] Error in requireSuperAdmin middleware:', err);
    res.status(500).json({ 
      error: 'Authentication error', 
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