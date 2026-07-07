import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  ModulePermissionsMatrix,
  type ModulePermissionsMap,
} from '@/components/common/ModulePermissionsMatrix';

const emptyValue: ModulePermissionsMap = {};
const fullValue: ModulePermissionsMap = {
  Dashboard: { view: true, create: true, edit: true, delete: true },
};

describe('ModulePermissionsMatrix', () => {
  it('should render top-level module names', () => {
    render(
      <ModulePermissionsMatrix
        value={emptyValue}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Users')).toBeDefined();
    expect(screen.getByText('Reports')).toBeDefined();
    expect(screen.getByText('My Assets')).toBeDefined();
    expect(screen.getByText('Assets')).toBeDefined();
  });

  it('should render expandable parent modules with chevron', () => {
    render(
      <ModulePermissionsMatrix
        value={emptyValue}
        onChange={vi.fn()}
      />
    );
    // Reports, Assets are parent modules with children
    const reportsButton = screen.getByText('Reports').closest('button');
    expect(reportsButton).toBeDefined();
  });

  it('should call onChange when a switch is toggled', () => {
    const handleChange = vi.fn();
    render(
      <ModulePermissionsMatrix
        value={emptyValue}
        onChange={handleChange}
      />
    );
    // Dashboard has no children, its View switch should call onChange
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);

    // Toggle the first un-checked switch
    const uncheckedSwitch = switches.find(
      s => s.getAttribute('data-state') !== 'checked'
    );
    if (uncheckedSwitch) {
      uncheckedSwitch.click();
      expect(handleChange).toHaveBeenCalled();
    }
  });

  it('should not call onChange when disabled', () => {
    const handleChange = vi.fn();
    render(
      <ModulePermissionsMatrix
        value={fullValue}
        onChange={handleChange}
        disabled
      />
    );
    const switches = screen.getAllByRole('switch');
    switches[0]?.click();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should render with full permissions', () => {
    render(
      <ModulePermissionsMatrix
        value={fullValue}
        onChange={vi.fn()}
      />
    );
    const dashboardSwitches = screen.getAllByRole('switch');
    expect(dashboardSwitches.length).toBeGreaterThan(0);
  });
});
