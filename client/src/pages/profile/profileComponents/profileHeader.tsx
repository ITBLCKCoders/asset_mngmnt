'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Briefcase,
  Calendar,
  Pencil,
  UserCheck,
  Camera,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAvatarPreview } from '@/hooks/avatarPreview';

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn('animate-shimmer rounded bg-gray-200/80', className)} />
);


interface ProfileHeaderProps {
  user: any;
  isLoading: boolean;
  activeTab: string;
  isEditing: boolean;
  isSaving?: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function ProfileHeader({
  user,
  isLoading: externalLoading,
  activeTab,
  isEditing,
  isSaving = false,
  onStartEdit,
  onCancel,
  onSave,
}: ProfileHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { previewUrl, setPreviewUrl, setPendingFile } = useAvatarPreview();

  const isLoading = externalLoading;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(p => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreviewUrl(result);
      setPendingFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleCancel = () => {
    onCancel();
  };

  const displayAvatar = previewUrl || user?.avatarUrl;

  if (isLoading || !user) {
    return (
      <Card className="shadow-lg rounded-2xl overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-red-600 to-red-800 sm:h-32" />
        <CardContent className="relative -mt-12 px-4 pb-6 sm:-mt-16 sm:px-8 sm:pb-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:gap-6">
              <Shimmer className="h-24 w-24 rounded-full ring-4 ring-white sm:h-40 sm:w-40 sm:ring-8" />
              <div className="space-y-3 pb-0 sm:space-y-4 sm:pb-4">
                <Shimmer className="h-8 w-52 rounded-lg sm:h-12 sm:w-96" />
                <Shimmer className="h-7 w-44 rounded-lg sm:h-9 sm:w-80" />
                <Shimmer className="h-6 w-40 rounded-lg sm:h-7 sm:w-64" />
              </div>
            </div>
            <Shimmer className="h-11 w-full rounded-xl sm:h-12 sm:w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-lg border-0 rounded-2xl">
      <div className="h-28 bg-gradient-to-r from-red-600 to-red-800 sm:h-32" />

      <CardContent className="relative -mt-12 px-4 pb-6 sm:-mt-16 sm:px-8 sm:pb-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 shadow-xl ring-4 ring-white sm:h-40 sm:w-40 sm:ring-8">
                <AvatarImage
                  src={displayAvatar}
                  alt={user.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-red-600 text-3xl font-bold text-white sm:text-5xl">
                  {getInitials(
                    user.name ||
                      `${user.firstName ?? ''} ${user.lastName ?? ''}`
                  )}
                </AvatarFallback>
              </Avatar>

              {isEditing && (
                <>
                  <div className="absolute -right-2 top-16 z-10 rounded-full border-4 border-white bg-red-600 p-2 text-white shadow-lg sm:top-28">
                    <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>

                  <div
                    onClick={handleAvatarClick}
                    className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <Camera className="h-10 w-10 text-white sm:h-14 sm:w-14" />
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </>
              )}
            </div>

            <div className="text-gray-800">
              <h1 className="text-2xl font-bold sm:text-4xl">
                {user.name ||
                  `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-base sm:gap-4 sm:text-lg">
                {user.position ? (
                  <span className="flex items-center gap-2 text-gray-700">
                    <Briefcase className="h-5 w-5 text-red-600 sm:h-6 sm:w-6" />
                    {user.position}
                  </span>
                ) : (
                  <span className="text-gray-500 italic">No position set</span>
                )}
                <Badge className="bg-red-100 px-3 py-1 font-semibold text-red-700 sm:px-4">
                  Full-time
                </Badge>
              </div>

              <p className="mt-2 flex items-center gap-2 text-sm text-gray-600 sm:text-base">
                <Calendar className="h-4 w-4 text-red-600 sm:h-5 sm:w-5" />
                Member since {new Date(user.createdAt).getFullYear()}
              </p>
            </div>
          </div>

          {activeTab === 'basic' && (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {!isEditing ? (
                <Button
                  variant="header"
                  size="lg"
                  onClick={onStartEdit}
                  className="w-full sm:w-auto"
                >
                  <UserCheck className="w-5 h-5 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    variant="header"
                    size="lg"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="w-full sm:w-auto"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Cancel
                  </Button>

                  <Button
                    variant="header"
                    size="lg"
                    onClick={onSave}
                    disabled={isSaving}
                    className="w-full sm:w-auto"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
