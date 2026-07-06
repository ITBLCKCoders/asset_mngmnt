import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { useContext } from 'react';
import { AvatarPreviewProvider, AvatarPreviewContext } from '@/hooks/avatarPreview';

describe('AvatarPreviewProvider', () => {
  it('should provide default null values', () => {
    const { result } = renderHook(() => useContext(AvatarPreviewContext), {
      wrapper: ({ children }) => <AvatarPreviewProvider>{children}</AvatarPreviewProvider>,
    });
    expect(result.current?.previewUrl).toBeNull();
    expect(result.current?.pendingFile).toBeNull();
  });

  it('should update previewUrl via setPreviewUrl', () => {
    const { result } = renderHook(() => useContext(AvatarPreviewContext), {
      wrapper: ({ children }) => <AvatarPreviewProvider>{children}</AvatarPreviewProvider>,
    });
    act(() => { result.current?.setPreviewUrl('http://example.com/avatar.png'); });
    expect(result.current?.previewUrl).toBe('http://example.com/avatar.png');
  });

  it('should clear preview via clearPreview', () => {
    const { result } = renderHook(() => useContext(AvatarPreviewContext), {
      wrapper: ({ children }) => <AvatarPreviewProvider>{children}</AvatarPreviewProvider>,
    });
    act(() => { result.current?.setPreviewUrl('http://example.com/avatar.png'); });
    act(() => { result.current?.setPendingFile(new File([], 'test.png')); });
    act(() => { result.current?.clearPreview(); });
    expect(result.current?.previewUrl).toBeNull();
    expect(result.current?.pendingFile).toBeNull();
  });
});
