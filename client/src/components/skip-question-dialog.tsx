import { useState, useEffect } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";

interface SkipQuestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip: (note?: string) => void;
  isSkipping: boolean;
}

export function SkipQuestionDialog({ 
  isOpen, 
  onClose, 
  onSkip, 
  isSkipping 
}: SkipQuestionDialogProps) {
  const [step, setStep] = useState(1);
  const [skipNote, setSkipNote] = useState("");
  const [localIsSkipping, setLocalIsSkipping] = useState(false);
  
  // Skip reason options
  const skipReasons = [
    "I'm not ready to talk about this yet",
    "I need more time to reflect",
    "This feels too sensitive right now",
    "Let's come back to this another day",
    "I don't think we need to discuss this",
    "No reason, just want a new question"
  ];

  // Reset the dialog state when it's closed
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSkipNote("");
      setLocalIsSkipping(false);
    }
  }, [isOpen]);

  // Update local skipping state when prop changes
  useEffect(() => {
    setLocalIsSkipping(isSkipping);
  }, [isSkipping]);

  const handleNext = () => {
    setStep(2);
  };

  const handleSkip = () => {
    // Start local loading animation
    setLocalIsSkipping(true);
    // Trigger actual skip
    onSkip(skipNote);
  };

  // Close dialog
  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleCancel();
      }
    }}>
      <DialogContent className="max-w-md bg-white p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl text-center font-serif">
            {step === 1 ? "Are you sure you want to skip this question?" : "Add a Note (Optional)"}
          </DialogTitle>
          <DialogDescription className="text-center mt-2 mx-auto max-w-md">
            {step === 1 
              ? "We'll let your partner know you skipped this one. You can share a reason next, if you'd like." 
              : "Please select a reason for skipping this question. This helps your partner understand and improves your experience."}
          </DialogDescription>
        </DialogHeader>

        {step === 2 && (
          <div className="mt-4">
            <Select onValueChange={setSkipNote} defaultValue={skipNote || skipReasons[0]}>
              <SelectTrigger className="w-full border border-lavender-light focus:ring-1 focus:ring-sage">
                <SelectValue placeholder="Select a reason for skipping" />
              </SelectTrigger>
              <SelectContent>
                {skipReasons.map((reason, index) => (
                  <SelectItem key={index} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
          {step === 1 ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="w-full sm:w-auto"
              >
                Keep This Question
              </Button>
              <Button 
                onClick={handleNext}
                className="w-full sm:w-auto bg-sage hover:bg-sage-dark"
              >
                Skip and Add Note
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="w-full sm:w-auto"
                disabled={localIsSkipping}
              >
                Back
              </Button>
              <Button 
                onClick={handleSkip}
                className="w-full sm:w-auto bg-sage hover:bg-sage-dark"
                disabled={localIsSkipping}
              >
                {localIsSkipping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Skipping...
                  </>
                ) : (
                  "Get New Question"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}