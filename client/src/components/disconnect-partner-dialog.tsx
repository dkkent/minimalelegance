import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface DisconnectPartnerDialogProps {
  partner: {
    id: number;
    name: string;
  };
  trigger?: React.ReactNode;
}

export function DisconnectPartnerDialog({ partner, trigger }: DisconnectPartnerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/disconnect-partner", { partnerId: partner.id });
      return await res.json();
    },
    onSuccess: (updatedUser: User) => {
      // Update the user data in the cache
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      // Invalidate any partner-related queries
      queryClient.invalidateQueries({ queryKey: ["partner"] });
      
      toast({
        title: "Partnership ended",
        description: "You've disconnected from your partner.",
      });
      
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to disconnect",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            size="sm"
            className="text-destructive hover:bg-destructive/10"
          >
            Disconnect
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Disconnect Partnership</DialogTitle>
          <DialogDescription>
            Are you sure you want to disconnect from {partner.name}?
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/50 p-4 rounded-md border border-border space-y-2 text-sm">
          <p>When you disconnect from your partner:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You will no longer see each other's answers to new questions</li>
            <li>Your partner will lose access to new entries in your journal</li>
            <li>Loveslices you created together will be archived and not shown in future connections</li>
            <li>Your partner will receive a notification that you've ended the connection</li>
          </ul>
          <p className="mt-2 font-medium">This action cannot be undone without creating a new connection.</p>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
          >
            {disconnectMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              "Disconnect Partnership"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}