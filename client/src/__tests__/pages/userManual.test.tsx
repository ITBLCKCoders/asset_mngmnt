import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/hooks/use-theme';
import UserManual from '@/pages/userManual';

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <UserManual />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('UserManual', () => {
  it('should render the User Manual title', () => {
    renderPage();
    expect(screen.getByText('User Manual')).toBeDefined();
  });
});
