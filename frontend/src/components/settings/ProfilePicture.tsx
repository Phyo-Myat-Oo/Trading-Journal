import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { UserCircleIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface ProfilePictureProps {
  onImageChange: (file: File) => void;
  previewUrl?: string | null;
  profilePicture?: string | null;
}

export const ProfilePicture: React.FC<ProfilePictureProps> = ({ 
  onImageChange, 
  previewUrl: externalPreviewUrl,
  profilePicture 
}) => {
  const { showNotification } = useNotification();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Update preview when external preview URL changes
  useEffect(() => {
    if (externalPreviewUrl) {
      setPreviewUrl(externalPreviewUrl);
    }
  }, [externalPreviewUrl]);

  // Handle image loading error
  const handleImageError = () => {
    setImageError(true);
    showNotification('Failed to load profile picture', 'error');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', 'error');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size should be less than 5MB', 'error');
        return;
      }

      // Create preview URL
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      setImageError(false);
      onImageChange(file);
      event.target.value = '';
    }
  };

  // Determine which image to display
  const imageSource = !imageError ? (previewUrl || profilePicture || '') : '';
  const displayImage = imageSource ? (
    <img
      src={imageSource}
      alt="Profile"
      className="w-full h-full object-cover"
      onError={handleImageError}
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center">
      <UserCircleIcon className="w-24 h-24 text-gray-400" />
    </div>
  );

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100">
        {displayImage}
        <label
          htmlFor="profile-picture"
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <PhotoIcon className="w-8 h-8 text-white" />
        </label>
        <input
          id="profile-picture"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <p className="text-sm text-gray-500">
        Click to upload a new profile picture
      </p>
    </div>
  );
}; 