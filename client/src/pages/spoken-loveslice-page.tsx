import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, ArrowLeft, Clock, Heart, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layouts/main-layout";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { ThemeBadge } from "@/components/theme-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Types
type SpokenLoveslice = {
  id: number;
  conversationId: number;
  user1Id: number;
  user2Id: number;
  outcome: "connected" | "tried_and_listened" | "hard_but_honest" | "no_outcome";
  theme: string;
  durationSeconds: number;
  createdAt: string;
  conversation: {
    id: number;
    startedAt: string;
    endedAt: string;
    messages: Message[];
  } | null;
};

type Message = {
  id: number;
  conversationId: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    profilePicture?: string;
  };
};

export default function SpokenLoveslicePage() {
  const { id: spokenLovesliceIdStr } = useParams();
  const spokenLovesliceId = spokenLovesliceIdStr ? parseInt(spokenLovesliceIdStr) : 0;
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  
  // Fetch the spoken loveslice
  const { data: spokenLoveslice, isLoading, error } = useQuery({
    queryKey: ['/api/spoken-loveslices', spokenLovesliceId],
    queryFn: async () => {
      const res = await fetch(`/api/spoken-loveslices/${spokenLovesliceId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch spoken loveslice');
      }
      return res.json();
    },
    enabled: !!spokenLovesliceId && !!user,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[70vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !spokenLoveslice) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <h1 className="text-xl font-medium mb-4">Spoken Loveslice not found</h1>
          <p className="text-gray-500 mb-6">The spoken loveslice you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => navigate("/")}>Go back home</Button>
        </div>
      </MainLayout>
    );
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  };

  const getOutcomeDisplay = (outcome: string) => {
    switch(outcome) {
      case "connected":
        return { label: "We connected", icon: <Heart className="h-4 w-4 mr-1" fill="currentColor" />, className: "bg-green-100 text-green-800" };
      case "tried_and_listened":
        return { label: "We tried and listened", icon: <MessageSquare className="h-4 w-4 mr-1" />, className: "bg-blue-100 text-blue-800" };
      case "hard_but_honest":
        return { label: "It was hard but honest", icon: null, className: "bg-amber-100 text-amber-800" };
      default:
        return { label: "Conversation", icon: null, className: "bg-gray-100 text-gray-800" };
    }
  };
  
  const outcomeInfo = getOutcomeDisplay(spokenLoveslice.outcome);
  const getInitials = (name: string = "User") => {
    return name.split(' ').map(n => n[0]).join('');
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/journal")} className="p-0 mb-4">
            <ArrowLeft className="h-5 w-5 mr-1" />
            <span>Back to Journal</span>
          </Button>
          
          <div className="text-center mb-6">
            <ThemeBadge theme={spokenLoveslice.theme} size="large" className="mb-3" />
            <h1 className="font-serif text-3xl mb-2">Spoken Loveslice</h1>
            <p className="text-gray-500">
              {formatDistanceToNow(new Date(spokenLoveslice.createdAt), { addSuffix: true })}
            </p>
          </div>
          
          <HandDrawnBorder className="bg-white p-5 rounded-lg mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
              <Badge className={cn("text-sm py-1 px-3 flex items-center", outcomeInfo.className)}>
                {outcomeInfo.icon}
                {outcomeInfo.label}
              </Badge>
              
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>Conversation lasted {formatDuration(spokenLoveslice.durationSeconds)}</span>
              </div>
            </div>
            
            <p className="text-center font-serif text-lg italic mb-4">
              "A meaningful conversation about {spokenLoveslice.theme.toLowerCase()}"
            </p>
            
            <p className="text-center text-gray-600 text-sm">
              This spoken loveslice captures a meaningful moment in your relationship journey.
              The words exchanged may fade, but the connection you formed remains.
            </p>
          </HandDrawnBorder>
        </div>
        
        {/* Conversation transcript if available */}
        {spokenLoveslice.conversation && spokenLoveslice.conversation.messages && spokenLoveslice.conversation.messages.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Conversation Transcript</CardTitle>
              <CardDescription>
                Messages from your conversation that led to this Spoken Loveslice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                {spokenLoveslice.conversation.messages.map((message: Message) => {
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
                                  <img src={message.user.profilePicture} alt={message.user?.name || "Partner"} />
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
                                  <img src={user.profilePicture} alt={user?.name || "You"} />
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
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="text-center mt-8">
          <p className="text-gray-500 mb-4">
            This Spoken Loveslice is now part of your Journal, showing your relationship's growth.
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/journal")}
            >
              Visit Journal
            </Button>
            <Button 
              onClick={() => navigate("/conversation-starters")}
            >
              Start Another Conversation
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}