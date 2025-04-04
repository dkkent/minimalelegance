import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layouts/main-layout";
import { ThemeBadge } from "@/components/theme-badge";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, SkipForward } from "lucide-react";

export default function QuestionPage() {
  const [_, navigate] = useLocation();
  const [response, setResponse] = useState("");

  // Fetch active question - force a refetch by adding referer to URL
  const {
    data: activeQuestionData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/active-question", "question-page"],
    refetchInterval: false,
    queryFn: async () => {
      const res = await fetch(`/api/active-question?referer=question-page`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch active question');
      return res.json();
    }
  });
  
  // Force refetch on mount
  React.useEffect(() => {
    refetch();
  }, []);

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
        // Otherwise, navigate back to home
        queryClient.invalidateQueries({ queryKey: ["/api/active-question", "question-page"] });
        queryClient.invalidateQueries({ queryKey: ["/api/active-question", "home-page"] });
        navigate("/");
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
    // For now, we'll just navigate back to home
    navigate("/");
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sage" />
        </div>
      </MainLayout>
    );
  }

  if (error || !activeQuestionData) {
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

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-10 text-center">
          <ThemeBadge theme={activeQuestionData.question.theme} size="large" className="inline-block mb-4" />
          <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl mb-4 leading-relaxed">
            "{activeQuestionData.question.content}"
          </h2>
          <p className="text-gray-600 text-sm">This question explores the boundaries and trust in your relationship</p>
        </div>
        
        <HandDrawnBorder className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-8">
          <div className="mb-6">
            <h3 className="font-medium mb-3">Your Response</h3>
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
