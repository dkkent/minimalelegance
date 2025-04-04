import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layouts/main-layout";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { ThemeBadge } from "@/components/theme-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Define the possible themes
type Theme = "Trust" | "Intimacy" | "Conflict" | "Dreams" | "Play" | "All";

export default function GardenPage() {
  const [selectedTheme, setSelectedTheme] = useState<Theme>("All");
  const [showMore, setShowMore] = useState(false);

  // Fetch loveslices
  const {
    data: loveslices,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/loveslices"],
    refetchInterval: false,
  });

  // Filter loveslices by theme if a theme is selected
  const filteredLoveslices = selectedTheme === "All"
    ? loveslices
    : loveslices?.filter((slice: any) => slice.question.theme === selectedTheme);

  // Display 6 items initially, then all when "Load more" is clicked
  const displayedLoveslices = showMore
    ? filteredLoveslices
    : filteredLoveslices?.slice(0, 6);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-10">
          <h2 className="font-serif text-3xl mb-2">Your Garden</h2>
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
            <p className="text-red-500">Failed to load your loveslices. Please try again later.</p>
          </div>
        ) : displayedLoveslices && displayedLoveslices.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedLoveslices.map((slice: any) => (
                <HandDrawnBorder
                  key={slice.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden transition duration-300 hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <ThemeBadge theme={slice.question.theme} size="small" />
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(slice.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <blockquote className="font-serif text-lg mb-4">
                      "{slice.question.content}"
                    </blockquote>
                    <div className="border-t border-gray-100 pt-4 mt-2">
                      <div className="grid grid-cols-2 gap-4">
                        {slice.responses.map((response: any, index: number) => (
                          <div key={index}>
                            <div className="flex items-center mb-2">
                              <Avatar className="h-6 w-6 rounded-full mr-2">
                                <AvatarFallback className="text-xs bg-sage-light text-sage-dark">
                                  {response.user.name.split(' ').map((n: string) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <p className="text-sm font-medium">{response.user.name.split(' ')[0]}</p>
                            </div>
                            <p className="text-sm text-gray-600 italic">"{response.content}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </HandDrawnBorder>
              ))}
            </div>
            
            {filteredLoveslices?.length > 6 && !showMore && (
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
                ? "You haven't created any Loveslices yet. Answer questions together with your partner to grow your garden."
                : `You don't have any Loveslices in the ${selectedTheme} theme yet.`}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
