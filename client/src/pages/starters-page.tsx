import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { MainLayout } from "@/components/layouts/main-layout";
import { HandDrawnUnderline } from "@/components/hand-drawn-underline";
import { ThemeBadge } from "@/components/theme-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  MessageSquarePlus,
  RefreshCcw,
  Plus,
  Heart,
  ArrowRight,
  Sparkles,
  Clock
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

// Types and schema definitions
type Theme = string;

// Database theme object structure
interface ThemeObject {
  id: number;
  name: string;
  color: string;
}

type ConversationStarter = {
  id: number;
  content: string;
  theme: string;
  baseQuestionId: number | null;
  lovesliceId: number | null;
  createdAt: string;
  markedAsMeaningful: boolean;
  used: boolean;
};

const starterFormSchema = z.object({
  content: z.string().min(10, { message: "Starter must be at least 10 characters" }),
  theme: z.string(),
  addToGlobalPool: z.boolean().default(false)
});

type StarterFormData = z.infer<typeof starterFormSchema>;

// Main Page Component
export default function StartersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [selectedTheme, setSelectedTheme] = useState<Theme>("All");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [newStarterId, setNewStarterId] = useState<number | null>(null);
  
  // Form state for inline create new starter form
  const [starterContent, setStarterContent] = useState("");
  const [selectedStarterTheme, setSelectedStarterTheme] = useState<string>("Trust");
  const [addToGlobal, setAddToGlobal] = useState(false);
  const [availableThemes, setAvailableThemes] = useState<ThemeObject[]>([]);
  
  // Query to get available themes from the database
  const { data: themesData, isLoading: loadingThemes } = useQuery({
    queryKey: ['/api/themes'],
    queryFn: async () => {
      const response = await fetch('/api/themes', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch themes');
      }
      
      return response.json() as Promise<{ themes: ThemeObject[] }>;
    }
  });
  
  // Update available themes when data is loaded
  React.useEffect(() => {
    if (themesData && themesData.themes) {
      setAvailableThemes(themesData.themes);
      
      // Set the selected theme to the first theme in the list if it exists
      if (themesData.themes.length > 0 && !selectedStarterTheme) {
        setSelectedStarterTheme(themesData.themes[0].name);
      }
    }
  }, [themesData, selectedStarterTheme]);
  
  // Input ref for auto-focus
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  React.useEffect(() => {
    // Auto-focus the input when the page loads
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Query for getting conversation starters
  const { data: conversationStarters, isLoading } = useQuery({
    queryKey: ['/api/conversation-starters', selectedTheme, refreshTrigger],
    queryFn: async () => {
      const url = selectedTheme === "All" 
        ? '/api/conversation-starters'
        : `/api/conversation-starters?theme=${selectedTheme}`;
      const response = await fetch(url, {
        credentials: 'include' // Include authentication cookies
      });
      
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
        throw new Error('Failed to fetch random starter');
      }
      
      return response.json() as Promise<ConversationStarter>;
    }
  });
  
  // Mutation for creating a new starter
  const createMutation = useMutation({
    mutationFn: async (data: StarterFormData) => {
      const response = await fetch('/api/conversation-starters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to create starter');
      }
      
      return response.json() as Promise<ConversationStarter>;
    },
    onSuccess: (data) => {
      toast({
        title: '✨ Starter created',
        description: 'Your conversation starter has been added.'
      });
      
      // Reset form
      setStarterContent("");
      
      // Refresh the list and highlight the new starter
      queryClient.invalidateQueries({ queryKey: ['/api/conversation-starters'] });
      setNewStarterId(data.id);
      
      // Clear the highlight after 5 seconds
      setTimeout(() => {
        setNewStarterId(null);
      }, 5000);
      
      // Focus back on the input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create starter. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Mutation for starting a conversation
  const startConversationMutation = useMutation({
    mutationFn: async (starterId: number) => {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ starterId }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      navigate(`/conversation/${data.id}`);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to start conversation. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Mutation for adding to deck
  const addToDeckMutation = useMutation({
    mutationFn: async (starterId: number) => {
      const response = await fetch(`/api/conversation-starters/${starterId}/add-to-deck`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to add to deck');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Added to deck',
        description: 'This starter will appear in your feeds over time.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add to deck. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Mutation for recording user activity
  const recordActivityMutation = useMutation({
    mutationFn: async (actionType: string) => {
      const response = await fetch('/api/user-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ actionType }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to record activity');
      }
      
      return response.json();
    }
  });
  
  const handleTabChange = (value: Theme) => {
    setSelectedTheme(value);
  };
  
  const handleRefreshRandom = () => {
    fetchRandomStarter();
    recordActivityMutation.mutate('refresh_starter');
  };
  
  const handleInlineCreateStarter = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (starterContent.length < 10) {
      toast({
        title: 'Content too short',
        description: 'Starter must be at least 10 characters long.',
        variant: 'destructive'
      });
      return;
    }
    
    const data: StarterFormData = {
      content: starterContent,
      theme: selectedStarterTheme,
      addToGlobalPool: addToGlobal
    };
    
    createMutation.mutate(data);
    recordActivityMutation.mutate('create_starter');
  };
  
  const handleStartConversation = (starterId: number) => {
    startConversationMutation.mutate(starterId);
    recordActivityMutation.mutate('start_conversation');
  };
  
  const handleAddToDeck = (starterId: number) => {
    addToDeckMutation.mutate(starterId);
    recordActivityMutation.mutate('add_to_deck');
  };
  
  // Render conversation starters in a table/list format
  const renderStarters = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 bg-white rounded-md border border-gray-100 shadow-sm animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-5 bg-gray-100 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      );
    }
    
    if (!conversationStarters || conversationStarters.length === 0) {
      return (
        <div className="p-6 bg-white rounded-md border border-gray-100 text-center">
          <p className="text-lg text-gray-500 mb-4">No conversation starters found in this theme</p>
        </div>
      );
    }
    
    // Filter starters by selected theme if not "All"
    const filteredStarters = selectedTheme === "All" 
      ? conversationStarters 
      : conversationStarters.filter(s => s.theme === selectedTheme);
    
    return (
      <div className="space-y-3">
        {filteredStarters.map(starter => (
          <div 
            key={starter.id} 
            className={`p-4 bg-white rounded-md border border-gray-100 shadow-sm flex items-center justify-between group transition-all ${starter.id === newStarterId ? 'ring-2 ring-primary animate-pulse' : ''}`}
          >
            <div className="flex items-center gap-2">
              <div className="text-lg text-primary">+</div>
              <div>{starter.content}</div>
            </div>
            <div className="flex items-center space-x-3">
              <ThemeBadge theme={starter.theme as Theme} size="small" />
              <Button 
                variant="ghost" 
                size="sm" 
                className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity"
                onClick={() => handleAddToDeck(starter.id)}
                title="Add to deck"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add to deck</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Conversation Starters</h1>
        
        {/* Create New Starter Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">Create New Starter</h2>
          <p className="text-gray-600 mb-4">Create a thoughtful conversation starter to spark a meaningful conversation with your partner.</p>
          
          <form onSubmit={handleInlineCreateStarter}>
            <div className="space-y-4 md:space-y-0 md:flex md:items-end md:space-x-4">
              <div className="flex-grow">
                <Input
                  ref={inputRef}
                  placeholder="Enter your loveslice spark here"
                  value={starterContent}
                  onChange={(e) => setStarterContent(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="w-full md:w-40">
                <select
                  value={selectedStarterTheme}
                  onChange={(e) => setSelectedStarterTheme(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  {loadingThemes ? (
                    <option value="">Loading themes...</option>
                  ) : availableThemes.length > 0 ? (
                    availableThemes.map((theme) => (
                      <option key={theme.id} value={theme.name}>
                        {theme.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Trust">Trust</option>
                      <option value="Intimacy">Intimacy</option>
                      <option value="Conflict">Conflict</option>
                      <option value="Dreams">Dreams</option>
                      <option value="Play">Play</option>
                      <option value="Money">Money</option>
                    </>
                  )}
                </select>
              </div>
              
              <Button type="submit" className="w-full md:w-auto">Create Starter</Button>
            </div>
            
            <div className="mt-3 flex items-center">
              <Checkbox 
                id="add-to-global"
                checked={addToGlobal}
                onCheckedChange={(checked) => setAddToGlobal(checked === true)}
              />
              <label htmlFor="add-to-global" className="ml-2 text-sm cursor-pointer">
                Add to global list
                <span className="inline-block ml-1 text-gray-400">
                  <span title="This starter will be shared with all users" className="cursor-help">ⓘ</span>
                </span>
              </label>
            </div>
          </form>
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-200 my-8"></div>
        
        {/* Browse Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Browse Starters</h2>
          
          {/* Theme Tabs */}
          <div className="mb-6 overflow-x-auto">
            <div className="inline-flex rounded-md shadow-sm">
              <Button 
                variant={selectedTheme === "All" ? "default" : "outline"} 
                onClick={() => handleTabChange("All")}
                className="rounded-r-none"
              >
                All
              </Button>
              
              {loadingThemes ? (
                <Button disabled className="rounded-none border-l-0">
                  <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-primary rounded-full"></div>
                  Loading...
                </Button>
              ) : availableThemes.length > 0 ? (
                availableThemes.map((theme, index) => (
                  <Button 
                    key={theme.id}
                    variant={selectedTheme === theme.name ? "default" : "outline"} 
                    onClick={() => handleTabChange(theme.name)}
                    className={`rounded-none border-l-0 ${index === availableThemes.length - 1 ? 'rounded-r-md' : ''}`}
                  >
                    {theme.name}
                  </Button>
                ))
              ) : (
                <>
                  <Button 
                    variant={selectedTheme === "Trust" ? "default" : "outline"} 
                    onClick={() => handleTabChange("Trust")}
                    className="rounded-none border-l-0"
                  >
                    Trust
                  </Button>
                  <Button 
                    variant={selectedTheme === "Intimacy" ? "default" : "outline"} 
                    onClick={() => handleTabChange("Intimacy")}
                    className="rounded-none border-l-0"
                  >
                    Intimacy
                  </Button>
                  <Button 
                    variant={selectedTheme === "Conflict" ? "default" : "outline"} 
                    onClick={() => handleTabChange("Conflict")}
                    className="rounded-none border-l-0"
                  >
                    Conflict
                  </Button>
                  <Button 
                    variant={selectedTheme === "Dreams" ? "default" : "outline"} 
                    onClick={() => handleTabChange("Dreams")}
                    className="rounded-none border-l-0"
                  >
                    Dreams
                  </Button>
                  <Button 
                    variant={selectedTheme === "Play" ? "default" : "outline"} 
                    onClick={() => handleTabChange("Play")}
                    className="rounded-none border-l-0"
                  >
                    Play
                  </Button>
                  <Button 
                    variant={selectedTheme === "Money" ? "default" : "outline"} 
                    onClick={() => handleTabChange("Money")}
                    className="rounded-r-md border-l-0"
                  >
                    Money
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Starters List */}
          {renderStarters()}
        </div>
      </div>
    </MainLayout>
  );
}