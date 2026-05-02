import { createContext, useContext, useState, ReactNode } from 'react';

interface AvatarPreviewContextType {
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  pendingFile: File | null;
  setPendingFile: (file: File | null) => void;
  clearPreview: () => void;
}

const AvatarPreviewContext = createContext<
  AvatarPreviewContextType | undefined
>(undefined);

export function AvatarPreviewProvider({ children }: { children: ReactNode }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const clearPreview = () => {
    setPreviewUrl(null);
    setPendingFile(null);
  };

  return (
    <AvatarPreviewContext.Provider
      value={{
        previewUrl,
        setPreviewUrl,
        pendingFile,
        setPendingFile,
        clearPreview,
      }}
    >
      {children}
    </AvatarPreviewContext.Provider>
  );
}

export function useAvatarPreview() {
  const context = useContext(AvatarPreviewContext);
  if (!context) {
    throw new Error(
      'useAvatarPreview must be used within an AvatarPreviewProvider'
    );
  }
  return context;
}
