import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FirebaseConfigurationHelpProps {
  open: boolean;
  onClose: () => void;
}

export function FirebaseConfigurationHelp({ open, onClose }: FirebaseConfigurationHelpProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Firebase Configuration Guide</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Follow these steps to properly set up Firebase Authentication
          </DialogDescription>
        </DialogHeader>

        <div className="prose prose-sm max-w-none overflow-y-auto max-h-[70vh]">
          <h3>1. Add Your Replit Domain to Firebase</h3>
          <p>
            The error you&apos;re seeing occurs because your Replit domain isn&apos;t authorized in Firebase. Here&apos;s how to fix it:
          </p>
          <ol>
            <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">Firebase console</a></li>
            <li>Select your project</li>
            <li>Click <strong>Authentication</strong> in the left sidebar</li>
            <li>Click the <strong>Settings</strong> tab</li>
            <li>Scroll down to <strong>Authorized domains</strong></li>
            <li>Add your Replit domain (e.g., <code>yourproject.username.repl.co</code>)</li>
            <li>Click <strong>Add</strong></li>
          </ol>

          <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
            <p className="text-yellow-800 font-medium">Important:</p>
            <p className="text-yellow-700 text-sm mt-1">
              If you&apos;re using a custom domain, you&apos;ll need to add that domain as well.
              During development, you&apos;ll want to add your Replit domain, 
              which is the URL shown in the browser when previewing your app.
            </p>
          </div>

          <h3>2. Enable Authentication Methods</h3>
          <p>
            Make sure you&apos;ve enabled the authentication methods you want to use:
          </p>
          <ol>
            <li>While in <strong>Authentication</strong>, click the <strong>Sign-in method</strong> tab</li>
            <li>Enable the providers you want to use (Google, Facebook, Apple)</li>
            <li>For Google: Select a support email</li>
            <li>For Facebook/Meta: You&apos;ll need to create a Facebook app and provide the App ID and Secret</li>
            <li>For Apple: You&apos;ll need an Apple Developer account</li>
          </ol>

          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-blue-800 font-medium">Tip:</p>
            <p className="text-blue-700 text-sm mt-1">
              Start with Google authentication, as it&apos;s the easiest to set up.
              You can add the other providers later as needed.
            </p>
          </div>

          <h3>3. Configure Environment Variables</h3>
          <p>
            Make sure your Replit project has these environment variables set:
          </p>
          <ul>
            <li><code>VITE_FIREBASE_API_KEY</code> - Your Firebase API key</li>
            <li><code>VITE_FIREBASE_PROJECT_ID</code> - Your Firebase project ID</li>
            <li><code>VITE_FIREBASE_APP_ID</code> - Your Firebase app ID</li>
          </ul>
          <p>
            You can find these values in your Firebase project settings under "Web configuration".
          </p>

          <h3>4. After Deployment</h3>
          <p>
            After deploying your app, remember to add your production domain to Firebase&apos;s authorized domains list as well.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}