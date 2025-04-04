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
import ConversationStartersPage from "@/pages/conversation-starters-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/garden" component={GardenPage} />
      <ProtectedRoute path="/question" component={QuestionPage} />
      <ProtectedRoute path="/reveal/:id" component={RevealPage} />
      <ProtectedRoute path="/invite" component={InvitePartnerPage} />
      <ProtectedRoute path="/conversation-starters" component={ConversationStartersPage} />
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
