import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layouts/main-layout";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { ThemeBadge } from "@/components/theme-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, ChevronRight, SkipForward } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function HomePage() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [response, setResponse] = useState("");

  // Fetch active question for home page - separate from question page
  const {
    data: activeQuestionData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/active-question", "home-page"],
    refetchInterval: false,
    queryFn: async () => {
      const res = await fetch(`/api/active-question?referer=home-page`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch active question');
      return res.json();
    }
  });
  
  // Refresh data on mount
  React.useEffect(() => {
    refetch();
  }, []);

  // Fetch loveslices for relationship view
  const { data: loveslices = [] } = useQuery<any[]>({
    queryKey: ["/api/loveslices"],
    refetchInterval: false,
  });
  
  // Fetch pending responses (questions the user has answered but partner hasn't)
  const { data: pendingResponses = [] } = useQuery<any[]>({
    queryKey: ["/api/pending-responses"],
    refetchInterval: false,
  });

  // Submit response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async ({ questionId, content }: { questionId: number; content: string }) => {
      const res = await apiRequest("POST", "/api/responses", {
        questionId,
        content,
      });
      return await res.json();
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
  });

  const handleSubmitResponse = () => {
    if (!activeQuestionData?.question?.id || !response.trim()) return;
    
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

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-10">
          <h2 className="font-serif text-3xl mb-2">
            Welcome back, <span className="font-handwritten text-sage">{user?.name.split(' ')[0]}</span>
          </h2>
          <p className="text-gray-600">Let's nurture your relationship today</p>
        </div>
        
        {/* Question of the Day Section */}
        <section className="mb-12">
          <HandDrawnBorder className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 md:p-8">
              {isLoading ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-sage" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-500">Failed to load your question. Please try again later.</p>
                </div>
              ) : activeQuestionData ? (
                <>
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-sage-light rounded-full flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-sage" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-lg">Today's Loveslice</h3>
                      <p className="text-xs text-gray-500">Theme: {activeQuestionData.question.theme}</p>
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
                    <blockquote className="font-serif text-xl md:text-2xl leading-relaxed italic mb-4">
                      "{activeQuestionData.question.content}"
                    </blockquote>
                    <p className="text-right text-sm text-gray-500">
                      {activeQuestionData.userHasAnswered && activeQuestionData.partnerHasAnswered
                        ? "Both responses complete"
                        : activeQuestionData.userHasAnswered
                        ? "Waiting for partner's response"
                        : activeQuestionData.partnerHasAnswered
                        ? "Your partner has answered - your turn!"
                        : "Waiting for both responses"}
                    </p>
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
              ) : null}
            </div>
          </HandDrawnBorder>
        </section>
        
        {/* Pending Responses Section */}
        {pendingResponses && pendingResponses.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-2xl">Pending Partner Responses</h3>
            </div>
            
            <div className="space-y-4">
              {pendingResponses.map((pendingItem: any) => (
                <HandDrawnBorder
                  key={`pending-${pendingItem.question.id}`}
                  className="bg-white rounded-lg shadow-sm overflow-hidden transition duration-300 hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <ThemeBadge theme={pendingItem.question.theme} size="small" />
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(pendingItem.answeredAt), { addSuffix: true })}
                      </span>
                    </div>
                    <blockquote className="font-serif text-lg mb-4">
                      "{pendingItem.question.content}"
                    </blockquote>
                    <div className="border-t border-gray-100 pt-4 mt-2">
                      <div className="flex items-center mb-2">
                        <Avatar className="h-6 w-6 rounded-full mr-2">
                          <AvatarFallback className="text-xs bg-sage-light text-sage-dark">
                            {user?.name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium">Your response</p>
                      </div>
                      <p className="text-sm text-gray-600 italic">"{pendingItem.userResponse.content}"</p>
                    </div>
                    <div className="mt-4 bg-lavender-light bg-opacity-30 rounded p-3 text-center">
                      <p className="text-sm text-lavender-dark">Waiting for partner to respond</p>
                    </div>
                  </div>
                </HandDrawnBorder>
              ))}
            </div>
          </section>
        )}
        
        {/* Recent Loveslices Section */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-serif text-2xl">Recent Loveslices</h3>
            <Button
              variant="link"
              className="text-sage hover:text-sage-dark"
              onClick={() => navigate("/garden")}
            >
              View all
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loveslices && loveslices.length > 0 ? (
              loveslices.slice(0, 3).map((slice: any) => (
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
              ))
            ) : (
              <div className="col-span-3 text-center py-8">
                <p className="text-gray-500">
                  You haven't created any Loveslices yet. Answer questions together with your partner to nurture your relationship.
                </p>
              </div>
            )}
          </div>
          
          {loveslices && loveslices.length > 0 && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                className="inline-flex items-center text-sage hover:text-sage-dark"
                onClick={() => navigate("/garden")}
              >
                See all loveslices
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
