import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        localStorage.setItem('firebase_unauthorized_domain', 'true');
      }
    };
    
    window.addEventListener('error', handleError);
    
    // Also check if we have a localStorage flag indicating we need to show this
    const hasUnauthorizedError = localStorage.getItem('firebase_unauthorized_domain');
    if (hasUnauthorizedError === 'true') {
      setShowHelper(true);
    }
    
    // Only show the helper when there's an error
    // setShowHelper(true);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  const clearWarningAndRefresh = () => {
    localStorage.removeItem('firebase_unauthorized_domain');
    setShowHelper(false);
    window.location.reload();
  };
  
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
              <li>Add the domain you see right now in your URL bar</li>
              <li>Add your development domain: <code className="bg-muted p-1 rounded">{currentDomain}</code></li>
              <li>Also add your Replit.app domain: <code className="bg-muted p-1 rounded">minimal-elegance-dickonkent.replit.app</code> (with hyphens)</li>
              <li>Save changes and refresh this page</li>
            </ol>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={clearWarningAndRefresh}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          I've added my domain - Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}