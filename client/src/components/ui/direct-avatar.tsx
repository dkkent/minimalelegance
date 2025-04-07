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
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  // Add cache-busting parameter and log the full URL
  const imageUrl = `${src}?t=${Date.now()}`;
  console.log(`DirectAvatar - Rendering with src: ${imageUrl}`);
  
  React.useEffect(() => {
    // Ensure the image exists by preloading it
    const img = new Image();
    img.onload = () => {
      console.log(`DirectAvatar preload success: ${imageUrl}`);
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = (e) => {
      console.error(`DirectAvatar preload error: ${imageUrl}`, e);
      setImageError(true);
    };
    img.src = imageUrl;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

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
          key={`img-${Date.now()}`}
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
          }}
          onLoad={() => {
            console.log(`DirectAvatar onload success: ${imageUrl}`);
            setImageLoaded(true);
          }}
          onError={(e) => {
            console.error(`DirectAvatar onerror: ${imageUrl}`, e);
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