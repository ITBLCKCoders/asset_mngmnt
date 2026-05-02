import { Hammer } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';

export default function AssetsRepairHistory() {
  return (
    <div>
      <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
        <main className="flex-1 p-6 space-y-6">
          <PageHeader
            icon={Hammer}
            title="Assets Repair History"
            description="View history of asset repair records"
          />
        </main>
      </div>
    </div>
  );
}
