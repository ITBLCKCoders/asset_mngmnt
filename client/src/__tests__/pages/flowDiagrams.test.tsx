import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FlowDiagrams from '@/pages/flowDiagrams';

describe('FlowDiagrams', () => {
  it('should render the FLOW DIAGRAMS heading', () => {
    render(<FlowDiagrams />);
    expect(screen.getByText('FLOW DIAGRAMS')).toBeDefined();
  });
});
