import { Wrench } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';

export default function AssetsMaintenanceHistory() {
  return (
    <div>
      <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
        <main className="flex-1 p-6 space-y-6">
          <PageHeader
            icon={Wrench}
            title="Assets Maintenance History"
            description="View history of asset maintenance records"
          />
        </main>
      </div>
    </div>
  );
}
