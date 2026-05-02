import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';

export default function AssetsAssignmentHistory() {
  return (
    <div>
      <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
        <main className="flex-1 p-6 space-y-6">
          <PageHeader
            icon={ClipboardList}
            title="Assets Assignment History"
            description="View history of asset assignments"
          />
        </main>
      </div>
    </div>
  );
}
