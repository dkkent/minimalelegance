import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layouts/main-layout";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { ThemeBadge } from "@/components/theme-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, MessageSquare, BookOpen, Heart, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

// Define the possible themes
type Theme = "Trust" | "Intimacy" | "Conflict" | "Dreams" | "Play" | "Money" | "All";

// Types for the journal entries
type JournalEntry = {
  id: number;
  user1Id: number;
  user2Id: number;
  writtenLovesliceId: number | null;
  spokenLovesliceId: number | null;
  theme: string;
  searchableContent: string;
  createdAt: string;
  writtenLoveslice?: any;
  spokenLoveslice?: any;
};

export default function GardenPage() {
  const [selectedTheme, setSelectedTheme] = useState<Theme>("All");
  const [showMore, setShowMore] = useState(false);
  const [_, navigate] = useLocation();
  const { user } = useAuth();

  // Fetch journal entries which contain both written and spoken loveslices
  const {
    data: journalEntries,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/journal"],
    enabled: !!user,
  });

  // Filter entries by theme if a theme is selected
  const filteredEntries = selectedTheme === "All"
    ? journalEntries || []
    : (journalEntries || []).filter((entry: JournalEntry) => entry.theme === selectedTheme);

  // Display 9 items initially, then all when "Load more" is clicked
  const displayedEntries = showMore
    ? filteredEntries
    : filteredEntries.slice(0, 9);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-10">
          <h2 className="font-serif text-3xl mb-2">Your Journal</h2>
          <p className="text-gray-600">Explore your shared moments of connection</p>
        </div>
        
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm mr-2">Filter by:</span>
            <Button
              variant={selectedTheme === "All" ? "default" : "ghost"}
              className={selectedTheme === "All" ? "bg-sage text-white" : "bg-white hover:bg-sage-light text-sm"}
              size="sm"
              onClick={() => setSelectedTheme("All")}
            >
              All
            </Button>
            <Button
              variant={selectedTheme === "Trust" ? "default" : "ghost"}
              className={selectedTheme === "Trust" ? "bg-sage text-white" : "bg-white hover:bg-sage-light text-sm"}
              size="sm"
              onClick={() => setSelectedTheme("Trust")}
            >
              Trust
            </Button>
            <Button
              variant={selectedTheme === "Intimacy" ? "default" : "ghost"}
              className={selectedTheme === "Intimacy" ? "bg-sage text-white" : "bg-white hover:bg-sage-light text-sm"}
              size="sm"
              onClick={() => setSelectedTheme("Intimacy")}
            >
              Intimacy
            </Button>
            <Button
              variant={selectedTheme === "Conflict" ? "default" : "ghost"}
              className={selectedTheme === "Conflict" ? "bg-sage text-white" : "bg-white hover:bg-sage-light text-sm"}
              size="sm"
              onClick={() => setSelectedTheme("Conflict")}
            >
              Conflict
            </Button>
            <Button
              variant={selectedTheme === "Dreams" ? "default" : "ghost"}
              className={selectedTheme === "Dreams" ? "bg-sage text-white" : "bg-white hover:bg-sage-light text-sm"}
              size="sm"
              onClick={() => setSelectedTheme("Dreams")}
            >
              Dreams
            </Button>
            <Button
              variant={selectedTheme === "Play" ? "default" : "ghost"}
              className={selectedTheme === "Play" ? "bg-sage text-white" : "bg-white hover:bg-sage-light text-sm"}
              size="sm"
              onClick={() => setSelectedTheme("Play")}
            >
              Play
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-sage" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">Failed to load your journal entries. Please try again later.</p>
          </div>
        ) : displayedEntries.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedEntries.map((entry: JournalEntry) => (
                <HandDrawnBorder
                  key={entry.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden transition duration-300 hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <ThemeBadge theme={entry.theme as Theme} size="small" />
                        {entry.spokenLovesliceId ? (
                          <Badge className="bg-lavender text-lavender-dark flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Spoken
                          </Badge>
                        ) : (
                          <Badge className="bg-sage-light text-sage-dark flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            Written
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {/* Display Written Loveslice */}
                    {entry.writtenLovesliceId && entry.writtenLoveslice && (
                      <>
                        <blockquote className="font-serif text-lg mb-4">
                          "{entry.writtenLoveslice.question.content}"
                        </blockquote>
                        <div className="border-t border-gray-100 pt-4 mt-2">
                          <div className="grid grid-cols-2 gap-4">
                            {entry.writtenLoveslice.responses.map((response: any, index: number) => (
                              <div key={index}>
                                <div className="flex items-center mb-2">
                                  <Avatar className="h-6 w-6 rounded-full mr-2">
                                    <AvatarFallback className="text-xs bg-sage-light text-sage-dark">
                                      {response.user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <p className="text-sm font-medium">{response.user?.name?.split(' ')[0] || 'User'}</p>
                                </div>
                                <p className="text-sm text-gray-600 italic">"{response.content}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Display Spoken Loveslice */}
                    {entry.spokenLovesliceId && entry.spokenLoveslice && (
                      <>
                        <div className="mb-4">
                          <p className="font-serif text-lg mb-2">
                            A meaningful conversation about {entry.theme.toLowerCase()}
                          </p>
                          
                          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mt-2 mb-4">
                            {entry.spokenLoveslice.outcome && (
                              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                <Heart className="h-3 w-3" fill="currentColor" />
                                {entry.spokenLoveslice.outcome === 'connected' ? 'We connected' : 
                                 entry.spokenLoveslice.outcome === 'tried_and_listened' ? 'We tried and listened' : 
                                 entry.spokenLoveslice.outcome === 'hard_but_honest' ? 'It was hard but honest' : 
                                 'We had a conversation'}
                              </Badge>
                            )}
                            
                            {entry.spokenLoveslice.durationSeconds && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>
                                  {Math.floor(entry.spokenLoveslice.durationSeconds / 60)} min
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-gray-600 text-sm">{entry.searchableContent}</p>
                        </div>
                        <div className="text-right mt-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-sage hover:text-sage-dark"
                            onClick={() => navigate(`/spoken-loveslice/${entry.spokenLovesliceId}`)}
                          >
                            View details
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </HandDrawnBorder>
              ))}
            </div>
            
            {filteredEntries.length > 9 && !showMore && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  className="inline-flex items-center text-sage hover:text-sage-dark"
                  onClick={() => setShowMore(true)}
                >
                  Load more
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500">
              {selectedTheme === "All"
                ? "You haven't created any Loveslices yet. Answer questions together or have meaningful conversations with your partner to grow your garden."
                : `You don't have any Loveslices in the ${selectedTheme} theme yet.`}
            </p>
            <div className="flex justify-center gap-4 mt-6">
              <Button
                variant="outline"
                onClick={() => navigate("/question")}
              >
                Answer Questions
              </Button>
              <Button
                onClick={() => navigate("/conversation-starters")}
              >
                Start Conversations
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
