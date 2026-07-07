import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  AuditFieldChanges,
  hasAuditFieldChanges,
  auditChangesSummary,
  parseAuditFieldRecord,
  formatAuditPlainText,
  buildMergedIdLabelMap,
} from '@/components/common/AuditFieldChanges';

describe('AuditFieldChanges - pure functions', () => {
  describe('buildMergedIdLabelMap', () => {
    it('should merge multiple lookup maps into a single map', () => {
      const result = buildMergedIdLabelMap({
        department_id: { 'uuid-1': 'Engineering', 'uuid-2': 'Marketing' },
        location_id: { 'uuid-3': 'Building A' },
      });
      expect(result).toEqual({
        'uuid-1': 'Engineering',
        'uuid-2': 'Marketing',
        'uuid-3': 'Building A',
      });
    });

    it('should return empty object for undefined', () => {
      expect(buildMergedIdLabelMap(undefined)).toEqual({});
    });
  });

  describe('formatAuditPlainText', () => {
    it('should replace UUIDs with resolved labels', () => {
      const result = formatAuditPlainText(
        'Asset moved to a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        { 'a1b2c3d4-e5f6-7890-abcd-ef1234567890': 'Building A' }
      );
      expect(result).toBe('Asset moved to Building A');
    });

    it('should replace unresolved UUIDs with Unknown reference', () => {
      const text = 'Moved to a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const result = formatAuditPlainText(text, {});
      expect(result).toBe('Moved to Unknown reference');
    });

    it('should return empty string for empty input', () => {
      expect(formatAuditPlainText('', {})).toBe('');
    });
  });

  describe('parseAuditFieldRecord', () => {
    it('should return undefined for null', () => {
      expect(parseAuditFieldRecord(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parseAuditFieldRecord(undefined)).toBeUndefined();
    });

    it('should parse JSON string', () => {
      const result = parseAuditFieldRecord('{"name":"Test"}');
      expect(result).toEqual({ name: 'Test' });
    });

    it('should return object as is', () => {
      const obj = { name: 'Test' };
      expect(parseAuditFieldRecord(obj)).toBe(obj);
    });

    it('should return undefined for invalid JSON string', () => {
      expect(parseAuditFieldRecord('not-json')).toBeUndefined();
    });
  });

  describe('hasAuditFieldChanges', () => {
    it('should return true when old and new differ', () => {
      expect(hasAuditFieldChanges({ name: 'Old' }, { name: 'New' })).toBe(true);
    });

    it('should return true when old and new have same keys (key existence check)', () => {
      expect(hasAuditFieldChanges({ name: 'Same' }, { name: 'Same' })).toBe(true);
    });

    it('should return true when only one side has values', () => {
      expect(hasAuditFieldChanges(null, { name: 'New' })).toBe(true);
    });

    it('should return false when both sides are null', () => {
      expect(hasAuditFieldChanges(null, null)).toBe(false);
    });
  });

  describe('auditChangesSummary', () => {
    it('should return single field change as formatted string', () => {
      const result = auditChangesSummary({ status: 'old' }, { status: 'new' });
      expect(result).toContain('old');
      expect(result).toContain('new');
    });

    it('should return field count for multiple changes', () => {
      const result = auditChangesSummary(
        { name: 'A', status: 'old' },
        { name: 'B', status: 'new' }
      );
      expect(result).toBe('2 fields changed');
    });

    it('should return empty string for no changes', () => {
      expect(auditChangesSummary(null, null)).toBe('');
    });
  });
});

describe('AuditFieldChanges - component', () => {
  it('should render changes list', () => {
    render(
      <AuditFieldChanges
        oldValues={{ name: 'Old Name' }}
        newValues={{ name: 'New Name' }}
      />
    );
    expect(screen.getByText('Changes')).toBeDefined();
    expect(screen.getByText('Old Name')).toBeDefined();
    expect(screen.getByText('New Name')).toBeDefined();
  });

  it('should render even when old and new values are identical (key existence, not value diff)', () => {
    render(
      <AuditFieldChanges oldValues={{ name: 'Same' }} newValues={{ name: 'Same' }} />
    );
    expect(screen.getByText('Changes')).toBeDefined();
    expect(screen.getAllByText('Same')).toHaveLength(2);
  });

  it('should return null when both values are null', () => {
    const { container } = render(
      <AuditFieldChanges oldValues={null} newValues={null} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should accept JSON string values', () => {
    render(
      <AuditFieldChanges
        oldValues={JSON.stringify({ name: 'Old' })}
        newValues={JSON.stringify({ name: 'New' })}
      />
    );
    expect(screen.getByText('Changes')).toBeDefined();
  });

  it('should render in compact mode without Changes header', () => {
    const { container } = render(
      <AuditFieldChanges
        oldValues={{ name: 'Old' }}
        newValues={{ name: 'New' }}
        compact
      />
    );
    expect(screen.queryByText('Changes')).toBeNull();
  });

  it('should handle empty values as (empty)', () => {
    render(
      <AuditFieldChanges oldValues={{ name: 'Old' }} newValues={{ name: '' }} />
    );
    expect(screen.getByText('(empty)')).toBeDefined();
  });
});
