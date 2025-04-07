import * as React from "react";

interface DirectAvatarProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
  borderColor?: string;
  fallbackText?: string;
}

/**
 * A very simple avatar component with minimal wrappers to ensure the image renders correctly
 */
export function DirectAvatar({
  src,
  alt,
  size = 40,
  className = "",
  borderColor = "white",
  fallbackText = "U"
}: DirectAvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  
  // Add cache-busting parameter to prevent stale cache
  const imageUrl = React.useMemo(() => `${src}?t=${Date.now()}`, [src]);
  
  // Preload image
  React.useEffect(() => {
    // Reset state when src changes
    setImageError(false);
    setImageLoaded(false);
    
    // Verify image actually loads
    const img = new Image();
    img.onload = () => {
      console.log(`DirectAvatar preload success: ${src}`);
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error(`DirectAvatar preload error: ${src}`);
      setImageError(true);
    };
    img.src = imageUrl;
    
    // Clean up on unmount or src change
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, imageUrl]);
  
  return (
    <div 
      className={`direct-avatar ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        border: `2px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: imageError ? '#f0f0f0' : 'transparent'
      }}
    >
      {!imageError && (
        <img
          key={`avatar-${Date.now()}`} // Key forces re-render
          src={imageUrl}
          alt={alt}
          width={size}
          height={size}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: imageLoaded ? 1 : 0.1, // Start transparent until loaded
            transition: 'opacity 0.3s ease'
          }}
          onLoad={() => {
            console.log(`DirectAvatar loaded in DOM: ${src}`);
            setImageLoaded(true);
          }}
          onError={(e) => {
            console.error(`DirectAvatar error loading in DOM: ${imageUrl}`, e);
            setImageError(true);
          }}
        />
      )}
      {imageError && (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#e0e0e0',
          color: '#666',
          fontSize: `${size / 2}px`,
          fontWeight: 'bold'
        }}>
          {fallbackText}
        </div>
      )}
    </div>
  );
}