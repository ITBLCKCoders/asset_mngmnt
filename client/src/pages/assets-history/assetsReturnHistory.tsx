import { Undo2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';

export default function AssetsReturnHistory() {
  return (
    <div>
      <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
        <main className="flex-1 p-6 space-y-6">
          <PageHeader
            icon={Undo2}
            title="Assets Return History"
            description="View history of asset return records"
          />
        </main>
      </div>
    </div>
  );
}
