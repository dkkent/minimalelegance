import { Button } from "@/components/ui/button";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { SiGoogle, SiApple, SiFacebook } from "react-icons/si";

interface FirebaseAuthButtonProps {
  provider: "google" | "apple" | "meta";
  className?: string;
}

export function FirebaseAuthButton({ provider, className }: FirebaseAuthButtonProps) {
  const { signInWithGoogle, signInWithApple, signInWithMeta } = useFirebaseAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      switch (provider) {
        case "google":
          await signInWithGoogle();
          break;
        case "apple":
          await signInWithApple();
          break;
        case "meta":
          await signInWithMeta();
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const ProviderIcon = {
    google: SiGoogle,
    apple: SiApple,
    meta: SiFacebook,
  }[provider];

  const ProviderName = {
    google: "Google",
    apple: "Apple",
    meta: "Facebook",
  }[provider];

  return (
    <Button
      variant="outline"
      type="button"
      onClick={handleSignIn}
      disabled={isLoading}
      className={`w-full flex items-center gap-2 justify-center ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ProviderIcon className="h-4 w-4" />
      )}
      <span>Continue with {ProviderName}</span>
    </Button>
  );
}