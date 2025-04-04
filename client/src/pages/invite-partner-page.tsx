import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layouts/main-layout";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  message: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export default function InvitePartnerPage() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      message: "",
    },
  });

  const onSubmit = async (values: InviteFormValues) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/invite-partner", values);
      const data = await response.json();
      setInviteCode(data.inviteCode);
      toast({
        title: "Invitation ready!",
        description: "Share your invite code with your partner.",
      });
    } catch (error) {
      toast({
        title: "Failed to send invitation",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate("/");
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <Logo size="large" withText={true} />
            </div>
          </div>

          <HandDrawnBorder className="bg-white bg-opacity-90 rounded-lg p-8 shadow-md">
            <h2 className="font-serif text-2xl mb-6 text-center">Invite Your Partner</h2>
            
            <div className="mb-8">
              <p className="text-center mb-4">Let's grow a garden of connection together</p>
              <div className="text-center">
                <img 
                  src="https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
                  alt="Two hands holding a small plant" 
                  className="rounded-lg mx-auto w-48 h-36 object-cover mb-4" 
                />
              </div>
            </div>
            
            {inviteCode ? (
              <div className="text-center">
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Your Invitation Code</h3>
                  <div className="bg-sage-light bg-opacity-60 rounded-lg p-4 font-mono text-xl tracking-wide">
                    {inviteCode}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Share this code with your partner so they can connect with you.
                  </p>
                </div>
                
                <Button
                  className="w-full bg-sage hover:bg-sage-dark text-white"
                  onClick={() => navigate("/")}
                >
                  Continue to Your Garden
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Partner's Email</FormLabel>
                        <FormControl>
                          <Input placeholder="partner@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Add a personal message (optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3} 
                            placeholder="I'd love to grow our relationship together..."
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full bg-sage hover:bg-sage-dark text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Invitation"
                    )}
                  </Button>
                  
                  <div className="text-center mt-4">
                    <Button 
                      variant="link" 
                      className="text-sage hover:text-sage-dark text-sm"
                      onClick={handleSkip}
                    >
                      Skip for now
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </HandDrawnBorder>
        </div>
      </div>
    </MainLayout>
  );
}
