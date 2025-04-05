import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, Send, Clock, Check, ArrowLeft, MessageSquare, AlertCircle, Bell } from "lucide-react";
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
  
  // Shared ending flow fields
  endInitiatedByUserId: number | null;
  endInitiatedAt: string | null;
  endConfirmedByUserId: number | null;
  endConfirmedAt: string | null;
  finalNote: string | null;
  
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
    profilePicture?: string;
  };
};

export default function ConversationPage() {
  const { id: conversationIdStr } = useParams();
  const conversationId = conversationIdStr ? parseInt(conversationIdStr) : 0;
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<string>("connected");
  const [selectedTheme, setSelectedTheme] = useState<string>("Trust");
  const [createSpokenLoveslice, setCreateSpokenLoveslice] = useState(true);
  const [continueOffline, setContinueOffline] = useState(false);
  
  // State for the shared conversation ending flow
  const [sharedEndingModalOpen, setSharedEndingModalOpen] = useState(false);
  const [endRequestedBy, setEndRequestedBy] = useState<string | null>(null);
  const [endingNote, setEndingNote] = useState("");
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  
  // Fetch the conversation and its messages
  const { data: conversation, isLoading, error } = useQuery({
    queryKey: ['/api/conversations', conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch conversation');
      }
      const data = await res.json();
      console.log("Conversation data received:", data);
      return data;
    },
    enabled: !!conversationId && !!user,
  });
  
  // Debug logging
  useEffect(() => {
    if (conversation) {
      console.log("Conversation data available:", conversation);
      console.log("Has starter:", !!conversation.starter);
      if (conversation.starter) {
        console.log("Starter content:", conversation.starter.content);
      }
    }
  }, [conversation]);
  
  // WebSocket connection setup
  useEffect(() => {
    if (!user) return;
    
    // Set up WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log("WebSocket connection established");
      // Authenticate with user ID
      socket.send(JSON.stringify({
        type: 'auth',
        userId: user.id
      }));
      socketRef.current = socket;
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);
        
        // Update conversion to number to ensure consistent comparison
        const messageConversationId = parseInt(data.conversationId);
        
        // Only process messages for this conversation
        if (messageConversationId === conversationId) {
          // Handle direct initiate ending message
          if (data.type === 'initiate_ending') {
            const requesterName = data.userName || "Your partner";
            setEndRequestedBy(requesterName);
            setSharedEndingModalOpen(true);
            
            toast({
              title: "Conversation ending requested",
              description: `${requesterName} would like to end this conversation.`,
            });
          }
          
          // Handle direct confirm ending message
          else if (data.type === 'confirm_ending') {
            setWaitingForPartner(false);
            
            toast({
              title: "Conversation ended",
              description: `${data.userName || "Your partner"} has confirmed the end of this conversation.`,
            });
            
            // Refresh conversation data
            queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
          }
          
          // Handle direct cancel ending message
          else if (data.type === 'cancel_ending') {
            setSharedEndingModalOpen(false);
            
            toast({
              title: "Request cancelled",
              description: `${data.userName || "Your partner"} has cancelled their request to end the conversation.`,
            });
            
            // Refresh conversation data
            queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
          }
          
          // Legacy server-side message handling (keeping for backward compatibility)
          // Handle conversation ending request from partner
          else if (data.type === 'ending_requested') {
            const requesterName = data.requestedBy?.name || "Your partner";
            setEndRequestedBy(requesterName);
            setSharedEndingModalOpen(true);
          }
          
          // Handle conversation ending confirmation from partner
          else if (data.type === 'ending_confirmed') {
            setWaitingForPartner(false);
            
            toast({
              title: "Conversation ended",
              description: "Your partner has confirmed the end of this conversation.",
            });
            
            // Refresh conversation data
            queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
          }
          
          // Handle conversation ending cancellation from partner
          else if (data.type === 'ending_cancelled') {
            setSharedEndingModalOpen(false);
            
            toast({
              title: "Request cancelled",
              description: "Your partner has cancelled their request to end the conversation.",
            });
          }
          
          // Handle final note added by partner
          else if (data.type === 'final_note_added') {
            toast({
              title: "Final note added",
              description: "Your partner has added a final reflection to this conversation.",
            });
            
            // Refresh conversation data to see the final note
            queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
      socketRef.current = null;
    };
    
    // Clean up WebSocket connection when component unmounts
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [user, conversationId, toast]);

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

  // Mutation to initiate the shared conversation ending
  const initiateEndingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PATCH', `/api/conversations/${conversationId}/initiate-end`, { 
        userId: user?.id 
      });
      
      // Also send real-time notification via WebSocket if connected
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && user?.partnerId) {
        socketRef.current.send(JSON.stringify({
          type: 'initiate_ending',
          conversationId,
          partnerId: user.partnerId,
          userName: user.name
        }));
        console.log('Sent WebSocket end request notification to partner');
      }
      
      return res.json();
    },
    onSuccess: () => {
      setIsEndDialogOpen(false);
      setWaitingForPartner(true);
      
      toast({
        title: "Request sent",
        description: "Your partner has been notified that you'd like to end this conversation.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send ending request",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to confirm the conversation ending
  const confirmEndingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PATCH', `/api/conversations/${conversationId}/confirm-end`, { 
        userId: user?.id 
      });
      
      // Also send real-time notification via WebSocket if connected
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && user?.partnerId) {
        socketRef.current.send(JSON.stringify({
          type: 'confirm_ending',
          conversationId,
          partnerId: user.partnerId,
          userName: user.name
        }));
        console.log('Sent WebSocket end confirmation to partner');
      }
      
      return res.json();
    },
    onSuccess: () => {
      setSharedEndingModalOpen(false);
      
      toast({
        title: "Ending confirmed",
        description: "You've confirmed the end of this conversation.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to confirm ending",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to add a final note to the conversation
  const addFinalNoteMutation = useMutation({
    mutationFn: async () => {
      try {
        const res = await apiRequest('PATCH', `/api/conversations/${conversationId}/final-note`, { 
          note: endingNote 
        });
        
        // Also send real-time notification via WebSocket if connected
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && user?.partnerId) {
          socketRef.current.send(JSON.stringify({
            type: 'final_note_added',
            conversationId,
            partnerId: user.partnerId,
            userName: user.name,
            note: endingNote
          }));
          console.log('Sent WebSocket final note notification to partner');
        }
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Final note error response:', errorText);
          throw new Error(`Failed to add final note: ${res.status} ${res.statusText}`);
        }
        
        return await res.json();
      } catch (error) {
        console.error('Error adding final note:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
      toast({
        title: "Note added",
        description: "Your reflection has been added to this conversation.",
      });
    },
    onError: (error: Error) => {
      console.error('Final note mutation error:', error);
      toast({
        title: "Failed to add note",
        description: error.message || "There was a problem saving your note. Please try again.",
        variant: "destructive"
      });
    },
  });
  
  // Mutation to cancel the conversation ending
  const cancelEndingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PATCH', `/api/conversations/${conversationId}/cancel-end`, {});
      
      // Also send real-time notification via WebSocket if connected
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && user?.partnerId) {
        socketRef.current.send(JSON.stringify({
          type: 'cancel_ending',
          conversationId,
          partnerId: user.partnerId,
          userName: user.name
        }));
        console.log('Sent WebSocket cancel request notification to partner');
      }
      
      return res.json();
    },
    onSuccess: () => {
      setWaitingForPartner(false);
      toast({
        title: "Ending canceled",
        description: "The conversation ending has been canceled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel ending",
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
        continueOffline
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

  const handleInitiateEnding = () => {
    initiateEndingMutation.mutate();
  };
  
  const handleConfirmEnding = () => {
    confirmEndingMutation.mutate();
  };
  
  const handleCancelEnding = () => {
    cancelEndingMutation.mutate();
  };
  
  const handleSubmitFinalNote = () => {
    if (endingNote.trim()) {
      addFinalNoteMutation.mutate();
    }
  };

  const handleEndConversation = () => {
    // Use shared flow if partner is available, otherwise just end
    if (user?.partnerId) {
      handleInitiateEnding();
    } else {
      endConversationMutation.mutate();
    }
  };

  // Update state based on conversation status changes
  useEffect(() => {
    // If we initiated the ending and it's not ended yet, show waiting state
    if (conversation?.endInitiatedAt && !conversation?.endedAt && 
        conversation.endInitiatedByUserId === user?.id && !waitingForPartner) {
      setWaitingForPartner(true);
    }
    
    // If the conversation was ended, make sure we're not in waiting state
    if (conversation?.endedAt && waitingForPartner) {
      setWaitingForPartner(false);
    }
    
    // Send WebSocket messages when needed
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && user && user.partnerId) {
      // Handle any WebSocket messaging needs based on conversation state
      // This will be used for conversation sync messages like ending requests
    }
  }, [conversation, user, waitingForPartner]);
  
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
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="p-0 mr-4">
            <ArrowLeft className="h-5 w-5 mr-1" />
            <span>Back</span>
          </Button>
          
          <div className="flex-1">
            <h1 className="text-xl font-serif">
              {conversation.starter
                ? `Conversation`
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
        
        {/* Conversation Starter */}
        {conversation.starter && (
          <HandDrawnBorder className="mb-6 bg-white p-4 rounded-lg border-2 border-sage/30">
            <div className="mb-2">
              <span className="text-sm font-medium text-sage">Conversation Starter:</span>
            </div>
            <blockquote className="font-serif text-xl">
              "{conversation.starter.content}"
            </blockquote>
          </HandDrawnBorder>
        )}
        
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
                      {response.user?.profilePicture ? (
                        <img 
                          src={response.user.profilePicture} 
                          alt={response.user.name} 
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <AvatarFallback className="text-xs bg-sage-light text-sage-dark">
                          {getInitials(response.user.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <p className="text-sm font-medium">{response.user.name}</p>
                  </div>
                  <p className="text-sm text-gray-600 italic">"{response.content}"</p>
                </div>
              ))}
            </div>
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
                conversation.messages.map((message: Message) => {
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
                          {!isCurrentUser ? (
                            <>
                              <Avatar className="h-5 w-5 rounded-full mr-2">
                                {message.user?.profilePicture ? (
                                  <img 
                                    src={message.user.profilePicture} 
                                    alt={message.user?.name || "Partner"} 
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <AvatarFallback className="text-xs bg-lavender-light text-lavender-dark">
                                    {getInitials(message.user?.name || "Partner")}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <span className="text-xs font-medium mr-2">
                                {message.user?.name || "Partner"}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-medium ml-auto mr-2">
                                {user?.name || "You"}
                              </span>
                              <Avatar className="h-5 w-5 rounded-full">
                                {user?.profilePicture ? (
                                  <img 
                                    src={user.profilePicture} 
                                    alt={user?.name || "You"} 
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <AvatarFallback className="text-xs bg-sage-light text-sage-dark">
                                    {getInitials(user?.name || "You")}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            </>
                          )}
                          <span className="text-xs opacity-70 ml-2">
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
                How would you describe this conversation? Your reflection helps nurture your relationship journey.
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
                  Spoken Loveslices are meaningful moments of connection that help your relationship grow.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Continue offline?</label>
                  <Button
                    variant={continueOffline ? "default" : "outline"}
                    size="sm"
                    onClick={() => setContinueOffline(!continueOffline)}
                    className="h-8"
                  >
                    {continueOffline ? <Check className="h-4 w-4 mr-1" /> : null}
                    {continueOffline ? "Yes" : "No"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Choose this if you'll continue this conversation in person. We'll track it as a loveslice!
                </p>
              </div>
              
              {(createSpokenLoveslice || continueOffline) && (
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
                disabled={endConversationMutation.isPending || initiateEndingMutation.isPending}
              >
                {(endConversationMutation.isPending || initiateEndingMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {user?.partnerId ? "Notifying partner..." : "Ending..."}
                  </>
                ) : (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    {user?.partnerId ? "Notify partner & end" : "End conversation"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Partner end request dialog */}
        <Dialog open={sharedEndingModalOpen} onOpenChange={setSharedEndingModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />
                Conversation ending requested
              </DialogTitle>
              <DialogDescription>
                {endRequestedBy} would like to end this conversation. Would you like to confirm?
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <p className="text-sm">
                By confirming, you'll both have a chance to reflect on this conversation together.
              </p>
              
              <div className="p-3 bg-sage/10 rounded-md space-y-3">
                <h4 className="text-sm font-medium">Add a final reflection (optional)</h4>
                <Textarea
                  value={endingNote}
                  onChange={(e) => setEndingNote(e.target.value)}
                  placeholder="What will you remember from this conversation?"
                  className="min-h-[80px]"
                />
                <p className="text-xs text-gray-500">
                  This note will be shared with your partner and saved with this conversation.
                </p>
              </div>
            </div>
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleSubmitFinalNote}
                disabled={addFinalNoteMutation.isPending || !endingNote.trim()}
                variant="outline"
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                {addFinalNoteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving note...
                  </>
                ) : "Save note"}
              </Button>
              <Button 
                onClick={handleConfirmEnding}
                disabled={confirmEndingMutation.isPending}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {confirmEndingMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : "Confirm ending"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Waiting for partner dialog */}
        {waitingForPartner && !isEnded && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-sage/20 p-3">
                    <Bell className="h-6 w-6 text-sage animate-pulse" />
                  </div>
                </div>
                <h3 className="text-lg font-medium">Waiting for partner</h3>
                <p className="text-gray-600">
                  You've requested to end this conversation. Waiting for your partner to respond...
                </p>
                
                <div className="p-3 bg-sage/10 rounded-md space-y-3">
                  <h4 className="text-sm font-medium">Add a final reflection (optional)</h4>
                  <Textarea
                    value={endingNote}
                    onChange={(e) => setEndingNote(e.target.value)}
                    placeholder="What will you remember from this conversation?"
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-gray-500">
                    This note will be shared with your partner and saved with this conversation.
                  </p>
                </div>
                
                <div className="pt-4 flex gap-3 flex-col sm:flex-row">
                  <Button 
                    onClick={handleCancelEnding}
                    disabled={cancelEndingMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {cancelEndingMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : "Cancel request"}
                  </Button>
                  <Button 
                    onClick={handleSubmitFinalNote}
                    disabled={addFinalNoteMutation.isPending || !endingNote.trim()}
                    className="w-full"
                  >
                    {addFinalNoteMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving note...
                      </>
                    ) : "Save note"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}