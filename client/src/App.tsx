import React, { lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { FirebaseAuthProvider } from "./hooks/use-firebase-auth";

// Eagerly load critical authentication-related components
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import HomePage from "@/pages/home-page";

// Lazy load other components (loaded on demand)
const ProfilePage = lazy(() => import("@/pages/profile-page"));
const JournalPage = lazy(() => import("@/pages/journal-page"));
const QuestionPage = lazy(() => import("@/pages/question-page"));
const RevealPage = lazy(() => import("@/pages/reveal-page"));
const InvitePartnerPage = lazy(() => import("@/pages/invite-partner-page"));
const StartersPage = lazy(() => import("@/pages/starters-page"));
const ConversationPage = lazy(() => import("@/pages/conversation-page"));
const SpokenLoveslicePage = lazy(() => import("@/pages/spoken-loveslice-page"));
const AdminPage = lazy(() => import("@/pages/admin-page"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-sage" />
  </div>
);

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        {/* Critical routes that are eagerly loaded */}
        <Route path="/auth" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password/:token" component={ResetPasswordPage} />
        <ProtectedRoute path="/" component={HomePage} />
        
        {/* Lazy-loaded routes */}
        <ProtectedRoute path="/garden" component={JournalPage} /> {/* Redirecting garden to journal page */}
        <ProtectedRoute path="/question" component={QuestionPage} />
        <ProtectedRoute path="/question/:id" component={QuestionPage} />
        <ProtectedRoute path="/reveal/:id" component={RevealPage} />
        <ProtectedRoute path="/invite" component={InvitePartnerPage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <Route path="/conversation-starters" component={() => {
          const [_, navigate] = useLocation();
          React.useEffect(() => {
            navigate("/starters");
          }, []);
          return null;
        }} />
        <ProtectedRoute path="/starters" component={StartersPage} />
        <ProtectedRoute path="/conversation/:id" component={ConversationPage} />
        <ProtectedRoute path="/spoken-loveslice/:id" component={SpokenLoveslicePage} />
        <ProtectedRoute path="/journal" component={JournalPage} />
        <ProtectedRoute path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

/**
 * Preload critical components that are likely to be used soon after initial load
 * This function triggers the dynamic imports to start loading in the background
 */
function preloadCriticalComponents() {
  // Preload components that are likely to be accessed from the home page
  const preloadComponents = () => {
    // Start loading the profile page component in the background
    import("@/pages/profile-page");
    // Start loading the journal page component in the background
    import("@/pages/journal-page");
  };
  
  // If requestIdleCallback is available, use it to preload during idle time
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(preloadComponents, { timeout: 2000 });
  } else {
    // Fallback to setTimeout for browsers that don't support requestIdleCallback
    setTimeout(preloadComponents, 2000);
  }
}

function App() {
  // Trigger preloading of critical components
  React.useEffect(() => {
    preloadCriticalComponents();
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseAuthProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </FirebaseAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
