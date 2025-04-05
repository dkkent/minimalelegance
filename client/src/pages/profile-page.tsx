import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { MainLayout } from "@/components/layouts/main-layout";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle2 } from "lucide-react";
import { ChangePasswordForm } from "@/components/change-password-form";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";

export default function ProfilePage() {
  const { user } = useAuth();
  const { currentUser, firebaseLogout } = useFirebaseAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [inviteCode, setInviteCode] = useState("");
  const [isUnlinking, setIsUnlinking] = useState(false);
  
  const acceptInvitationMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/accept-invitation", { inviteCode: code });
      return await res.json();
    },
    onSuccess: (updatedUser: User) => {
      // Update the user data in the cache
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      toast({
        title: "Partnership established!",
        description: "You've successfully connected with your partner.",
      });
      
      // Clear the invite code input
      setInviteCode("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleAcceptInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast({
        title: "Invitation code required",
        description: "Please enter the invitation code you received.",
        variant: "destructive",
      });
      return;
    }
    
    acceptInvitationMutation.mutate(inviteCode);
  };
  
  // Mutation for unlinking Firebase account
  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/unlink-firebase");
      return await res.json();
    },
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      // Also sign out from Firebase
      if (currentUser) {
        firebaseLogout();
      }
      
      toast({
        title: "Account unlinked",
        description: "Your Google account has been unlinked successfully.",
      });
      
      setIsUnlinking(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unlink account",
        description: error.message,
        variant: "destructive",
      });
      setIsUnlinking(false);
    }
  });
  
  const handleUnlinkAccount = () => {
    setIsUnlinking(true);
    unlinkMutation.mutate();
  };
  
  if (!user) return null;
  
  return (
    <MainLayout>
      <div className="container max-w-4xl py-10 mx-auto">
        <div className="mb-10">
          <h2 className="font-serif text-3xl mb-2">Your Profile</h2>
          <p className="text-gray-600">Manage your account and partnership settings</p>
        </div>
        
        <div className="grid gap-6">
          <HandDrawnBorder>
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Your personal account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <div className="font-medium">{user.name}</div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="font-medium">{user.email}</div>
                </div>
              </CardContent>
            </Card>
          </HandDrawnBorder>
          
          <HandDrawnBorder>
            <Card>
              <CardHeader>
                <CardTitle>Partnership Status</CardTitle>
                <CardDescription>
                  {user.partnerId 
                    ? "You are connected with a partner" 
                    : "You're not connected with a partner yet"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user.partnerId ? (
                  <div className="bg-sage-light/30 p-4 rounded-md border border-sage-light">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-sage-light text-sage-dark px-3 py-1 text-xs rounded-full font-medium">
                        Connected
                      </div>
                    </div>
                    <div className="font-medium mb-2">
                      You are now connected with your partner!
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      You can now see each other's responses and loveslices in your shared garden.
                      Together you'll cultivate your relationship through meaningful conversations and 
                      shared reflections.
                    </p>
                    <div className="flex items-center justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/journal')}
                        className="text-sage hover:text-sage-dark"
                      >
                        Visit your shared garden
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-md">
                      <p>
                        Connect with your partner to start growing your relationship garden together.
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <form onSubmit={handleAcceptInvitation} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="inviteCode">Enter invitation code</Label>
                        <Input
                          id="inviteCode"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          placeholder="e.g. a1b2c3d4"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={acceptInvitationMutation.isPending}
                      >
                        {acceptInvitationMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connecting...
                          </>
                        ) : "Connect with Partner"}
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          </HandDrawnBorder>
          
          {!user.inviteCode ? null : (
            <HandDrawnBorder>
              <Card>
                <CardHeader>
                  <CardTitle>Invitation Code</CardTitle>
                  <CardDescription>
                    Share this code with your partner to connect
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted font-mono text-center p-4 rounded-md text-lg">
                    {user.inviteCode}
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-muted-foreground">
                    Your partner will need to enter this code in their profile to connect with you.
                  </p>
                </CardFooter>
              </Card>
            </HandDrawnBorder>
          )}
          
          <HandDrawnBorder>
            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>
                  Manage your linked external accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" 
                           className="w-6 h-6" alt="Google" />
                      <div>
                        <div className="font-medium">Google</div>
                        <div className="text-sm text-muted-foreground">
                          {user.firebaseUid ? "Connected" : "Not connected"}
                        </div>
                      </div>
                    </div>
                    {user.firebaseUid ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center text-green-600">
                          <CheckCircle2 className="w-5 h-5 mr-1" />
                          <span className="text-sm font-medium">Linked</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUnlinkAccount()}
                          disabled={isUnlinking || unlinkMutation.isPending}
                        >
                          {isUnlinking || unlinkMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Unlinking...
                            </>
                          ) : "Unlink"}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Sign in with Google to link
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </HandDrawnBorder>

          <HandDrawnBorder>
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Manage your password and account security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChangePasswordForm />
                
                {/* Separator between change password form and delete account button */}
                <div className="mt-8 pt-2 border-t border-border">
                  <h3 className="text-lg font-medium text-destructive mb-2">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    These actions are irreversible. Please proceed with caution.
                  </p>
                  <DeleteAccountDialog />
                </div>
              </CardContent>
            </Card>
          </HandDrawnBorder>
        </div>
      </div>
    </MainLayout>
  );
}