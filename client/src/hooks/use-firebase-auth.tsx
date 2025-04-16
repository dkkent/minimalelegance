import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  OAuthProvider,
  FacebookAuthProvider,
  UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FirebaseConfigurationHelp } from "@/components/firebase-configuration-help";

interface FirebaseAuthContextType {
  currentUser: FirebaseUser | null;
  isLoading: boolean;
  error: Error | null;
  signInWithGoogle: () => Promise<UserCredential | null>;
  signInWithApple: () => Promise<UserCredential | null>;
  signInWithMeta: () => Promise<UserCredential | null>;
  firebaseLogout: () => Promise<void>;
  linkUserAccount: (firebaseUid: string) => Promise<User | null>;
}

export const FirebaseAuthContext = createContext<FirebaseAuthContextType | null>(null);

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  
  // Helper function to handle Firebase auth errors
  const handleFirebaseError = (error: any, provider: string) => {
    console.error(`${provider} sign-in error:`, error);
    setError(error as Error);
    
    // Check for specific Firebase errors
    const firebaseError = error as { code?: string };
    if (firebaseError.code === "auth/configuration-not-found") {
      toast({
        title: "Authentication provider not enabled",
        description: `${provider} sign-in is not currently configured. Please try another method.`,
        variant: "destructive",
      });
    } else if (firebaseError.code === "auth/unauthorized-domain") {
      // Set a localStorage flag to indicate this error
      localStorage.setItem('firebase_unauthorized_domain', 'true');
      setShowConfigHelp(true);
      toast({
        title: "Domain not authorized",
        description: "This domain is not authorized in your Firebase project. See the configuration guide for help.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sign in failed",
        description: error instanceof Error ? error.message : `Failed to sign in with ${provider}`,
        variant: "destructive",
      });
    }
  };

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    }, (error) => {
      setError(error as Error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function handleFirebaseAuthentication(userCredential: UserCredential): Promise<User | null> {
    const user = userCredential.user;
    
    try {
      // Exchange Firebase token for session authentication
      // Use type assertion to handle additionalUserInfo which might not be in the type definition
      const authResult = userCredential as any;
      const isNewUser = authResult.additionalUserInfo?.isNewUser ?? false;
      
      const response = await apiRequest("POST", "/api/auth/firebase", {
        firebaseUid: user.uid,
        email: user.email || "",
        name: user.displayName || user.email?.split("@")[0] || "User",
        isNewUser
      });
      
      if (response.status === 200 || response.status === 201) {
        // Successfully authenticated/registered
        const userData = await response.json();
        // Update query cache with the user data
        queryClient.setQueryData(["/api/user"], userData);
        return userData;
      } else if (response.status === 202) {
        // Account exists but needs linking
        const { message, user: existingUser } = await response.json();
        toast({
          title: "Account found",
          description: "Please log in to link your accounts",
          variant: "default",
        });
        return null;
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error) {
      console.error("Firebase auth error:", error);
      toast({
        title: "Authentication error",
        description: error instanceof Error ? error.message : "Failed to authenticate with Firebase",
        variant: "destructive",
      });
      return null;
    }
  }

  async function signInWithGoogle(): Promise<UserCredential | null> {
    try {
      setIsLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handleFirebaseAuthentication(result);
      return result;
    } catch (error) {
      handleFirebaseError(error, "Google");
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithApple(): Promise<UserCredential | null> {
    try {
      setIsLoading(true);
      setError(null);
      const provider = new OAuthProvider("apple.com");
      const result = await signInWithPopup(auth, provider);
      await handleFirebaseAuthentication(result);
      return result;
    } catch (error) {
      handleFirebaseError(error, "Apple");
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithMeta(): Promise<UserCredential | null> {
    try {
      setIsLoading(true);
      setError(null);
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handleFirebaseAuthentication(result);
      return result;
    } catch (error) {
      handleFirebaseError(error, "Facebook");
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function firebaseLogout(): Promise<void> {
    try {
      setIsLoading(true);
      await signOut(auth);
      // We don't logout the user from the session here
      // That should be done through the regular logout process
    } catch (error) {
      handleFirebaseError(error, "Logout");
    } finally {
      setIsLoading(false);
    }
  }

  // This error handler is different since it's not a Firebase auth error
  const handleAccountLinkingError = (error: any) => {
    console.error("Account linking error:", error);
    setError(error as Error);
    toast({
      title: "Account linking failed",
      description: error instanceof Error ? error.message : "Failed to link your accounts",
      variant: "destructive",
    });
  };
  
  async function linkUserAccount(firebaseUid: string): Promise<User | null> {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest("POST", "/api/auth/link-firebase", {
        firebaseUid
      });
      
      if (response.status === 200) {
        const userData = await response.json();
        // Update query cache with the user data
        queryClient.setQueryData(["/api/user"], userData);
        toast({
          title: "Success",
          description: "Your accounts have been linked successfully",
          variant: "default",
        });
        return userData;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to link account");
      }
    } catch (error) {
      handleAccountLinkingError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <FirebaseAuthContext.Provider
      value={{
        currentUser,
        isLoading,
        error,
        signInWithGoogle,
        signInWithApple,
        signInWithMeta,
        firebaseLogout,
        linkUserAccount,
      }}
    >
      <FirebaseConfigurationHelp 
        open={showConfigHelp} 
        onClose={() => setShowConfigHelp(false)} 
      />
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error("useFirebaseAuth must be used within a FirebaseAuthProvider");
  }
  return context;
}