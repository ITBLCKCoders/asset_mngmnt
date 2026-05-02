import { SettingsHeader } from './settingsComponents/settingsHeader';
import { SettingsTabs } from './settingsComponents/settingsTab';
import { GeneralTab } from './settingsComponents/settingsTabs/generalTab/generalTab';
import { AssetsTab } from './settingsComponents/settingsTabs/assetsTab/Assetstab';
import { LocationsTab } from './settingsComponents/settingsTabs/locationTab/locationTab';
import { DepartmentsTab } from './settingsComponents/settingsTabs/departmentsTab/departmentsTab';
import { NotificationsTab } from './settingsComponents/settingsTabs/notificationsTab';
import { UsersTab } from './settingsComponents/settingsTabs/usersTab/usersTab';
import { SecurityTab } from './settingsComponents/settingsTabs/securityTab';
import { FormsTab } from './settingsComponents/settingsTabs/formsTab/formsTab';
import { AuditRetentionTab } from './settingsComponents/settingsTabs/auditRetentionTab';

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 lg:p-6">
        <SettingsHeader />

        <SettingsTabs>
          <GeneralTab />
          <AssetsTab />
          <LocationsTab />
          <DepartmentsTab />
          <NotificationsTab />
          <UsersTab />
          <SecurityTab />
          <FormsTab />
          <AuditRetentionTab />
        </SettingsTabs>
      </main>
    </div>
  );
}
