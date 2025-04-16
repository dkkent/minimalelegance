import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Search, X, MessageSquare, BookOpen, Filter, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layouts/main-layout";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { ThemeBadge, type Theme } from "@/components/theme-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Types
type JournalEntry = {
  id: number;
  user1Id: number;
  user2Id: number;
  writtenLovesliceId: number | null;
  spokenLovesliceId: number | null;
  theme: Theme;
  searchableContent: string;
  createdAt: string;

  // Expanded data that might be included
  writtenLoveslice?: any;
  spokenLoveslice?: any;
};

// We'll fetch themes from the API, but include "All" option locally
const DEFAULT_THEMES: Theme[] = ["All", "Trust", "Intimacy", "Conflict", "Dreams", "Play", "Money"];

export default function JournalPage() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<Theme>("All");
  const [activeTab, setActiveTab] = useState("all");
  const [availableThemes, setAvailableThemes] = useState<Theme[]>(["All"]);
  
  // Fetch themes from the API
  const { data: themesData } = useQuery({
    queryKey: ['/api/themes'],
    queryFn: async () => {
      const response = await fetch('/api/themes');
      if (!response.ok) {
        throw new Error('Failed to fetch themes');
      }
      return response.json();
    }
  });
  
  // Update available themes when API data is loaded
  useEffect(() => {
    if (themesData?.themes && themesData.themes.length > 0) {
      // Extract theme names and add "All" option
      const themeNames = ["All", ...themesData.themes.map((t: any) => t.name)];
      setAvailableThemes(themeNames);
    } else {
      // Fallback to default themes if API fails
      setAvailableThemes(DEFAULT_THEMES);
    }
  }, [themesData]);

  // Fetch journal entries
  const { data: journalEntries, isLoading } = useQuery({
    queryKey: ['/api/journal', selectedTheme, debouncedQuery],
    queryFn: async () => {
      let url = '/api/journal';
      const params = new URLSearchParams();

      if (selectedTheme !== "All") {
        params.append('theme', selectedTheme);
      }

      if (debouncedQuery) {
        params.append('search', debouncedQuery);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch journal entries');
      }
      const data = await res.json();
      
      // Enhanced debug logging to inspect the structure of entries and profile pictures
      if (data && data.length > 0) {
        console.log('All Journal Entries:', data);
        
        // Check written loveslices
        data.forEach((entry: JournalEntry) => {
          if (entry.writtenLovesliceId && entry.writtenLoveslice && entry.writtenLoveslice.responses) {
            console.log('Written Loveslice Entry:', entry);
            
            // Log responses and their profile pictures
            entry.writtenLoveslice.responses.forEach((response: any, index: number) => {
              console.log(`Response ${index + 1} User:`, response.user);
              console.log(`Response ${index + 1} Profile Picture:`, response.user?.profilePicture);
              
              // Check if this user is the current user
              if (response.user?.id === user?.id) {
                console.log('Found current user in written loveslice responses:', response.user);
              }
            });
          }
          
          // Also check spoken loveslices
          if (entry.spokenLovesliceId && entry.spokenLoveslice) {
            console.log('Spoken Loveslice Entry:', entry);
            console.log('Spoken Loveslice User1:', entry.spokenLoveslice.user1);
            console.log('Spoken Loveslice User2:', entry.spokenLoveslice.user2);
            
            // Add explicit log to check if current user's data is properly populated
            const currentUserId = user?.id;
            if (entry.spokenLoveslice.user1?.id === currentUserId) {
              console.log('Current User (User1) Profile Picture:', entry.spokenLoveslice.user1?.profilePicture);
            } else if (entry.spokenLoveslice.user2?.id === currentUserId) {
              console.log('Current User (User2) Profile Picture:', entry.spokenLoveslice.user2?.profilePicture);
            }
          }
        });
      }
      
      return data;
    },
    enabled: !!user,
  });

  // Add timeout ref
  const searchTimeoutRef = useRef<number | null>(null);

  // Handle search input with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set a new timeout
    searchTimeoutRef.current = window.setTimeout(() => {
      setDebouncedQuery(e.target.value);
    }, 500);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
  };

  // Filter entries by type
  const getFilteredEntries = () => {
    if (!journalEntries) return [];

    switch (activeTab) {
      case 'written':
        return journalEntries.filter((entry: JournalEntry) => entry.writtenLovesliceId);
      case 'spoken':
        return journalEntries.filter((entry: JournalEntry) => entry.spokenLovesliceId);
      default:
        return journalEntries;
    }
  };

  const filteredEntries = getFilteredEntries();

  // Helper for rendering user initials
  const getInitials = (name: string = "User") => {
    return name.split(' ').map(n => n[0]).join('');
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="font-serif text-3xl mb-2">Your Journal</h1>
            <p className="text-gray-500">
              A collection of your relationship's beautiful moments and conversations
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/conversation-starters")}
            >
              Start a Conversation
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
          <div className="relative w-full sm:w-auto flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search your journal..."
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button 
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="written">Written</TabsTrigger>
                <TabsTrigger value="spoken">Spoken</TabsTrigger>
              </TabsList>
            </Tabs>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-1">
                  <Filter className="h-4 w-4 mr-1" />
                  {selectedTheme}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup value={selectedTheme} onValueChange={(value: string) => setSelectedTheme(value as Theme)}>
                  {availableThemes.map((theme: string) => (
                    <DropdownMenuRadioItem key={theme} value={theme}>
                      {theme}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search Results Message */}
        {debouncedQuery && (
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              {filteredEntries.length === 0
                ? `No results found for "${debouncedQuery}"`
                : `Showing ${filteredEntries.length} result${filteredEntries.length !== 1 ? 's' : ''} for "${debouncedQuery}"`}
            </p>
          </div>
        )}

        {/* Journal Entries */}
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEntries.length > 0 ? (
          <div className="space-y-6">
            {filteredEntries.map((entry: JournalEntry) => (
              <HandDrawnBorder
                key={entry.id}
                className="bg-white p-5 rounded-lg transition-all duration-200 hover:shadow-md"
              >
                <div className="font-serif text-2xl md:text-3xl mb-4">"{entry.writtenLoveslice?.question?.content || ''}"</div>

                {entry.writtenLovesliceId && entry.writtenLoveslice && (
                  <div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {entry.writtenLoveslice.responses.map((response: any, index: number) => (
                        <div key={index}>
                          <div className="flex items-center mb-2">
                            <UserAvatar 
                              user={response.user} 
                              fallbackText="U" 
                              className="mr-2" 
                              size="xs" 
                            />
                            <p className="text-sm font-medium">{response.user?.name || 'User'}</p>
                          </div>
                          <p className="text-gray-600 italic">"{response.content}"</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
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
                        {entry.createdAt ? formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true }) : "Date unknown"}
                      </span>
                    </div>
                  </div>
                )}

                {entry.spokenLovesliceId && entry.spokenLoveslice && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <UserAvatar 
                        user={entry.spokenLoveslice.user1} 
                        fallbackText="U1" 
                        size="xs" 
                      />
                      <UserAvatar 
                        user={entry.spokenLoveslice.user2} 
                        fallbackText="U2" 
                        size="xs" 
                      />
                      <p className="font-serif text-lg">
                        A meaningful conversation about {entry.theme.toLowerCase()}
                      </p>
                    </div>
                    <p className="text-gray-600">
                      {entry.searchableContent}
                    </p>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center gap-2">
                        <ThemeBadge theme={entry.theme as Theme} size="small" />
                        <Badge className="bg-lavender text-lavender-dark flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Spoken
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-sage hover:text-sage-dark"
                        onClick={() => navigate(`/spoken-loveslice/${entry.spokenLovesliceId}`)}
                      >
                        View conversation
                      </Button>
                    </div>
                  </div>
                )}

                {!entry.writtenLoveslice && !entry.spokenLoveslice && (
                  <div>
                    <p className="text-gray-600">
                      {entry.searchableContent}
                    </p>
                  </div>
                )}
              </HandDrawnBorder>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-100">
            {selectedTheme !== "All" || debouncedQuery ? (
              <div>
                <p className="text-gray-500 mb-4">No journal entries found with the current filters.</p>
                <Button variant="outline" onClick={() => {
                  setSelectedTheme("All" as Theme);
                  clearSearch();
                }}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 mb-2">Your journal is empty.</p>
                <p className="text-gray-500 mb-4">
                  Answer questions together or have meaningful conversations to create loveslices.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/question")}
                  >
                    Answer questions
                  </Button>
                  <Button
                    onClick={() => navigate("/conversation-starters")}
                  >
                    Start conversations
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}