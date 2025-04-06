import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layouts/main-layout";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { ThemeBadge } from "@/components/theme-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Loader2, ChevronRight, SkipForward } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";

export default function HomePage() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [response, setResponse] = useState("");

  // Keep track of the current question for animation
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Safe fallback for theme values
  const getThemeSafely = (item: any): string => {
    try {
      // First try the most common structure
      if (item?.question?.theme) {
        return item.question.theme;
      }
      
      // Try secondary structures
      if (item?.theme) {
        return item.theme;
      }
      
      if (item?.question_id && item?.question?.theme) {
        return item.question.theme;
      }
      
      // Default fallback
      return "Trust";
    } catch (err) {
      console.error("Error getting theme:", err);
      return "Trust";
    }
  };
  
  // Safe fallback for content
  const getContentSafely = (item: any): string => {
    try {
      if (item?.question?.content) {
        return item.question.content;
      }
      
      if (item?.content) {
        return item.content;
      }
      
      if (item?.question_id && item?.question?.content) {
        return item.question.content;
      }
      
      return "What's important to you in this relationship?";
    } catch (err) {
      console.error("Error getting content:", err);
      return "What's important to you in this relationship?";
    }
  };
  
  // Fetch active question for home page - separate from question page
  const {
    data: activeQuestionData,
    isLoading: isActiveQuestionLoading,
    error: activeQuestionError,
    refetch,
  } = useQuery({
    queryKey: ["/api/active-question", "home-page"],
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 2,
    queryFn: async () => {
      try {
        const res = await fetch(`/api/active-question?referer=home-page`, {
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
          console.error(`Failed to fetch active question: ${res.status}`);
          throw new Error('Failed to fetch active question');
        }
        return res.json();
      } catch (err) {
        console.error("Error fetching active question:", err);
        throw err;
      }
    }
  });
  
  // Watch for question changes and trigger animation
  useEffect(() => {
    if (activeQuestionData?.question?.id && 
        currentQuestionId !== null && 
        activeQuestionData.question.id !== currentQuestionId) {
      setIsAnimating(true);
      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 1000); // Match this with animation duration
      return () => clearTimeout(timer);
    }
    
    // Set current question ID when data is first loaded
    if (activeQuestionData?.question?.id && !currentQuestionId) {
      setCurrentQuestionId(activeQuestionData.question.id);
    }
  }, [activeQuestionData, currentQuestionId]);
  
  // Refresh data on mount
  useEffect(() => {
    refetch();
  }, []);

  // Fetch loveslices for relationship view
  const { 
    data: loveslices = [], 
    isLoading: isLoveslicesLoading,
    error: loveslicesError 
  } = useQuery<any[]>({
    queryKey: ["/api/loveslices"],
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 2,
    onError: (error) => {
      console.error("Error fetching loveslices:", error);
    }
  });
  
  // Fetch pending responses (both user's own responses waiting for partner and partner's responses waiting for user)
  const { 
    data: pendingResponses = [],
    isLoading: isPendingResponsesLoading,
    error: pendingResponsesError
  } = useQuery<any[]>({
    queryKey: ["/api/pending-responses"],
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 2,
    onSuccess: (data) => {
      console.log("Pending responses loaded:", data.length);
    },
    onError: (error: any) => {
      console.error("Error fetching pending responses:", error);
    }
  });

  // Submit response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async ({ questionId, content }: { questionId: number; content: string }) => {
      try {
        const res = await apiRequest("POST", "/api/responses", {
          questionId,
          content,
        });
        return await res.json();
      } catch (err) {
        console.error("Error submitting response:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      if (data.lovesliceCreated) {
        // If a loveslice was created, navigate to the reveal page
        navigate(`/reveal/${data.lovesliceId}`);
      } else {
        // Otherwise just refetch the active question and pending responses
        queryClient.invalidateQueries({ queryKey: ["/api/active-question", "home-page"] });
        queryClient.invalidateQueries({ queryKey: ["/api/active-question", "question-page"] });
        queryClient.invalidateQueries({ queryKey: ["/api/pending-responses"] });
        setResponse("");
      }
    },
    onError: (error) => {
      console.error("Error in submit response mutation:", error);
    }
  });

  const handleSubmitResponse = () => {
    if (!activeQuestionData?.question?.id || !response.trim()) return;
    
    // Store the current question ID before submitting
    setCurrentQuestionId(activeQuestionData.question.id);
    
    // The mutation will trigger the animation when the new question is loaded
    submitResponseMutation.mutate({
      questionId: activeQuestionData.question.id,
      content: response.trim(),
    });
  };

  const handleSkip = () => {
    // In a real app, we'd have an API endpoint to skip a question
    // For now, we'll just clear the response
    setResponse("");
  };

  // Render different loading states
  const isLoading = isActiveQuestionLoading || isLoveslicesLoading || isPendingResponsesLoading;
  const hasError = activeQuestionError || loveslicesError || pendingResponsesError;

  // Safely check for responses existence before mapping
  const hasResponses = (slice: any) => {
    return slice && slice.responses && Array.isArray(slice.responses) && slice.responses.length > 0;
  };
  
  if (hasError) {
    console.error("Errors detected:", { 
      activeQuestionError, 
      loveslicesError, 
      pendingResponsesError 
    });
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-10">
          <h2 className="font-serif text-3xl mb-2">
            Welcome back, <span className="font-handwritten text-sage">{user?.name ? user.name.split(' ')[0] : 'Friend'}</span>
          </h2>
          <p className="text-gray-600">Let's nurture your relationship today</p>
        </div>
        
        {/* Question of the Day Section */}
        <section className="mb-12">
          <HandDrawnBorder className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 md:p-8">
              {isActiveQuestionLoading ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-sage" />
                </div>
              ) : activeQuestionError ? (
                <div className="text-center py-8">
                  <p className="text-red-500">Failed to load your question. Please try again later.</p>
                </div>
              ) : activeQuestionData?.question ? (
                <>
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-sage-light rounded-full flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-sage" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-lg">Today's Loveslice</h3>
                      <p className="text-xs text-gray-500">
                        Theme: {activeQuestionData.question?.theme || "Trust"}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span className="bg-lavender-light text-lavender-dark text-xs py-1 px-2 rounded-full">New</span>
                    </div>
                  </div>
                  
                  <div className="bg-cream bg-opacity-50 rounded-lg p-6 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="text-sage">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </div>
                    
                    {/* Question animation with framer-motion */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeQuestionData.question.id}
                        initial={isAnimating ? { x: 100, opacity: 0 } : { x: 0, opacity: 1 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100, opacity: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 500, 
                          damping: 30,
                          duration: 0.5
                        }}
                      >
                        <blockquote className="font-serif text-xl md:text-2xl leading-relaxed italic mb-4">
                          "{activeQuestionData.question.content || "What matters most to you in this relationship?"}"
                        </blockquote>
                      </motion.div>
                    </AnimatePresence>
                    
                    <motion.p 
                      className="text-right text-sm text-gray-500"
                      animate={{ opacity: isAnimating ? 0 : 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {activeQuestionData.userHasAnswered && activeQuestionData.partnerHasAnswered
                        ? "Both responses complete"
                        : activeQuestionData.userHasAnswered
                        ? "Waiting for partner's response"
                        : activeQuestionData.partnerHasAnswered
                        ? "Your partner has answered - your turn!"
                        : "Waiting for both responses"}
                    </motion.p>
                  </div>
                  
                  {!activeQuestionData.userHasAnswered ? (
                    <>
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <label htmlFor="answer" className="block text-sm font-medium">Your answer</label>
                          <span className="text-xs text-gray-500">Private until partner answers</span>
                        </div>
                        <Textarea
                          id="answer"
                          rows={4}
                          className="w-full p-3 border border-lavender-light rounded-lg focus:outline-none focus:ring-1 focus:ring-sage"
                          placeholder="Share your thoughts..."
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex justify-between">
                        <Button
                          variant="ghost"
                          className="text-sage-dark hover:text-sage hover:bg-transparent"
                          onClick={handleSkip}
                        >
                          <SkipForward className="w-4 h-4 mr-1" />
                          Skip for now
                        </Button>
                        <Button
                          onClick={handleSubmitResponse}
                          disabled={!response.trim() || submitResponseMutation.isPending}
                          className="bg-sage hover:bg-sage-dark text-white"
                        >
                          {submitResponseMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Response"
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-sage-light bg-opacity-50 rounded-lg p-4 text-center">
                      <p className="text-sage-dark">
                        You've answered this question. Waiting for your partner to respond.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No active question found. Check back later.</p>
                </div>
              )}
            </div>
          </HandDrawnBorder>
        </section>
        
        {/* Pending Responses Section */}
        {!isPendingResponsesLoading && !pendingResponsesError && pendingResponses && pendingResponses.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-2xl">Pending Responses</h3>
            </div>
            
            <div className="space-y-4">
              {pendingResponses.map((pendingItem: any, index: number) => (
                <HandDrawnBorder
                  key={`pending-${index}-${pendingItem.question?.id || index}`}
                  className="bg-white rounded-lg shadow-sm overflow-hidden transition duration-300 hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <ThemeBadge theme={getThemeSafely(pendingItem)} size="small" />
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(pendingItem.answeredAt || new Date()), { addSuffix: true })}
                      </span>
                    </div>
                    <blockquote className="font-serif text-lg mb-4">
                      "{getContentSafely(pendingItem)}"
                    </blockquote>
                    
                    {/* If this is a question that your partner has answered but you haven't */}
                    {pendingItem.waitingForYou && pendingItem.partnerResponse && (
                      <div className="border-t border-gray-100 pt-4 mt-2">
                        <div className="flex items-center mb-2">
                          <UserAvatar 
                            user={pendingItem.partnerResponse.user} 
                            fallbackText="P" 
                            size="xs" 
                            className="mr-2" 
                          />
                          <p className="text-sm font-medium">Partner's response</p>
                        </div>
                        <p className="text-sm text-gray-600 italic">
                          <span className="bg-sage-light bg-opacity-30 px-3 py-1 rounded">
                            Answer the question to reveal your partner's response
                          </span>
                        </p>
                        <div className="mt-4 bg-sage-light bg-opacity-30 rounded p-3 text-center">
                          <p className="text-sm text-sage-dark">
                            <Button
                              size="sm"
                              className="bg-sage hover:bg-sage-dark text-white"
                              onClick={() => navigate(`/question/${pendingItem.question.id}`)}
                            >
                              Answer this question
                            </Button>
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* If this is a question that you answered but your partner hasn't */}
                    {pendingItem.waitingForPartner && pendingItem.userResponse && (
                      <div className="border-t border-gray-100 pt-4 mt-2">
                        <div className="flex items-center mb-2">
                          <UserAvatar 
                            user={pendingItem.userResponse.user || user} 
                            fallbackText="U" 
                            size="xs" 
                            className="mr-2" 
                          />
                          <p className="text-sm font-medium">Your response</p>
                        </div>
                        <p className="text-sm text-gray-600 italic">
                          "{pendingItem.userResponse.content || "Your response is saved."}"
                        </p>
                        <div className="mt-4 bg-lavender-light bg-opacity-30 rounded p-3 text-center">
                          <p className="text-sm text-lavender-dark">Waiting for partner to respond</p>
                        </div>
                      </div>
                    )}
                  </div>
                </HandDrawnBorder>
              ))}
            </div>
          </section>
        )}
        
        {/* We've removed the Recent Loveslices section as requested for the MVP */}
      </div>
    </MainLayout>
  );
}
