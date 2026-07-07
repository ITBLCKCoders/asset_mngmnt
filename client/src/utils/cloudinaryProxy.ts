export function proxyCloudinaryUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.includes('res.cloudinary.com')) {
    return `/api/proxy/image?url=${encodeURIComponent(url)}`;
  }
  return url;
}
