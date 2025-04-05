import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export function FirebaseDomainHelper() {
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [showHelper, setShowHelper] = useState<boolean>(false);
  
  useEffect(() => {
    // Get the current hostname from the window.location
    const hostname = window.location.hostname;
    setCurrentDomain(hostname);
    
    // Check if we've seen an unauthorized domain error in console
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.error?.message || event.message;
      if (errorMessage && 
          (errorMessage.includes('unauthorized-domain') || 
           errorMessage.includes('auth/unauthorized-domain'))) {
        setShowHelper(true);
      }
    };
    
    window.addEventListener('error', handleError);
    
    // Also check if we have a localStorage flag indicating we need to show this
    const hasUnauthorizedError = localStorage.getItem('firebase_unauthorized_domain');
    if (hasUnauthorizedError === 'true') {
      setShowHelper(true);
    }
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  if (!showHelper) return null;
  
  return (
    <Card className="mt-6 border-amber-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-amber-500 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> Firebase Domain Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Domain not authorized in Firebase</AlertTitle>
          <AlertDescription>
            You're seeing this message because Firebase authentication requires you to add your domain 
            to the authorized domains list in your Firebase project.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">Current Domain:</h4>
            <code className="bg-muted p-2 rounded block mt-1">{currentDomain}</code>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Steps to authorize your domain:</h4>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Go to your <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Firebase console</a></li>
              <li>Select your project</li>
              <li>Go to <strong>Authentication</strong> → <strong>Settings</strong> → <strong>Authorized domains</strong></li>
              <li>Add the domain shown above</li>
              <li>If you're going to deploy the app, also add your Replit.app domain: <code className="bg-muted p-1 rounded">minimal-elegance-dickonkent.replit.app</code></li>
              <li>Save changes and refresh this page</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}