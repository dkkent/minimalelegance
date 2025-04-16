import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { Logo } from "@/components/logo";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  
  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/forgot-password", { email });
      return await res.json();
    },
    onSuccess: () => {
      setEmailSent(true);
      toast({
        title: "Email sent",
        description: "If your email exists in our system, you will receive a password reset link",
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    forgotPasswordMutation.mutate(email);
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="large" withText />
          <p className="text-muted-foreground mt-2">
            Nurturing relationships through meaningful connection
          </p>
        </div>
        
        <HandDrawnBorder>
          <Card>
            <CardHeader>
              <CardTitle>{emailSent ? "Check your email" : "Forgot your password?"}</CardTitle>
              <CardDescription>
                {emailSent 
                  ? "We've sent you an email with a link to reset your password."
                  : "Enter your email and we'll send you a reset link"}
              </CardDescription>
            </CardHeader>
            
            {!emailSent ? (
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <Link to="/auth">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to login
                    </Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={forgotPasswordMutation.isPending || !email}
                  >
                    {forgotPasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : "Send reset link"}
                  </Button>
                </CardFooter>
              </form>
            ) : (
              <CardContent className="space-y-4">
                <p className="text-center text-muted-foreground">
                  If you don't see the email in your inbox, please check your spam folder.
                </p>
                <div className="flex justify-center mt-4">
                  <Button asChild>
                    <Link to="/auth">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to login
                    </Link>
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </HandDrawnBorder>
      </div>
    </div>
  );
}