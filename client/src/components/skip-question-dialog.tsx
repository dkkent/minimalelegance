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
  
  // Skip reason options
  const skipReasons = [
    "I'm not ready to talk about this yet",
    "I need more time to reflect",
    "This feels too sensitive right now",
    "Let's come back to this another day",
    "I don't think we need to discuss this"
  ];

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
            {step === 1 ? "Are you sure you want to skip this question?" : "Add a Note (Optional)"}
          </DialogTitle>
          <DialogDescription className="text-center mt-2 mx-auto max-w-md">
            {step === 1 
              ? "If you skip this, we'll let your partner know you chose not to answer it. On the next screen you can add a note about why you felt like skipping it." 
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
                ❌ No, Keep This Question
              </Button>
              <Button 
                onClick={handleNext}
                className="w-full sm:w-auto bg-sage hover:bg-sage-dark"
              >
                ✅ Yes, Skip and Add Note
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