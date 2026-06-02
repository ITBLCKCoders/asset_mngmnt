import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AssetsTransferHistory from '@/pages/assets-history/assetsTransferHistory';

describe('AssetsTransferHistory', () => {
  it('renders header title', () => {
    render(<BrowserRouter><AssetsTransferHistory /></BrowserRouter>);
    expect(screen.getByText('Assets Transfer History')).toBeInTheDocument();
  });
});
