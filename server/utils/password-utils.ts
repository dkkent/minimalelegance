import zxcvbn from 'zxcvbn';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Score needed to pass validation (0-4, with 4 being strongest)
const MIN_PASSWORD_SCORE = 2;

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  minScore: MIN_PASSWORD_SCORE
};

// Export the password hashing function for reuse in other parts of the app
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Export the password comparison function for reuse in other parts of the app
export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Validates password strength using zxcvbn library
 * Returns an object with validation result and feedback
 */
export function validatePasswordStrength(password: string, userInputs: string[] = []): {
  isValid: boolean;
  score: number; // 0-4 with 4 being strongest
  feedback: {
    warning: string;
    suggestions: string[];
  }
} {
  if (!password || password.length < PASSWORD_REQUIREMENTS.minLength) {
    return {
      isValid: false,
      score: 0,
      feedback: {
        warning: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`,
        suggestions: ["Use a longer password"]
      }
    };
  }

  // zxcvbn result includes:
  // - score: 0-4 (0 = too guessable, 4 = very unguessable)
  // - feedback: {warning: string, suggestions: string[]}
  const result = zxcvbn(password, userInputs);
  
  return {
    isValid: result.score >= PASSWORD_REQUIREMENTS.minScore,
    score: result.score,
    feedback: result.feedback
  };
}

/**
 * Returns a description of password strength based on zxcvbn score
 */
export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0: return "Very weak";
    case 1: return "Weak";
    case 2: return "Fair";
    case 3: return "Good";
    case 4: return "Strong";
    default: return "Unknown";
  }
}