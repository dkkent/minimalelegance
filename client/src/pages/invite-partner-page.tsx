import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Copy, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function InvitePartnerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [inviteCode, setInviteCode] = useState(user?.inviteCode || "");
  const [copied, setCopied] = useState(false);
  const [showEmailSent, setShowEmailSent] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; message: string }) => {
      const res = await apiRequest("POST", "/api/invite-partner", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setInviteCode(data.inviteCode);
      setShowEmailSent(true);
      setEmail("");
      setMessage("");
      toast({
        title: "Invitation sent",
        description: data.emailSent 
          ? `An invitation has been sent to ${email}`
          : `The invitation code was generated, but the email could not be sent.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({ email, message });
  };

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "The invite code has been copied to your clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Invite Your Partner</h1>
      <p className="text-muted-foreground text-center mb-8">
        Share Loveslices with your partner to start growing your relationship garden together.
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Left side - Invite by email */}
        <HandDrawnBorder>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invite by Email
              </CardTitle>
              <CardDescription>
                Send an invitation email to your partner with your invite code.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Partner's Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="partner@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Personal Message (optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Add a personal note to your invitation..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={inviteMutation.isPending || !email}
                >
                  {inviteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : "Send Invitation"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </HandDrawnBorder>

        {/* Right side - Share invite code manually */}
        <HandDrawnBorder>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Share Invite Code
              </CardTitle>
              <CardDescription>
                {inviteCode 
                  ? "Copy your invite code to share with your partner manually." 
                  : "After you send an email invitation, your invite code will appear here."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inviteCode ? (
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Your Invite Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="inviteCode"
                      value={inviteCode}
                      readOnly
                      className="font-mono"
                    />
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="outline" 
                      onClick={copyInviteCode}
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No invite code generated yet</p>
                  <p className="text-sm mt-2">Send an email invitation to generate a code</p>
                </div>
              )}

              {showEmailSent && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Invitation Sent</AlertTitle>
                  <AlertDescription>
                    Your partner will receive an email with instructions to join.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex-col space-y-2">
              <p className="text-sm text-muted-foreground">
                Your partner will use this code to connect with your account after 
                they create their own Loveslices account.
              </p>
            </CardFooter>
          </Card>
        </HandDrawnBorder>
      </div>

      <div className="mt-8">
        <HandDrawnBorder>
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4 list-decimal list-inside">
                <li>
                  <span className="font-medium">Send an invitation:</span>
                  <p className="pl-6 text-muted-foreground mt-1">
                    Send an email invitation to your partner, or share your invite code manually.
                  </p>
                </li>
                <li>
                  <span className="font-medium">Partner creates an account:</span>
                  <p className="pl-6 text-muted-foreground mt-1">
                    Your partner signs up for their own Loveslices account.
                  </p>
                </li>
                <li>
                  <span className="font-medium">Partner enters the invite code:</span>
                  <p className="pl-6 text-muted-foreground mt-1">
                    After creating an account, they'll enter your invite code to connect.
                  </p>
                </li>
                <li>
                  <span className="font-medium">Start growing together:</span>
                  <p className="pl-6 text-muted-foreground mt-1">
                    Once connected, you'll both see shared questions and loveslices in your garden.
                  </p>
                </li>
              </ol>
            </CardContent>
          </Card>
        </HandDrawnBorder>
      </div>
    </div>
  );
}