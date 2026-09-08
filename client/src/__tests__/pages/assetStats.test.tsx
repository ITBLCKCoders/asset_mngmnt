import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AssetStats } from '@/pages/assets/assets-list/assetsComponents/assetStats';

const makeIntangibleAsset = (overrides: Record<string, any> = {}) => ({
  id: `ia-${Math.random().toString(36).slice(2)}`,
  name: 'Sample License',
  status: 'available',
  type: 'Software License',
  risk_level: null,
  ...overrides,
});

describe('AssetStats (intangible-assets tab)', () => {
  it('shows status-based Assigned/Available counts', () => {
    const { container } = render(
      <AssetStats
        assets={[]}
        loading={false}
        activeTab="intangible-assets"
        intangibleAssets={[
          makeIntangibleAsset({ status: 'assigned', type: 'Software License' }),
          makeIntangibleAsset({ status: 'assigned', type: 'Domain Name' }),
          makeIntangibleAsset({ status: 'available', type: 'Software License' }),
        ]}
      />
    );

    expect(screen.getByText('Total Intangible Assets')).toBeInTheDocument();
    expect(screen.getByText('Assigned')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.queryByText('Distinct Types')).not.toBeInTheDocument();

    // Extract the numeric value shown in each card by locating its label first
    const cardValue = (label: string): string => {
      const labelEl = Array.from(container.querySelectorAll('*')).find(
        el => el.children.length === 0 && el.textContent === label
      );
      const valueEl = labelEl?.closest('div')?.parentElement?.nextElementSibling?.firstElementChild;
      if (!valueEl) throw new Error(`Card for "${label}" not found`);
      return valueEl.textContent ?? '';
    };

    // Values: total=3, assigned=2, available=1, no risk level=3
    expect(cardValue('Total Intangible Assets')).toBe('3');
    expect(cardValue('Assigned')).toBe('2');
    expect(cardValue('Available')).toBe('1');
    expect(cardValue('No Risk Level')).toBe('3');
  });

  it('renders one card per company-defined risk level with its count', () => {
    render(
      <AssetStats
        assets={[]}
        loading={false}
        activeTab="intangible-assets"
        intangibleAssets={[
          makeIntangibleAsset({ risk_level: { id: 'rl-1', name: 'High', color: '#ef4444' } }),
          makeIntangibleAsset({ risk_level: { id: 'rl-1', name: 'High', color: '#ef4444' } }),
          makeIntangibleAsset({ risk_level: { id: 'rl-2', name: 'Low', color: '#22c55e' } }),
        ]}
      />
    );

    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    // No "No Risk Level" card when every asset has a risk level
    expect(screen.queryByText('No Risk Level')).not.toBeInTheDocument();
  });

  it('shows a No Risk Level card only when assets lack a risk level', () => {
    render(
      <AssetStats
        assets={[]}
        loading={false}
        activeTab="intangible-assets"
        intangibleAssets={[
          makeIntangibleAsset(),
          makeIntangibleAsset({ risk_level: { id: 'rl-1', name: 'Medium', color: '#eab308' } }),
        ]}
      />
    );

    expect(screen.getByText('No Risk Level')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('renders the loading skeleton for the intangible tab', () => {
    const { container } = render(
      <AssetStats assets={[]} loading activeTab="intangible-assets" />
    );
    const cards = container.querySelectorAll('.animate-pulse');
    expect(cards.length).toBe(7);
  });
});
