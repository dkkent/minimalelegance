import { useState, useEffect } from 'react';

/**
 * Hook to verify image URLs and provide working alternatives
 * Enhanced to handle more edge cases and improve loading issues
 */
export function useProfileImage(imageUrl: string | null | undefined): {
  verifiedUrl: string | undefined;
  isLoading: boolean;
  error: string | null;
} {
  const [verifiedUrl, setVerifiedUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset states when the image URL changes
    setIsLoading(true);
    setError(null);
    setVerifiedUrl(undefined);

    if (!imageUrl) {
      setIsLoading(false);
      return;
    }

    // Normalize the URL right away - this increases the chance of success
    const normalizedUrl = normalizeImageUrl(imageUrl);
    console.log("Using normalized URL:", normalizedUrl);

    // Create a test image element
    const testImg = new Image();
    
    // Set up event handlers
    testImg.onload = () => {
      console.log("Image loaded successfully:", normalizedUrl);
      setVerifiedUrl(normalizedUrl);
      setIsLoading(false);
    };
    
    testImg.onerror = () => {
      console.error("Image failed to load:", normalizedUrl);
      // Try alternative URLs if the original fails
      const alternativeUrls = generateAlternativeUrls(imageUrl);
      tryNextAlternative(alternativeUrls, 0);
    };
    
    // Try each alternative URL one after another
    function tryNextAlternative(urls: string[], index: number) {
      if (index >= urls.length) {
        console.error("All alternatives failed for:", imageUrl);
        setError("Failed to load image");
        setIsLoading(false);
        return;
      }
      
      const altUrl = urls[index];
      console.log(`Trying alternative URL (${index+1}/${urls.length}):`, altUrl);
      
      const altImg = new Image();
      altImg.onload = () => {
        console.log("Alternative image loaded successfully:", altUrl);
        setVerifiedUrl(altUrl);
        setIsLoading(false);
      };
      
      altImg.onerror = () => {
        console.error(`Alternative #${index+1} failed:`, altUrl);
        // Try the next alternative
        tryNextAlternative(urls, index + 1);
      };
      
      altImg.src = altUrl;
    }
    
    // Start loading the image with the normalized URL
    testImg.src = normalizedUrl;
    
    // Clean up
    return () => {
      testImg.onload = null;
      testImg.onerror = null;
    };
  }, [imageUrl]);

  return { verifiedUrl, isLoading, error };
}

/**
 * Normalizes an image URL based on common patterns in the application
 */
function normalizeImageUrl(url: string): string {
  if (!url) return '';
  
  // If the URL already starts with a slash, assume it's well-formed
  if (url.startsWith('/')) {
    return url;
  }
  
  // If it doesn't start with a slash, assume it's a filename
  return `/uploads/profile_pictures/${url}`;
}

/**
 * Generates multiple alternative URLs to try when the main URL fails
 */
function generateAlternativeUrls(originalUrl: string): string[] {
  if (!originalUrl) return [];
  
  const alternatives: string[] = [];
  
  // 1. Full path with leading slash
  if (!originalUrl.startsWith('/')) {
    alternatives.push(`/${originalUrl}`);
  }
  
  // 2. Direct path to uploads directory
  if (!originalUrl.includes('/uploads/')) {
    alternatives.push(`/uploads/profile_pictures/${originalUrl}`);
  }
  
  // 3. Extract filename and use it with the profile pictures path
  const parts = originalUrl.split('/');
  const filename = parts[parts.length - 1];
  if (filename && filename.includes('.')) {
    alternatives.push(`/uploads/profile_pictures/${filename}`);
  }
  
  // 4. Fix double slashes
  if (originalUrl.includes('//')) {
    alternatives.push(originalUrl.replace(/\/\//g, '/'));
  }
  
  // 5. Remove /uploads/ if it appears twice
  if (originalUrl.includes('/uploads/uploads/')) {
    alternatives.push(originalUrl.replace('/uploads/uploads/', '/uploads/'));
  }
  
  // 6. Replace special characters handling
  const specialCharsFixed = originalUrl.replace(/(%20| )/g, '_');
  if (specialCharsFixed !== originalUrl) {
    alternatives.push(specialCharsFixed);
  }
  
  // 7. Try without any path prefix, just the filename if it has an extension
  if (filename && filename.includes('.')) {
    alternatives.push(filename);
  }
  
  // Return only unique alternatives using filter instead of Set
  return alternatives.filter((item, index) => alternatives.indexOf(item) === index);
}