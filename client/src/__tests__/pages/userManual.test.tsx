import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UserManual from '@/pages/userManual';

function renderPage() {
  return render(
    <MemoryRouter>
      <UserManual />
    </MemoryRouter>
  );
}

describe('UserManual', () => {
  it('should render the User Manual title', () => {
    renderPage();
    expect(screen.getByText('User Manual')).toBeDefined();
  });
});
