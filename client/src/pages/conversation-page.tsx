import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, Send, Clock, Check, ArrowLeft, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { MainLayout } from "@/components/layouts/main-layout";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { ThemeBadge } from "@/components/theme-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types
type Conversation = {
  id: number;
  lovesliceId: number | null;
  starterId: number | null;
  initiatedByUserId: number;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  outcome: "connected" | "tried_and_listened" | "hard_but_honest" | "no_outcome";
  createdSpokenLoveslice: boolean;
  
  // Additional fields that may be included
  starter?: {
    id: number;
    content: string;
    theme: string;
  };
  loveslice?: any;
  messages?: Message[];
};

type Message = {
  id: number;
  conversationId: number;
  userId: number;
  content: string;
  createdAt: string;
  
  // Added for display purposes
  user?: {
    id: number;
    name: string;
  };
};

export default function ConversationPage() {
  const { id: conversationIdStr } = useParams();
  const conversationId = parseInt(conversationIdStr);
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<string>("connected");
  const [selectedTheme, setSelectedTheme] = useState<string>("Trust");
  const [createSpokenLoveslice, setCreateSpokenLoveslice] = useState(true);
  
  // Fetch the conversation and its messages
  const { data: conversation, isLoading, error } = useQuery({
    queryKey: ['/api/conversations', conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch conversation');
      }
      return res.json();
    },
    enabled: !!conversationId && !!user,
  });

  // Mutation to send a new message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', `/api/conversations/${conversationId}/messages`, { content });
      return res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to end the conversation
  const endConversationMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        outcome: selectedOutcome,
        createSpokenLoveslice,
        theme: selectedTheme,
      };
      const res = await apiRequest('PATCH', `/api/conversations/${conversationId}/end`, payload);
      return res.json();
    },
    onSuccess: (data) => {
      setIsEndDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
      
      if (data.spokenLoveslice) {
        toast({
          title: "Conversation ended",
          description: "A beautiful Spoken Loveslice has been created!",
        });
      } else {
        toast({
          title: "Conversation ended",
          description: "Your conversation has been saved.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to end conversation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleEndConversation = () => {
    endConversationMutation.mutate();
  };

  // Scroll to bottom of messages whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation?.messages]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[70vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !conversation) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <h1 className="text-xl font-medium mb-4">Conversation not found</h1>
          <p className="text-gray-500 mb-6">The conversation you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => navigate("/")}>Go back home</Button>
        </div>
      </MainLayout>
    );
  }

  const isEnded = !!conversation.endedAt;
  const otherUserId = user?.partnerId;
  const conversationSource = conversation.loveslice 
    ? "Loveslice" 
    : conversation.starter 
      ? "Conversation Starter" 
      : "Direct conversation";

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="p-0 mr-4">
            <ArrowLeft className="h-5 w-5 mr-1" />
            <span>Back</span>
          </Button>
          
          <div className="flex-1">
            <h1 className="text-xl font-serif">
              {conversation.starter
                ? `Talking about: "${conversation.starter.content}"`
                : conversation.loveslice
                  ? `Discussing your Loveslice`
                  : `Conversation`}
            </h1>
            <div className="flex items-center text-sm text-gray-500">
              <span className="mr-4">
                Started {formatDistanceToNow(new Date(conversation.startedAt), { addSuffix: true })}
              </span>
              
              {conversation.starter && (
                <ThemeBadge theme={conversation.starter.theme} size="small" />
              )}
              
              {conversation.loveslice && (
                <ThemeBadge theme={conversation.loveslice.question.theme} size="small" />
              )}
            </div>
          </div>
          
          {!isEnded && (
            <Button 
              variant="outline" 
              onClick={() => setIsEndDialogOpen(true)}
              className="ml-2 text-gray-600"
            >
              End conversation
            </Button>
          )}
        </div>
        
        {/* Source content */}
        {conversation.loveslice && (
          <HandDrawnBorder className="mb-6 bg-white p-4 rounded-lg">
            <div className="mb-3">
              <span className="text-sm text-gray-500">From your Loveslice:</span>
            </div>
            <blockquote className="font-serif text-lg mb-3">
              "{conversation.loveslice.question.content}"
            </blockquote>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {conversation.loveslice.responses.map((response: any, index: number) => (
                <div key={index} className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <Avatar className="h-6 w-6 rounded-full mr-2">
                      <AvatarFallback className="text-xs bg-sage-light text-sage-dark">
                        {getInitials(response.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium">{response.user.name}</p>
                  </div>
                  <p className="text-sm text-gray-600 italic">"{response.content}"</p>
                </div>
              ))}
            </div>
          </HandDrawnBorder>
        )}
        
        {conversation.starter && (
          <HandDrawnBorder className="mb-6 bg-white p-4 rounded-lg">
            <div className="mb-3">
              <span className="text-sm text-gray-500">Conversation starter:</span>
            </div>
            <blockquote className="font-serif text-lg">
              "{conversation.starter.content}"
            </blockquote>
          </HandDrawnBorder>
        )}
        
        {/* Messages */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Messages
            </CardTitle>
            {isEnded && (
              <CardDescription>
                This conversation has ended {conversation.outcome !== "no_outcome" && `with outcome: ${conversation.outcome.replace(/_/g, ' ')}`}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto p-1">
              {conversation.messages && conversation.messages.length > 0 ? (
                conversation.messages.map((message) => {
                  const isCurrentUser = message.userId === user?.id;
                  return (
                    <div 
                      key={message.id} 
                      className={cn(
                        "flex", 
                        isCurrentUser ? "justify-end" : "justify-start"
                      )}
                    >
                      <div 
                        className={cn(
                          "max-w-[80%] rounded-lg p-3",
                          isCurrentUser 
                            ? "bg-sage text-white rounded-tr-none" 
                            : "bg-gray-100 text-gray-800 rounded-tl-none"
                        )}
                      >
                        <div className="flex items-center mb-1">
                          {!isCurrentUser && (
                            <>
                              <Avatar className="h-5 w-5 rounded-full mr-2">
                                <AvatarFallback className="text-xs bg-lavender-light text-lavender-dark">
                                  {getInitials(message.user?.name || "Partner")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium mr-2">
                                {message.user?.name || "Partner"}
                              </span>
                            </>
                          )}
                          <span className="text-xs opacity-70">
                            {format(new Date(message.createdAt), 'h:mm a')}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No messages yet. Start the conversation by sending a message.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message input */}
            {!isEnded && (
              <form onSubmit={handleSendMessage} className="mt-6">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="resize-none flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={sendMessageMutation.isPending || !newMessage.trim()}
                  >
                    {sendMessageMutation.isPending ? 
                      <Loader2 className="h-5 w-5 animate-spin" /> : 
                      <Send className="h-5 w-5" />
                    }
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
        
        {/* End Conversation Dialog */}
        <Dialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>End this conversation</DialogTitle>
              <DialogDescription>
                How would you describe this conversation? Your reflection helps nurture your relationship garden.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">How did this conversation feel?</label>
                <Select value={selectedOutcome} onValueChange={setSelectedOutcome}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select how the conversation went" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connected">We connected</SelectItem>
                    <SelectItem value="tried_and_listened">We tried and listened</SelectItem>
                    <SelectItem value="hard_but_honest">It was hard but honest</SelectItem>
                    <SelectItem value="no_outcome">I'd rather not say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Create a Spoken Loveslice?</label>
                  <Button
                    variant={createSpokenLoveslice ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCreateSpokenLoveslice(!createSpokenLoveslice)}
                    className="h-8"
                  >
                    {createSpokenLoveslice ? <Check className="h-4 w-4 mr-1" /> : null}
                    {createSpokenLoveslice ? "Yes" : "No"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Spoken Loveslices are meaningful moments of connection that help your garden grow.
                </p>
              </div>
              
              {createSpokenLoveslice && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Trust">Trust</SelectItem>
                      <SelectItem value="Intimacy">Intimacy</SelectItem>
                      <SelectItem value="Conflict">Conflict</SelectItem>
                      <SelectItem value="Dreams">Dreams</SelectItem>
                      <SelectItem value="Play">Play</SelectItem>
                      <SelectItem value="Money">Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3">
              <Button variant="outline" onClick={() => setIsEndDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleEndConversation}
                disabled={endConversationMutation.isPending}
              >
                {endConversationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ending...
                  </>
                ) : (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    End Conversation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}