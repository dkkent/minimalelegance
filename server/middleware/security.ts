import { Express, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

/**
 * Apply security best practices to the Express application
 */
export function setupSecurityMiddleware(app: Express) {
  // Use Helmet middleware for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com']
      }
    },
    // Allow iframe embedding since this is a development environment
    // For production, you would want to set this to true
    frameguard: false
  }));

  // General rate limiter for all requests
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  });
  app.use(generalLimiter);

  // Specific rate limiter for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    skipSuccessfulRequests: true // Don't count successful requests
  });

  // Apply rate limiting to auth-related endpoints
  app.use('/api/login', authLimiter);
  app.use('/api/register', authLimiter);
  app.use('/api/forgot-password', authLimiter);
  app.use('/api/reset-password', authLimiter);

  // Specific rate limiter for password change endpoint
  const passwordChangeLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password changes per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many password change attempts, please try again after an hour',
    skipSuccessfulRequests: true
  });
  app.use('/api/change-password', passwordChangeLimiter);

  // Add security middleware to prevent common vulnerabilities
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Set secure cookie policy
    res.cookie('cookieName', 'cookieValue', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    // Set additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    next();
  });
}