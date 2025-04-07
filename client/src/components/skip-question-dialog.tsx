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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, SkipForward } from "lucide-react";

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

  // Reset the dialog state when it's closed
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSkipNote("");
    }
  }, [isOpen]);

  const handleNext = () => {
    setStep(2);
  };

  const handleSkip = () => {
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
            {step === 1 ? "Skip This Question?" : "Add a Note (Optional)"}
          </DialogTitle>
          <DialogDescription className="text-center mt-2">
            {step === 1 
              ? "You can skip this question and get a new one. Would you like to proceed?" 
              : "Is there something about this question you'd like to note? This helps us improve your experience."}
          </DialogDescription>
        </DialogHeader>

        {step === 2 && (
          <div className="mt-4">
            <Textarea 
              placeholder="I'm skipping because..." 
              className="w-full p-3 border border-lavender-light rounded-lg focus:outline-none focus:ring-1 focus:ring-sage"
              value={skipNote}
              onChange={(e) => setSkipNote(e.target.value)}
              rows={4}
            />
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
                Skip Question
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="w-full sm:w-auto"
                disabled={isSkipping}
              >
                Back
              </Button>
              <Button 
                onClick={handleSkip}
                className="w-full sm:w-auto bg-sage hover:bg-sage-dark"
                disabled={isSkipping}
              >
                {isSkipping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Skipping...
                  </>
                ) : (
                  <>
                    <SkipForward className="mr-2 h-4 w-4" />
                    Get New Question
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}