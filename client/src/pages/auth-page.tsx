import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/logo";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AccountType = "individual" | "couple";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  accountType: z.enum(["individual", "couple"]),
});

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      accountType: "individual",
    },
  });

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    registerMutation.mutate({
      name: values.name,
      email: values.email,
      password: values.password,
      isIndividual: values.accountType === "individual",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Logo size="large" withText={true} />
          </div>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <HandDrawnBorder className="bg-white bg-opacity-90 rounded-lg p-8 shadow-md">
              <h2 className="font-serif text-2xl mb-6 text-center">Welcome Back</h2>
              
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="hello@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>Password</FormLabel>
                          <a href="#" className="text-xs text-sage hover:underline">Forgot password?</a>
                        </div>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-sage hover:bg-sage-dark text-white"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
              
              <div className="relative flex items-center justify-center my-6">
                <div className="border-t border-gray-200 absolute w-full"></div>
                <div className="bg-white px-4 relative z-10 text-sm text-gray-500">or continue with</div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-6">
                <Button variant="outline" className="flex justify-center items-center py-2 px-4 border border-lavender rounded hover:bg-lavender-light transition duration-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,15.64 16.96,17.17 14.65,17.17C12.01,17.17 9.89,14.83 9.89,11.96C9.89,9.09 12.01,6.75 14.65,6.75C16.1,6.75 17.31,7.41 18.1,8.39L20.22,6.45C18.77,5.08 16.89,4.25 14.65,4.25C10.53,4.25 7,7.68 7,11.96C7,16.24 10.53,19.67 14.65,19.67C18.5,19.67 21.35,17.29 21.35,12.39C21.35,11.9 21.33,11.5 21.28,11.1Z"></path>
                  </svg>
                </Button>
                <Button variant="outline" className="flex justify-center items-center py-2 px-4 border border-lavender rounded hover:bg-lavender-light transition duration-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"></path>
                  </svg>
                </Button>
                <Button variant="outline" className="flex justify-center items-center py-2 px-4 border border-lavender rounded hover:bg-lavender-light transition duration-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C18.4,9.45 17.79,10.67 17.79,12C17.79,13.96 18.87,15.11 19.97,15.41C19.88,15.47 19.78,15.54 19.68,15.6C18.93,16.28 18.05,17.34 17.44,18.26C17.05,18.86 16.77,19.25 16.5,19.5H18.71M15.93,3.67C16.72,3.12 17.23,2.31 17.35,1.4C16.57,1.42 15.61,1.93 14.9,2.4C14.21,2.87 13.57,3.76 13.42,4.63C14.25,4.72 15.18,4.25 15.93,3.67Z" />
                  </svg>
                </Button>
              </div>
            </HandDrawnBorder>
          </TabsContent>

          <TabsContent value="register">
            <HandDrawnBorder className="bg-white bg-opacity-90 rounded-lg p-8 shadow-md">
              <h2 className="font-serif text-2xl mb-6 text-center">Create Your Account</h2>
              
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <div className="mb-6">
                    <h3 className="text-center mb-4">I'm joining as:</h3>
                    <FormField
                      control={registerForm.control}
                      name="accountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-2 gap-4"
                            >
                              <div className="border border-lavender rounded-lg p-4 cursor-pointer hover:bg-lavender-light transition text-center relative">
                                <RadioGroupItem
                                  value="individual"
                                  id="individual"
                                  className="absolute opacity-0"
                                />
                                <Label
                                  htmlFor="individual"
                                  className="cursor-pointer block"
                                >
                                  <div className="text-center mb-1">
                                    <svg
                                      className="w-8 h-8 mx-auto text-sage"
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                      <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                  </div>
                                  <span className="font-medium">Individual</span>
                                </Label>
                              </div>
                              <div className="border border-lavender rounded-lg p-4 cursor-pointer hover:bg-lavender-light transition text-center relative">
                                <RadioGroupItem
                                  value="couple"
                                  id="couple"
                                  className="absolute opacity-0"
                                />
                                <Label
                                  htmlFor="couple"
                                  className="cursor-pointer block"
                                >
                                  <div className="text-center mb-1">
                                    <svg
                                      className="w-8 h-8 mx-auto text-sage"
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                      <circle cx="9" cy="7" r="4"></circle>
                                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                  </div>
                                  <span className="font-medium">Couple</span>
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="hello@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Create a secure password"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500 mt-1">
                          Must be at least 6 characters
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full bg-sage hover:bg-sage-dark text-white"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
              
              <div className="relative flex items-center justify-center my-6">
                <div className="border-t border-gray-200 absolute w-full"></div>
                <div className="bg-white px-4 relative z-10 text-sm text-gray-500">or sign up with</div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-6">
                <Button variant="outline" className="flex justify-center items-center py-2 px-4 border border-lavender rounded hover:bg-lavender-light transition duration-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,15.64 16.96,17.17 14.65,17.17C12.01,17.17 9.89,14.83 9.89,11.96C9.89,9.09 12.01,6.75 14.65,6.75C16.1,6.75 17.31,7.41 18.1,8.39L20.22,6.45C18.77,5.08 16.89,4.25 14.65,4.25C10.53,4.25 7,7.68 7,11.96C7,16.24 10.53,19.67 14.65,19.67C18.5,19.67 21.35,17.29 21.35,12.39C21.35,11.9 21.33,11.5 21.28,11.1Z"></path>
                  </svg>
                </Button>
                <Button variant="outline" className="flex justify-center items-center py-2 px-4 border border-lavender rounded hover:bg-lavender-light transition duration-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"></path>
                  </svg>
                </Button>
                <Button variant="outline" className="flex justify-center items-center py-2 px-4 border border-lavender rounded hover:bg-lavender-light transition duration-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C18.4,9.45 17.79,10.67 17.79,12C17.79,13.96 18.87,15.11 19.97,15.41C19.88,15.47 19.78,15.54 19.68,15.6C18.93,16.28 18.05,17.34 17.44,18.26C17.05,18.86 16.77,19.25 16.5,19.5H18.71M15.93,3.67C16.72,3.12 17.23,2.31 17.35,1.4C16.57,1.42 15.61,1.93 14.9,2.4C14.21,2.87 13.57,3.76 13.42,4.63C14.25,4.72 15.18,4.25 15.93,3.67Z" />
                  </svg>
                </Button>
              </div>
            </HandDrawnBorder>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
