import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { Logo } from "@/components/logo";
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { token } = useParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [passwordResetComplete, setPasswordResetComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verify token is valid
  const tokenQuery = useQuery({
    queryKey: [`/api/reset-password/${token}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reset-password/${token}`);
      return res.json();
    },
    retry: false,
  });
  
  // Handle token validation error
  useEffect(() => {
    if (tokenQuery.isError) {
      toast({
        title: "Invalid or expired token",
        description: "Please request a new password reset link",
        variant: "destructive",
      });
      // Redirect back to forgot password page
      setTimeout(() => setLocation("/forgot-password"), 3000);
    }
  }, [tokenQuery.isError, toast, setLocation]);

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", `/api/reset-password/${token}`, { password });
      return await res.json();
    },
    onSuccess: () => {
      setPasswordResetComplete(true);
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password",
        duration: 5000,
      });
      // Redirect to login page after 3 seconds
      setTimeout(() => setLocation("/auth"), 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check if passwords match
  useEffect(() => {
    if (confirmPassword) {
      setPasswordMismatch(newPassword !== confirmPassword);
    } else {
      setPasswordMismatch(false);
    }
  }, [newPassword, confirmPassword]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordMismatch || !newPassword) return;
    resetPasswordMutation.mutate(newPassword);
  };

  // Show error or loading state during token verification
  if (tokenQuery.isLoading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4">Verifying reset link...</p>
      </div>
    );
  }

  if (tokenQuery.isError) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-destructive">Invalid or expired reset link</h1>
          <p className="mt-2 mb-6">Redirecting to forgot password page...</p>
          <Button asChild>
            <Link to="/forgot-password">
              Go to forgot password
            </Link>
          </Button>
        </div>
      </div>
    );
  }

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
              <CardTitle>
                {passwordResetComplete ? "Password reset successful" : "Reset your password"}
              </CardTitle>
              <CardDescription>
                {passwordResetComplete 
                  ? "You can now log in with your new password"
                  : "Please enter a new password for your account"}
              </CardDescription>
            </CardHeader>
            
            {!passwordResetComplete ? (
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={passwordMismatch ? "border-destructive" : ""}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {passwordMismatch && (
                      <p className="text-destructive text-sm">Passwords do not match</p>
                    )}
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
                    disabled={
                      resetPasswordMutation.isPending || 
                      !newPassword || 
                      !confirmPassword ||
                      passwordMismatch
                    }
                  >
                    {resetPasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : "Reset Password"}
                  </Button>
                </CardFooter>
              </form>
            ) : (
              <CardContent className="space-y-4">
                <p className="text-center text-muted-foreground">
                  Your password has been successfully reset.
                </p>
                <div className="flex justify-center mt-4">
                  <Button asChild>
                    <Link to="/auth">
                      Go to login
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