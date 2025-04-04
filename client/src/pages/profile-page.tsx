import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState("");
  
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
  
  if (!user) return null;
  
  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      
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
                <div className="bg-muted p-4 rounded-md">
                  <div className="font-medium">
                    Your garden is growing together with your partner.
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
      </div>
    </div>
  );
}