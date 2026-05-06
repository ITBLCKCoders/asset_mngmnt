'use client';

interface PDFViewerProps {
  pdfUrl: string;
  className?: string;
}

export function PDFViewer({ pdfUrl, className }: PDFViewerProps) {
  return (
    <iframe
      src={pdfUrl}
      className={className}
      title="PDF Viewer"
    />
  );
}
