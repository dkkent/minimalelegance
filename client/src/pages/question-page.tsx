import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layouts/main-layout";
import { ThemeBadge } from "@/components/theme-badge";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, SkipForward, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function QuestionPage() {
  const [_, navigate] = useLocation();
  const params = useParams();
  const questionId = params?.id ? parseInt(params.id) : null;
  const auth = useAuth();
  
  const [response, setResponse] = useState("");
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [questionData, setQuestionData] = useState<any>(null);
  
  // If we have a specific questionId from the URL, fetch that question directly
  const {
    data: specificQuestionData,
    isLoading: isSpecificQuestionLoading,
    error: specificQuestionError,
  } = useQuery({
    queryKey: ["/api/questions", questionId],
    enabled: !!questionId,
    queryFn: async () => {
      const res = await fetch(`/api/questions/${questionId}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch question');
      return res.json();
    }
  });

  // If no questionId in URL, use the active question
  const {
    data: activeQuestionData,
    isLoading: isActiveQuestionLoading,
    error: activeQuestionError,
    refetch: refetchActiveQuestion,
  } = useQuery({
    queryKey: ["/api/active-question", "question-page"],
    enabled: !questionId,
    refetchInterval: false,
    queryFn: async () => {
      const res = await fetch(`/api/active-question?referer=question-page`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch active question');
      return res.json();
    }
  });
  
  // Consolidate question data from either source
  // Fetch partner response data if coming from a pending response
  const { data: pendingResponsesData } = useQuery({
    queryKey: ["/api/pending-responses"],
    enabled: !!questionId,
    queryFn: async () => {
      const res = await fetch('/api/pending-responses');
      if (!res.ok) throw new Error('Failed to fetch pending responses');
      return res.json();
    }
  });

  // Find if this question has a partner response from our pending responses
  const findPartnerResponse = () => {
    if (!pendingResponsesData || !questionId) return null;
    
    // Find this specific question in pending responses
    const pendingItem = pendingResponsesData.find(
      (item: any) => item.question.id === parseInt(questionId as string)
    );
    
    // Return the partner response if this question is waiting for you
    if (pendingItem && pendingItem.waitingForYou && pendingItem.partnerResponse) {
      return pendingItem.partnerResponse;
    }
    
    return null;
  };
  
  useEffect(() => {
    if (questionId && specificQuestionData) {
      // For specific question, create a structure similar to activeQuestionData
      const partnerResponse = findPartnerResponse();
      
      setQuestionData({
        question: specificQuestionData,
        userHasAnswered: false, // Assume not answered yet
        partnerHasAnswered: !!partnerResponse, // If we found a partner response
        partnerResponse: partnerResponse, // Store the partner response for later reveal
      });
      setCurrentQuestionId(questionId);
    } else if (!questionId && activeQuestionData) {
      setQuestionData(activeQuestionData);
      
      // Set current question ID when active question data is first loaded
      if (activeQuestionData?.question?.id && !currentQuestionId) {
        setCurrentQuestionId(activeQuestionData.question.id);
      }
    }
  }, [questionId, specificQuestionData, activeQuestionData, currentQuestionId, pendingResponsesData]);
  
  // Watch for question changes and trigger animation
  useEffect(() => {
    if (questionData?.question?.id && 
        currentQuestionId !== null && 
        questionData.question.id !== currentQuestionId) {
      setIsAnimating(true);
      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 1000); // Match this with animation duration
      return () => clearTimeout(timer);
    }
  }, [questionData, currentQuestionId]);
  
  // Force refetch of active question on mount (if not using a specific question)
  useEffect(() => {
    if (!questionId) {
      refetchActiveQuestion();
    }
  }, [questionId, refetchActiveQuestion]);

  // State to control whether to show partner's response after submission
  const [showPartnerResponse, setShowPartnerResponse] = useState(false);
  const [submittedResponseContent, setSubmittedResponseContent] = useState("");
  
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
      // Save the submitted response content
      setSubmittedResponseContent(response);
      
      // If this is a question with a partner response, show the reveal first
      if (questionData?.partnerResponse && !showPartnerResponse) {
        setShowPartnerResponse(true);
        return;
      }
      
      if (data.lovesliceCreated) {
        // If a loveslice was created, navigate to the reveal page
        navigate(`/reveal/${data.lovesliceId}`);
      } else {
        // Otherwise, navigate back to home
        queryClient.invalidateQueries({ queryKey: ["/api/active-question"] });
        queryClient.invalidateQueries({ queryKey: ["/api/pending-responses"] });
        navigate("/");
      }
    },
  });

  const handleSubmitResponse = () => {
    if (!questionData?.question?.id || !response.trim()) return;
    
    // Store the current question ID before submitting
    setCurrentQuestionId(questionData.question.id);
    
    submitResponseMutation.mutate({
      questionId: questionData.question.id,
      content: response.trim(),
    });
  };

  const handleSkip = () => {
    // Just navigate back to home
    navigate("/");
  };

  const isLoading = questionId ? isSpecificQuestionLoading : isActiveQuestionLoading;
  const error = questionId ? specificQuestionError : activeQuestionError;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sage" />
        </div>
      </MainLayout>
    );
  }

  if (error || !questionData) {
    return (
      <MainLayout>
        <div className="text-center py-8">
          <p className="text-red-500">Failed to load your question. Please try again later.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/")}
          >
            Go back home
          </Button>
        </div>
      </MainLayout>
    );
  }

  const handleContinueAfterReveal = () => {
    // Continue with navigation after the reveal
    queryClient.invalidateQueries({ queryKey: ["/api/active-question"] });
    queryClient.invalidateQueries({ queryKey: ["/api/pending-responses"] });
    navigate("/");
  };

  // If we're showing the partner response after submission
  if (showPartnerResponse && questionData?.partnerResponse) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-10 text-center">
            <ThemeBadge theme={questionData.question.theme} size="large" className="inline-block mb-4" />
            <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl mb-4 leading-relaxed">
              "{questionData.question.content}"
            </h2>
            <p className="text-lavender text-lg font-medium">Loveslice Created!</p>
          </div>
          
          <HandDrawnBorder className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Your response */}
              <div>
                <div className="flex items-center mb-3">
                  <UserAvatar user={auth.user} size="xs" className="mr-2" />
                  <h3 className="font-medium">Your Response</h3>
                </div>
                <div className="bg-cream bg-opacity-40 p-4 rounded-lg">
                  <p className="italic text-gray-700">"{submittedResponseContent}"</p>
                </div>
              </div>
              
              {/* Partner's response - now revealed */}
              <div>
                <div className="flex items-center mb-3">
                  <UserAvatar 
                    user={questionData.partnerResponse.user} 
                    fallbackText="P" 
                    size="xs" 
                    className="mr-2" 
                  />
                  <h3 className="font-medium">Partner's Response</h3>
                </div>
                <div className="bg-lavender-light bg-opacity-40 p-4 rounded-lg">
                  <p className="italic text-gray-700">"{questionData.partnerResponse.content}"</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-gray-600 mb-4">You've both answered this question! A new Loveslice has been added to your garden.</p>
              <Button
                onClick={handleContinueAfterReveal}
                className="bg-sage hover:bg-sage-dark text-white"
              >
                Continue to Home
              </Button>
            </div>
          </HandDrawnBorder>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back button for questions from URL */}
        {questionId && (
          <Button
            variant="ghost"
            className="mb-6 text-sage hover:text-sage-dark hover:bg-transparent flex items-center"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to home
          </Button>
        )}
        
        <div className="mb-10 text-center">
          <ThemeBadge theme={questionData.question.theme} size="large" className="inline-block mb-4" />
          <div className="overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.h2 
                key={questionData.question.id}
                className="font-serif text-2xl md:text-3xl lg:text-4xl mb-4 leading-relaxed"
                initial={isAnimating ? { y: 50, opacity: 0 } : { y: 0, opacity: 1 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30,
                  duration: 0.6 
                }}
              >
                "{questionData.question.content}"
              </motion.h2>
            </AnimatePresence>
          </div>
          <motion.p 
            className="text-gray-600 text-sm"
            animate={{ opacity: isAnimating ? 0 : 1 }}
            transition={{ duration: 0.3 }}
          >
            {questionId ? "Your partner has already answered this question" : 
              "This question explores the boundaries and trust in your relationship"}
          </motion.p>
        </div>
        
        <HandDrawnBorder className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-8">
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <UserAvatar user={auth.user} size="xs" className="mr-2" />
              <h3 className="font-medium">Your Response</h3>
            </div>
            <Textarea
              rows={6}
              className="w-full p-4 border border-lavender-light rounded-lg focus:outline-none focus:ring-1 focus:ring-sage"
              placeholder="Take a moment to reflect before answering..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <Button
              variant="ghost"
              className="text-sage-dark hover:text-sage hover:bg-transparent flex items-center"
              onClick={handleSkip}
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Skip this question
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={!response.trim() || submitResponseMutation.isPending}
              className="bg-sage hover:bg-sage-dark text-white w-full sm:w-auto"
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
        </HandDrawnBorder>
        
        <div className="text-center mb-8">
          <h3 className="font-serif text-xl mb-2">How This Works</h3>
          <p className="text-gray-600 text-sm mb-4">Your response will be private until your partner answers too</p>
          <div className="inline-flex items-center justify-center space-x-1">
            <span className="w-2 h-2 bg-sage rounded-full"></span>
            <span className="w-2 h-2 bg-sage rounded-full"></span>
            <span className="w-2 h-2 bg-sage rounded-full"></span>
          </div>
        </div>
        
        <div className="flex justify-center">
          <div className="inline-block text-center bg-cream bg-opacity-70 rounded-lg p-6 max-w-md">
            <div className="mb-4">
              <img src="https://images.unsplash.com/photo-1523293915678-d126868e96c1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80" alt="Two plants growing together" className="w-32 h-32 object-cover rounded-full mx-auto" />
            </div>
            <h4 className="font-handwritten text-xl text-sage-dark mb-2">Cultivate connection</h4>
            <p className="text-sm">Each question creates space for authentic sharing, helping your relationship grow stronger with each Loveslice.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
