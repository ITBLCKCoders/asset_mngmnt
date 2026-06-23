import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { PdfPreviewModal } from '@/components/common/PdfPreviewModal';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Download: () => <span data-testid="download-icon">Download</span>,
}));

describe('PdfPreviewModal', () => {
  it('should render when isOpen is true', () => {
    render(<PdfPreviewModal isOpen={true} onClose={vi.fn()} pdfUrl="http://example.com/doc.pdf" />);
    expect(screen.getByTestId('dialog')).toBeDefined();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <PdfPreviewModal isOpen={false} onClose={vi.fn()} pdfUrl={null} />
    );
    expect(container.querySelector('[data-testid="dialog"]')).toBeNull();
  });

  it('should show "No PDF available" when pdfUrl is null', () => {
    render(<PdfPreviewModal isOpen={true} onClose={vi.fn()} pdfUrl={null} />);
    expect(screen.getByText('No PDF available')).toBeDefined();
  });

  it('should show iframe when pdfUrl is provided', () => {
    render(<PdfPreviewModal isOpen={true} onClose={vi.fn()} pdfUrl="/api/pdf/123" />);
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeDefined();
    expect(iframe?.src).toContain('/api/pdf/123');
  });

  it('should show download button when pdfUrl is provided', () => {
    render(<PdfPreviewModal isOpen={true} onClose={vi.fn()} pdfUrl="/api/pdf/123" />);
    expect(screen.getByText('Download')).toBeDefined();
  });
});
