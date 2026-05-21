'use client';

interface PDFViewerProps {
  pdfUrl: string;
  className?: string;
}

export function PDFViewer({ pdfUrl, className }: PDFViewerProps) {
  if (!pdfUrl) {
    return (
      <div className={`flex items-center justify-center ${className ?? ''}`}>
        <div className="text-gray-500">No PDF URL provided</div>
      </div>
    );
  }

  // PDF is 8.5 x 13 inches (215.9mm x 330.2mm)
  // Calculate aspect ratio: 330.2 / 215.9 ≈ 1.53
  const aspectRatio = 330.2 / 215.9;

  return (
    <div className={`flex justify-center py-4 ${className ?? ''}`}>
      <iframe
        src={pdfUrl}
        className="border-0 shadow-lg"
        style={{
          width: '100%',
          maxWidth: '800px',
          aspectRatio: `${aspectRatio}`,
          height: 'auto',
        }}
        title="PDF Preview"
      />
    </div>
  );
}
