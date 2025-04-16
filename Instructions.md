# Admin Functionality Fix Plan

## Issue Summary
- All sections of the admin panel (except Starters) display the error message: "Error loading dashboard data - Please try again later or contact the system administrator."
- The API routes for admin functionality are returning 401 Unauthorized errors.
- Based on the logs, there appears to be an authentication issue with the admin session: `[Admin Auth] No session or userId in session`

## Root Cause Analysis
1. **Session Authentication Issue**:
   - The admin panel routes are protected by the `requireAdmin` middleware.
   - This middleware checks for a valid session and user with admin role.
   - The logs show that the session doesn't contain a userId, which suggests a session management problem.

2. **Admin Session Flow**:
   - When a user logs in, a session is created with their userId stored in the session.
   - The admin routes require this userId to be present in the session and the user to have admin privileges.
   - The client is correctly sending API requests with credentials included.

## Fix Implementation Plan

### 1. Update Session Management for Admin Routes
- Ensure that the session cookie is correctly set and transmitted.
- Check the session configuration in auth.ts to verify the cookie settings.
- Verify that the session store is properly initialized.

### 2. Improve Auth Error Handling and Logging
- Add better error logging for the session middleware to diagnose the issue.
- Implement session debug endpoints for development environment.

### 3. Update Client-Side Auth Handling
- Add a dedicated admin auth check endpoint to verify admin status.
- Implement an auth check before loading admin components.
- Add proper redirect logic when admin auth fails.

### 4. Fix Session Cookie Configuration
- Review the session cookie configuration, especially regarding:
  - `secure` flag (should match the protocol - false for HTTP, true for HTTPS)
  - `sameSite` setting
  - `domain` configuration
  - Expiration time

### 5. Verify Admin Role Assignment
- Create a script to ensure the current user has the proper admin role in the database.
- Add a UI component to display current user role for debugging purposes.

### Implementation Steps

1. First, check the database to verify the user's admin role is correctly set.
2. Update session configuration in auth.ts to ensure proper session handling.
3. Update the adminAuth.ts middleware with additional debugging.
4. Implement a dedicated admin auth check route that returns detailed status info.
5. Update client-side admin components to handle authentication errors more gracefully.
6. Add a specific admin login procedure if needed.

### Testing Plan

1. Test all admin routes after each change to verify which fixes resolve the issue.
2. Verify session persistence across page reloads.
3. Check console logs for any session-related errors.
4. Confirm proper authorization for different user roles (regular user, admin, superadmin).
