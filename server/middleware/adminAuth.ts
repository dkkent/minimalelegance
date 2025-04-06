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
  // Enhanced logging for session debugging
  console.log('====== ADMIN AUTH DEBUG ======');
  console.log('Session exists:', !!req.session);
  console.log('Session ID:', req.sessionID);
  console.log('userId in session:', req.session?.userId);
  console.log('isAuthenticated():', req.isAuthenticated());
  console.log('req.user exists:', !!req.user);
  if (req.user) {
    console.log('User ID:', req.user.id, 'Role:', req.user.role);
  }
  console.log('Headers:', {
    cookie: req.headers.cookie?.substring(0, 50) + '...',
    'user-agent': req.headers['user-agent'],
  });
  console.log('============================');

  // Check if the request has cookies at all
  if (!req.headers.cookie) {
    console.error('[Admin Auth] No cookies present in the request');
    return res.status(401).json({ 
      error: 'No session cookies found',
      code: 'UNAUTHENTICATED',
      debug: { 
        noSessionCookie: true,
        sessionExists: !!req.session,
        isAuthenticated: req.isAuthenticated()
      }
    });
  }
  
  // First check if the session exists and has a userId
  if (!req.session || !req.session.userId) {
    console.log('[Admin Auth] No session or userId in session');
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHENTICATED',
      debug: {
        sessionExists: !!req.session,
        isAuthenticated: req.isAuthenticated(),
        hasSessionCookie: !!req.headers.cookie,
        sessionID: req.sessionID || null
      }
    });
  }

  // If req.user doesn't exist yet (passport might have failed to deserialize)
  // we'll try to get the user from storage directly
  const processRequest = async () => {
    let user = req.user;
    
    // If user is not available in req.user, try to get it from storage
    if (!user) {
      console.log('[Admin Auth] User not in req.user, fetching from storage using session userId:', req.session.userId);
      
      // Try to get the user from the database
      try {
        // Need to handle when userId is undefined
        if (typeof req.session.userId === 'number') {
          user = await storage.getUser(req.session.userId);
        } else {
          console.error('[Admin Auth] Session userId is not a number:', req.session.userId);
          return res.status(401).json({
            error: 'Invalid session data',
            code: 'UNAUTHENTICATED',
            debug: { sessionUserIdType: typeof req.session.userId }
          });
        }
      } catch (fetchError) {
        console.error('[Admin Auth] Error fetching user from storage:', fetchError);
        return res.status(500).json({
          error: 'Error retrieving user data',
          code: 'SERVER_ERROR'
        });
      }
      
      if (!user) {
        console.log('[Admin Auth] User not found in storage');
        return res.status(401).json({ 
          error: 'Authentication failed - user not found',
          code: 'UNAUTHENTICATED',
          debug: { sessionUserId: req.session.userId }
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
        code: 'UNAUTHORIZED',
        debug: { userRole: user.role }
      });
    }
    
    // Update last admin login
    try {
      await storage.updateUser(user.id, { lastAdminLogin: new Date() });
    } catch (updateError) {
      // Just log the error, don't fail the request
      console.error('[Admin Auth] Failed to update last admin login:', updateError);
    }
    
    next();
  };
  
  // Process the request and handle any errors
  processRequest().catch(err => {
    console.error('[Admin Auth] Error in requireAdmin middleware:', err);
    res.status(500).json({ 
      error: 'Authentication error', 
      code: 'SERVER_ERROR',
      debug: { message: err instanceof Error ? err.message : String(err) }
    });
  });
}

/**
 * Middleware to verify superadmin permissions
 * Checks if user is authenticated and has superadmin role
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  // Enhanced logging for session debugging
  console.log('====== SUPERADMIN AUTH DEBUG ======');
  console.log('Session exists:', !!req.session);
  console.log('Session ID:', req.sessionID);
  console.log('userId in session:', req.session?.userId);
  console.log('isAuthenticated():', req.isAuthenticated());
  console.log('req.user exists:', !!req.user);
  if (req.user) {
    console.log('User ID:', req.user.id, 'Role:', req.user.role);
  }
  console.log('Headers:', {
    cookie: req.headers.cookie?.substring(0, 50) + '...',
    'user-agent': req.headers['user-agent'],
  });
  console.log('============================');

  // Check if the request has cookies at all
  if (!req.headers.cookie) {
    console.error('[SuperAdmin Auth] No cookies present in the request');
    return res.status(401).json({ 
      error: 'No session cookies found',
      code: 'UNAUTHENTICATED',
      debug: { 
        noSessionCookie: true,
        sessionExists: !!req.session,
        isAuthenticated: req.isAuthenticated()
      }
    });
  }
  
  // First check if the session exists and has a userId
  if (!req.session || !req.session.userId) {
    console.log('[SuperAdmin Auth] No session or userId in session');
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHENTICATED',
      debug: {
        sessionExists: !!req.session,
        isAuthenticated: req.isAuthenticated(),
        hasSessionCookie: !!req.headers.cookie,
        sessionID: req.sessionID || null
      }
    });
  }

  // If req.user doesn't exist yet (passport might have failed to deserialize)
  // we'll try to get the user from storage directly
  const processRequest = async () => {
    let user = req.user;
    
    // If user is not available in req.user, try to get it from storage
    if (!user) {
      console.log('[SuperAdmin Auth] User not in req.user, fetching from storage using session userId:', req.session.userId);
      
      // Try to get the user from the database
      try {
        // Need to handle when userId is undefined
        if (typeof req.session.userId === 'number') {
          user = await storage.getUser(req.session.userId);
        } else {
          console.error('[SuperAdmin Auth] Session userId is not a number:', req.session.userId);
          return res.status(401).json({
            error: 'Invalid session data',
            code: 'UNAUTHENTICATED',
            debug: { sessionUserIdType: typeof req.session.userId }
          });
        }
      } catch (fetchError) {
        console.error('[SuperAdmin Auth] Error fetching user from storage:', fetchError);
        return res.status(500).json({
          error: 'Error retrieving user data',
          code: 'SERVER_ERROR'
        });
      }
      
      if (!user) {
        console.log('[SuperAdmin Auth] User not found in storage');
        return res.status(401).json({ 
          error: 'Authentication failed - user not found',
          code: 'UNAUTHENTICATED',
          debug: { sessionUserId: req.session.userId }
        });
      }
      
      // Attach the user to the request
      req.user = user;
    }
    
    // Now check the role
    if (user.role !== 'superadmin') {
      console.log('[SuperAdmin Auth] User does not have superadmin role:', user.role);
      return res.status(403).json({ 
        error: 'Access denied. Super admin privileges required.', 
        code: 'UNAUTHORIZED',
        debug: { userRole: user.role }
      });
    }
    
    // Update last admin login
    try {
      await storage.updateUser(user.id, { lastAdminLogin: new Date() });
    } catch (updateError) {
      // Just log the error, don't fail the request
      console.error('[SuperAdmin Auth] Failed to update last admin login:', updateError);
    }
    
    next();
  };
  
  // Process the request and handle any errors
  processRequest().catch(err => {
    console.error('[SuperAdmin Auth] Error in requireSuperAdmin middleware:', err);
    res.status(500).json({ 
      error: 'Authentication error', 
      code: 'SERVER_ERROR',
      debug: { message: err instanceof Error ? err.message : String(err) }
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