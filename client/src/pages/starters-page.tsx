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
type Theme = "All" | "Trust" | "Intimacy" | "Conflict" | "Dreams" | "Play" | "Money";

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

// Helper components
const StarterCard = ({ 
  starter, 
  isNew = false, 
  onStartConversation, 
  onAddToDeck 
}: { 
  starter: ConversationStarter; 
  isNew?: boolean;
  onStartConversation: (id: number) => void;
  onAddToDeck: (id: number) => void;
}) => {
  return (
    <Card className={`overflow-hidden transition-all duration-300 ${isNew ? 'ring-2 ring-primary animate-pulse' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <ThemeBadge theme={starter.theme as any} size="small" />
          {isNew && (
            <Badge variant="outline" className="text-xs bg-primary/10">
              New
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-lg font-medium">{starter.content}</p>
      </CardContent>
      <CardFooter className="flex justify-between pt-0 gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => onAddToDeck(starter.id)}
        >
          <Clock className="h-4 w-4 mr-1" />
          Add to deck
        </Button>
        <Button 
          size="sm" 
          className="flex-1"
          onClick={() => onStartConversation(starter.id)}
        >
          <MessageSquarePlus className="h-4 w-4 mr-1" />
          Start now
        </Button>
      </CardFooter>
    </Card>
  );
};

const RandomStarter = ({ 
  starter, 
  isLoading, 
  onRefresh, 
  onStartConversation,
  onAddToDeck
}: { 
  starter?: ConversationStarter; 
  isLoading: boolean;
  onRefresh: () => void;
  onStartConversation: (id: number) => void;
  onAddToDeck: (id: number) => void;
}) => {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-primary" />
            Random Starter
          </CardTitle>
          <CardDescription>Try a random conversation starter</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    );
  }

  if (!starter) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-primary" />
            Random Starter
          </CardTitle>
          <CardDescription>Try a random conversation starter</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No starters available. Create your first one!</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={onRefresh} disabled>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Try another
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-primary" />
          Random Starter
        </CardTitle>
        <CardDescription>Try a random conversation starter</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <ThemeBadge theme={starter.theme as any} size="small" className="mb-2" />
        <p className="text-lg font-medium">{starter.content}</p>
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onRefresh}
          className="flex-grow-0"
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Try another
        </Button>
        <div className="flex gap-2 flex-1 justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onAddToDeck(starter.id)}
          >
            <Clock className="h-4 w-4 mr-1" />
            Add to deck
          </Button>
          <Button 
            size="sm"
            onClick={() => onStartConversation(starter.id)}
          >
            <MessageSquarePlus className="h-4 w-4 mr-1" />
            Start now
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

const StartersFilterTabs = ({ 
  value, 
  onChange 
}: { 
  value: Theme; 
  onChange: (value: Theme) => void;
}) => {
  return (
    <Tabs value={value} onValueChange={onChange as (value: string) => void} className="mb-8">
      <TabsList className="w-full grid grid-cols-7">
        <TabsTrigger value="All">All</TabsTrigger>
        <TabsTrigger value="Trust">Trust</TabsTrigger>
        <TabsTrigger value="Intimacy">Intimacy</TabsTrigger>
        <TabsTrigger value="Conflict">Conflict</TabsTrigger>
        <TabsTrigger value="Dreams">Dreams</TabsTrigger>
        <TabsTrigger value="Play">Play</TabsTrigger>
        <TabsTrigger value="Money">Money</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

const NewStarterForm = ({ 
  isOpen, 
  onOpenChange, 
  onSubmit 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: StarterFormData) => void;
}) => {
  const form = useForm<StarterFormData>({
    resolver: zodResolver(starterFormSchema),
    defaultValues: {
      content: "",
      theme: "Trust",
      addToGlobalPool: false
    }
  });
  
  const handleSubmit = (data: StarterFormData) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new conversation starter</DialogTitle>
          <DialogDescription>
            Add a thoughtful question or prompt for your relationship.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starter Question/Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What's a dream you've had since childhood that we haven't discussed yet?"
                      {...field}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                      <option value="Money">Money</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="addToGlobalPool"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Add to global pool
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Share this starter with other couples anonymously
                    </p>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit">Create starter</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// Main Page Component
export default function StartersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [selectedTheme, setSelectedTheme] = useState<Theme>("All");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [newStarterDialogOpen, setNewStarterDialogOpen] = useState(false);
  
  // Track the newly created starter for highlight effect
  const [newStarterId, setNewStarterId] = useState<number | null>(null);
  
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
      
      // Refresh the list and highlight the new starter
      queryClient.invalidateQueries({ queryKey: ['/api/conversation-starters'] });
      setNewStarterId(data.id);
      
      // Clear the highlight after 5 seconds
      setTimeout(() => {
        setNewStarterId(null);
      }, 5000);
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
  };
  
  const handleStartConversation = (starterId: number) => {
    // Check if user has a partner
    if (!user?.partnerId) {
      console.log("No partner found - proceeding anyway for testing");
      toast({
        title: "Test Mode",
        description: "Starting conversation without a partner for testing purposes",
      });
    }
    
    console.log("Initiating startConversationMutation with ID:", starterId);
    startConversationMutation.mutate(starterId);
    recordActivityMutation.mutate('start_conversation');
  };
  
  const handleAddToDeck = (starterId: number) => {
    addToDeckMutation.mutate(starterId);
  };
  
  const onSubmit = (data: StarterFormData) => {
    createMutation.mutate(data);
  };
  
  // Group starters by theme if we're showing All
  const groupedStarters = React.useMemo(() => {
    if (!conversationStarters || selectedTheme !== "All") return null;
    
    return conversationStarters.reduce((acc, starter) => {
      const theme = starter.theme as Theme;
      if (!acc[theme]) {
        acc[theme] = [];
      }
      acc[theme].push(starter);
      return acc;
    }, {} as Record<Theme, ConversationStarter[]>);
  }, [conversationStarters, selectedTheme]);
  
  const renderStarters = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-40">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-24 mb-4" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    
    if (!conversationStarters || conversationStarters.length === 0) {
      return (
        <Card className="p-6 text-center">
          <p className="text-gray-500 mb-4">No conversation starters found for this theme.</p>
          <Button onClick={() => setNewStarterDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first starter
          </Button>
        </Card>
      );
    }
    
    if (selectedTheme === "All" && groupedStarters) {
      // Show starters grouped by theme
      const themes: Theme[] = ["Trust", "Intimacy", "Conflict", "Dreams", "Play", "Money"];
      
      return (
        <div className="space-y-10">
          {themes.map(theme => {
            const starters = groupedStarters[theme] || [];
            if (starters.length === 0) return null;
            
            return (
              <div key={theme}>
                <div className="flex items-center mb-4">
                  <h3 className="text-xl font-semibold">{theme}</h3>
                  <ThemeBadge theme={theme} size="small" className="ml-2" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {starters.map(starter => (
                    <StarterCard 
                      key={starter.id}
                      starter={starter}
                      isNew={starter.id === newStarterId}
                      onStartConversation={handleStartConversation}
                      onAddToDeck={handleAddToDeck}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    
    // Show starters for a specific theme
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {conversationStarters.map(starter => (
          <StarterCard 
            key={starter.id} 
            starter={starter}
            isNew={starter.id === newStarterId}
            onStartConversation={handleStartConversation}
            onAddToDeck={handleAddToDeck}
          />
        ))}
      </div>
    );
  };
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <HandDrawnUnderline>
          <h1 className="text-3xl font-bold mb-8">Conversation Starters</h1>
        </HandDrawnUnderline>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Random Starter and Create New */}
          <div className="space-y-6">
            <RandomStarter 
              starter={randomStarter} 
              isLoading={randomLoading}
              onRefresh={handleRefreshRandom}
              onStartConversation={handleStartConversation}
              onAddToDeck={handleAddToDeck}
            />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="h-5 w-5 mr-2 text-primary" />
                  Create New Starter
                </CardTitle>
                <CardDescription>
                  Add your own conversation starter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">
                  Create a thoughtful question to spark meaningful conversations with your partner.
                </p>
                <Button 
                  className="w-full" 
                  onClick={() => setNewStarterDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Starter
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column: Starters Listing */}
          <div className="md:col-span-2">
            <StartersFilterTabs value={selectedTheme} onChange={handleTabChange} />
            {renderStarters()}
          </div>
        </div>
        
        <NewStarterForm 
          isOpen={newStarterDialogOpen}
          onOpenChange={setNewStarterDialogOpen}
          onSubmit={onSubmit}
        />
      </div>
    </MainLayout>
  );
}