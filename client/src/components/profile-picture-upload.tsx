import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Upload, Camera } from "lucide-react";
import { User } from "@shared/schema";
import { ImageCropper } from "./image-cropper";

interface ProfilePictureUploadProps {
  user: User;
}

export function ProfilePictureUpload({ user }: ProfilePictureUploadProps) {
  const { toast } = useToast();
  const [isHovering, setIsHovering] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/profile-picture", formData, {
        isFormData: true
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data.user);
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your profile picture.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Use FileReader instead of URL.createObjectURL for better compatibility
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const imageDataUrl = event.target.result as string;
        console.log("Image loaded successfully", { 
          size: file.size, 
          type: file.type,
          dataUrlLength: imageDataUrl.length
        });
        setImageToEdit(imageDataUrl);
        setCropperOpen(true);
      } else {
        console.error("Failed to load image data");
        toast({
          title: "Image Loading Error",
          description: "Failed to prepare image for cropping. Please try another image.",
          variant: "destructive",
        });
      }
    };
    
    reader.onerror = () => {
      console.error("FileReader error:", reader.error);
      toast({
        title: "Image Loading Error",
        description: "Failed to read the image file. Please try another image.",
        variant: "destructive",
      });
    };
    
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    // Convert name to match the original file
    const originalFileName = fileInputRef.current?.files?.[0]?.name || "profile.jpg";
    const fileExtension = originalFileName.split('.').pop() || "jpg";
    
    // Create a new file object from the blob with a properly mapped mime type
    const mimeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    
    const contentType = mimeMap[fileExtension.toLowerCase()] || 'image/jpeg';
    const croppedFile = new File([croppedBlob], originalFileName, { type: contentType });
    
    const formData = new FormData();
    formData.append("profilePicture", croppedFile);
    
    uploadMutation.mutate(formData);
    
    // We're now using FileReader + data URLs, so no need for revokeObjectURL
    // Just clear the state
    setImageToEdit(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Get user initials for the avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex flex-col items-center">
      <div 
        className="relative cursor-pointer group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={triggerFileInput}
      >
        <Avatar className="h-24 w-24 border-2 border-border">
          <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
          <AvatarFallback className="text-xl">{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        
        <div className={`absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50 transition-opacity ${isHovering || uploadMutation.isPending ? 'opacity-100' : 'opacity-0'}`}>
          {uploadMutation.isPending ? (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          ) : (
            <Camera className="h-8 w-8 text-white" />
          )}
        </div>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploadMutation.isPending}
      />
      
      <div className="mt-4 text-center">
        <Label className="block text-sm font-medium text-muted-foreground mb-2">
          {user.profilePicture ? "Change profile picture" : "Add profile picture"}
        </Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={triggerFileInput}
          disabled={uploadMutation.isPending}
          className="w-full"
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </>
          )}
        </Button>
      </div>
      
      {/* Image Cropper Dialog */}
      {imageToEdit && (
        <ImageCropper
          image={imageToEdit}
          open={cropperOpen}
          onClose={() => {
            setCropperOpen(false);
            setImageToEdit(null);
            // No need to revoke object URL with FileReader
          }}
          onCropComplete={handleCropComplete}
          aspectRatio={1} // 1:1 aspect ratio for profile pictures
        />
      )}
    </div>
  );
}