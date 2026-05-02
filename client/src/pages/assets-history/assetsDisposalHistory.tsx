import { Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';

export default function AssetsDisposalHistory() {
  return (
    <div>
      <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
        <main className="flex-1 p-6 space-y-6">
          <PageHeader
            icon={Trash2}
            title="Assets Disposal History"
            description="View history of asset disposal records"
          />
        </main>
      </div>
    </div>
  );
}
