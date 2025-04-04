import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layouts/main-layout";
import { ThemeBadge } from "@/components/theme-badge";
import { HandDrawnBorder } from "@/components/hand-drawn-border";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, ChevronRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function RevealPage() {
  const { id } = useParams<{ id: string }>();
  const [_, navigate] = useLocation();
  const [note, setNote] = useState("");

  // Fetch loveslice details
  const {
    data: loveslice,
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/loveslices/${id}`],
    refetchInterval: false,
  });

  // Submit private note mutation
  const submitNoteMutation = useMutation({
    mutationFn: async ({ note }: { note: string }) => {
      const res = await apiRequest("PATCH", `/api/loveslices/${id}/note`, { note });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/loveslices/${id}`] });
      setNote("");
    },
  });

  const handleSaveNote = () => {
    if (!note.trim()) return;
    submitNoteMutation.mutate({ note: note.trim() });
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

  if (error || !loveslice) {
    return (
      <MainLayout>
        <div className="text-center py-8">
          <p className="text-red-500">Failed to load your loveslice. Please try again later.</p>
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
          <ThemeBadge theme={loveslice.question.theme} size="large" className="inline-block mb-4" />
          <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl mb-4 leading-relaxed">
            "{loveslice.question.content}"
          </h2>
        </div>
        
        <div className="relative mb-12">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="border-t border-lavender-light w-full"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-cream px-4 text-lavender-dark text-sm">A new Loveslice has blossomed</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {loveslice.responses.map((response: any, index: number) => (
            <HandDrawnBorder key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <Avatar className="h-10 w-10 rounded-full mr-3">
                  <AvatarFallback className="bg-sage-light text-sage-dark">
                    {response.user.name.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{response.user.name}</h3>
                  <p className="text-xs text-gray-500">Just now</p>
                </div>
              </div>
              <div className="bg-cream bg-opacity-50 p-4 rounded-lg font-serif">
                <p className="text-lg italic leading-relaxed">
                  "{response.content}"
                </p>
              </div>
            </HandDrawnBorder>
          ))}
        </div>
        
        <HandDrawnBorder className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="font-medium mb-4">Reflect Together</h3>
          <p className="text-sm text-gray-600 mb-4">Take a moment to discuss what you've learned about each other</p>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Your private note (optional)</label>
            <Textarea
              rows={3}
              className="w-full p-3 border border-lavender-light rounded-lg focus:outline-none focus:ring-1 focus:ring-sage"
              placeholder="What did you learn from this exchange?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSaveNote}
              disabled={!note.trim() || submitNoteMutation.isPending}
              className="bg-sage hover:bg-sage-dark text-white"
            >
              {submitNoteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Note"
              )}
            </Button>
          </div>
        </HandDrawnBorder>
        
        <div className="flex justify-center">
          <Button
            variant="link"
            className="flex items-center text-sage hover:text-sage-dark"
            onClick={() => navigate("/")}
          >
            <span>Continue to your garden</span>
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
