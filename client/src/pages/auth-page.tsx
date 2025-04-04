import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/logo";
import { useLocation } from "wouter";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  // If the user is already authenticated, redirect to the home page
  if (user) {
    setLocation("/");
    return null;
  }

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterForm({
      ...registerForm,
      [name]: value,
    });

    // Check password match if passwordConfirm is being updated
    if (name === "passwordConfirm" || name === "password") {
      const match = name === "password" 
        ? value === registerForm.passwordConfirm 
        : registerForm.password === value;
      setPasswordMismatch(!match && registerForm.passwordConfirm !== "");
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.passwordConfirm) {
      setPasswordMismatch(true);
      return;
    }
    
    registerMutation.mutate({
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
    });
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Left side - Login/Register form */}
      <div className="w-full md:w-1/2 p-6 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo size="large" withText />
            <p className="text-muted-foreground mt-2">
              Nurturing relationships through meaningful connection
            </p>
          </div>
          
          <HandDrawnBorder>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>Welcome back</CardTitle>
                    <CardDescription>
                      Log in to continue nurturing your relationship garden
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleLoginSubmit}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email" 
                          placeholder="your.email@example.com"
                          value={loginForm.email}
                          onChange={handleLoginChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          value={loginForm.password}
                          onChange={handleLoginChange}
                          required
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Logging in...
                          </>
                        ) : "Login"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
              
              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>Create an account</CardTitle>
                    <CardDescription>
                      Join Loveslices to start growing your relationship
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleRegisterSubmit}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Your Name"
                          value={registerForm.name}
                          onChange={handleRegisterChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          name="email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={registerForm.email}
                          onChange={handleRegisterChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password">Password</Label>
                        <Input
                          id="register-password"
                          name="password"
                          type="password"
                          value={registerForm.password}
                          onChange={handleRegisterChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="passwordConfirm">Confirm Password</Label>
                        <Input
                          id="passwordConfirm"
                          name="passwordConfirm"
                          type="password"
                          value={registerForm.passwordConfirm}
                          onChange={handleRegisterChange}
                          required
                          className={passwordMismatch ? "border-destructive" : ""}
                        />
                        {passwordMismatch && (
                          <p className="text-destructive text-sm">Passwords do not match</p>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={registerMutation.isPending || passwordMismatch}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : "Register"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
            </Tabs>
          </HandDrawnBorder>
        </div>
      </div>
      
      {/* Right side - Hero section */}
      <div className="hidden md:flex md:w-1/2 bg-muted flex-col items-center justify-center text-center p-12">
        <div className="max-w-md space-y-6">
          <HandDrawnBorder>
            <div className="bg-card p-6 rounded-md">
              <h1 className="text-3xl font-bold mb-4">Grow Together with Loveslices</h1>
              <p className="text-muted-foreground mb-6">
                A thoughtful space for couples to nurture their relationship through meaningful
                conversations, shared insights, and intentional connection.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="text-left">
                  <h3 className="font-medium mb-2">Written Loveslices</h3>
                  <p className="text-sm text-muted-foreground">
                    Answer thought-provoking questions that help you understand each other more deeply.
                  </p>
                </div>
                <div className="text-left">
                  <h3 className="font-medium mb-2">Spoken Loveslices</h3>
                  <p className="text-sm text-muted-foreground">
                    Have meaningful conversations that strengthen your bond and create shared memories.
                  </p>
                </div>
                <div className="text-left">
                  <h3 className="font-medium mb-2">Relationship Garden</h3>
                  <p className="text-sm text-muted-foreground">
                    Watch your relationship flourish as you tend to it with care and attention.
                  </p>
                </div>
                <div className="text-left">
                  <h3 className="font-medium mb-2">Private Journal</h3>
                  <p className="text-sm text-muted-foreground">
                    Reflect on your growth and revisit the insights you've gained along the way.
                  </p>
                </div>
              </div>
            </div>
          </HandDrawnBorder>
        </div>
      </div>
    </div>
  );
}