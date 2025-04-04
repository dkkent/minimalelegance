import React, { useState } from 'react';
import { MainLayout } from '@/components/layouts/main-layout';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { HandDrawnBorder } from '@/components/hand-drawn-border';
import { HandDrawnUnderline } from '@/components/hand-drawn-underline';
import { ThemeBadge } from '@/components/theme-badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

type Theme = "Trust" | "Intimacy" | "Conflict" | "Dreams" | "Play" | "All";

const starterFormSchema = z.object({
  content: z.string().min(5, "Content must be at least 5 characters"),
  theme: z.enum(["Trust", "Intimacy", "Conflict", "Dreams", "Play"])
});

type StarterFormData = z.infer<typeof starterFormSchema>;

type ConversationStarter = {
  id: number;
  content: string;
  theme: string;
  baseQuestionId: number | null;
  lovesliceId: number | null;
  createdAt: string;
};

export default function ConversationStartersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState<Theme>("All");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Form for creating a new conversation starter
  const form = useForm<StarterFormData>({
    resolver: zodResolver(starterFormSchema),
    defaultValues: {
      content: "",
      theme: "Trust"
    }
  });
  
  // Query for getting conversation starters
  const { data: conversationStarters, isLoading } = useQuery({
    queryKey: ['/api/conversation-starters', selectedTheme, refreshTrigger],
    queryFn: async () => {
      const url = selectedTheme === "All" 
        ? '/api/conversation-starters'
        : `/api/conversation-starters?theme=${selectedTheme}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversation starters');
      }
      
      return response.json() as Promise<ConversationStarter[]>;
    }
  });
  
  // Random conversation starter
  const { data: randomStarter, refetch: fetchRandomStarter, isLoading: randomLoading } = useQuery({
    queryKey: ['/api/conversation-starters/random', selectedTheme],
    queryFn: async () => {
      const url = selectedTheme === "All" 
        ? '/api/conversation-starters/random'
        : `/api/conversation-starters/random?theme=${selectedTheme}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch random conversation starter');
      }
      
      return response.json() as Promise<ConversationStarter>;
    },
    enabled: false // Don't run on mount
  });
  
  // Get user activity stats (streak and garden health)
  const { data: activityStats } = useQuery({
    queryKey: ['/api/user-activity/stats'],
    queryFn: async () => {
      const response = await fetch('/api/user-activity/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity stats');
      }
      
      return response.json() as Promise<{ streak: number, gardenHealth: number }>;
    }
  });
  
  // Mutation for creating a new conversation starter
  const createMutation = useMutation({
    mutationFn: async (data: StarterFormData) => {
      const response = await apiRequest('POST', '/api/conversation-starters', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conversation starter created",
        description: "Your conversation starter has been added.",
      });
      
      // Reset form
      form.reset();
      
      // Refresh starters list
      setRefreshTrigger(prev => prev + 1);
      
      // Refetch random starter
      fetchRandomStarter();
    },
    onError: (error) => {
      toast({
        title: "Failed to create conversation starter",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Record user activity
  const recordActivityMutation = useMutation({
    mutationFn: async (actionType: string) => {
      const response = await apiRequest('POST', '/api/user-activity', { actionType });
      return response.json();
    }
  });
  
  const handleTabChange = (value: string) => {
    setSelectedTheme(value as Theme);
  };
  
  const handleGetRandomStarter = async () => {
    fetchRandomStarter();
    recordActivityMutation.mutate('view_starter');
  };
  
  const onSubmit = (data: StarterFormData) => {
    createMutation.mutate(data);
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <HandDrawnUnderline>
          <h1 className="text-3xl font-bold mb-8">Conversation Starters</h1>
        </HandDrawnUnderline>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Conversation Starters Main Content */}
          <div className="md:col-span-2">
            {/* Filter tabs */}
            <Tabs defaultValue="All" onValueChange={handleTabChange} className="mb-8">
              <TabsList className="w-full grid grid-cols-6">
                <TabsTrigger value="All">All</TabsTrigger>
                <TabsTrigger value="Trust">Trust</TabsTrigger>
                <TabsTrigger value="Intimacy">Intimacy</TabsTrigger>
                <TabsTrigger value="Conflict">Conflict</TabsTrigger>
                <TabsTrigger value="Dreams">Dreams</TabsTrigger>
                <TabsTrigger value="Play">Play</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Random Starter Section */}
            <HandDrawnBorder className="mb-8 p-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">Random Conversation Starter</h2>
                
                {randomLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : randomStarter ? (
                  <div className="mb-4">
                    <ThemeBadge theme={randomStarter.theme as any} className="mb-2" />
                    <p className="text-xl italic">"{randomStarter.content}"</p>
                  </div>
                ) : (
                  <p className="mb-4 text-gray-500 italic">Click the button to get a random conversation starter</p>
                )}
                
                <Button onClick={handleGetRandomStarter}>
                  Get Random Starter
                </Button>
              </div>
            </HandDrawnBorder>
            
            {/* All Starters Section */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                {selectedTheme === "All" ? "All Starters" : `${selectedTheme} Starters`}
              </h2>
              
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : conversationStarters && conversationStarters.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {conversationStarters.map(starter => (
                    <Card key={starter.id}>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          <ThemeBadge theme={starter.theme as any} />
                          <span className="text-sm text-gray-500">
                            {new Date(starter.createdAt).toLocaleDateString()}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg">{starter.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 border border-dashed rounded-lg">
                  <p className="text-gray-500">No conversation starters found for this theme.</p>
                  <p className="text-gray-500">Create a new one below!</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your Stats</CardTitle>
                <CardDescription>Track your engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Current Streak:</span>
                    <span className="font-bold">{activityStats?.streak || 0} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Garden Health:</span>
                    <span className="font-bold">{activityStats?.gardenHealth || 100}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Create Starter Card */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Starter</CardTitle>
                <CardDescription>Share your creative conversation ideas</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theme</FormLabel>
                          <FormControl>
                            <select
                              className="w-full p-2 border rounded-md"
                              {...field}
                            >
                              <option value="Trust">Trust</option>
                              <option value="Intimacy">Intimacy</option>
                              <option value="Conflict">Conflict</option>
                              <option value="Dreams">Dreams</option>
                              <option value="Play">Play</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your conversation starter question..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : "Create Starter"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}