import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import GardenPage from "@/pages/garden-page";
import QuestionPage from "@/pages/question-page";
import RevealPage from "@/pages/reveal-page";
import InvitePartnerPage from "@/pages/invite-partner-page";
import ProfilePage from "@/pages/profile-page";
import ConversationStartersPage from "@/pages/conversation-starters-page";
import ConversationPage from "@/pages/conversation-page";
import SpokenLoveslicePage from "@/pages/spoken-loveslice-page";
import JournalPage from "@/pages/journal-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/garden" component={JournalPage} /> {/* Redirecting garden to journal page */}
      <ProtectedRoute path="/question" component={QuestionPage} />
      <ProtectedRoute path="/question/:id" component={QuestionPage} />
      <ProtectedRoute path="/reveal/:id" component={RevealPage} />
      <ProtectedRoute path="/invite" component={InvitePartnerPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/conversation-starters" component={ConversationStartersPage} />
      <ProtectedRoute path="/conversation/:id" component={ConversationPage} />
      <ProtectedRoute path="/spoken-loveslice/:id" component={SpokenLoveslicePage} />
      <ProtectedRoute path="/journal" component={JournalPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
