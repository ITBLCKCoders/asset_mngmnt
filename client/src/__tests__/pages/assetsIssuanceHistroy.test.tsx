import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AssetsAssignmentHistory from '@/pages/assets-history/assetsIssuanceHistroy';

describe('AssetsAssignmentHistory (Issuance History)', () => {
  it('renders header title', () => {
    render(<BrowserRouter><AssetsAssignmentHistory /></BrowserRouter>);
    expect(screen.getByText('Assets Assignment History')).toBeInTheDocument();
  });
});
