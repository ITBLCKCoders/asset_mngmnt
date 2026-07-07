# Documents Tab: Sub-tabs + Asset Checklist Tab

## Overview

Convert the vertical sections in the profile Documents tab into horizontal sub-tabs using the existing Radix Tabs UI, and add a new Asset Checklist Form tab.

---

## Step 1 — Server: Add `employee_id` filter to checklists endpoint

### 1a. Repository

**File:** `server/src/repositories/assetChecklistList.repository.ts`

Change signature and add WHERE clause:

```ts
// Line 9: Change function signature
export async function getAssetChecklists(employeeId?: string) {
```

After the `LEFT JOIN companies c ...` on line 75, add the WHERE clause:

```ts
const whereClause = employeeId ? `WHERE ac.employee_id = ?` : '';
```

Replace the query string to embed `whereClause` after the JOINs:

```ts
const query = `
  SELECT
    ...
  FROM asset_checklists ac
  LEFT JOIN asset_assignments aa ON ac.assignment_id = aa.assignmentID
  LEFT JOIN assets a ON aa.asset_id = a.assetID
  LEFT JOIN users u ON ac.created_by = u.userID
  LEFT JOIN users dh ON ac.dept_head_signed_by = dh.userID
  LEFT JOIN users im ON ac.it_manager_signed_by = im.userID
  LEFT JOIN companies c ON ac.employee_company = c.name AND c.deleted_at IS NULL
  ${whereClause}
  ORDER BY ac.created_at DESC
`;
```

Update the `pool.query` call to pass `employeeId` as parameter when provided:

```ts
const params = employeeId ? [employeeId] : [];
const [rows] = await pool.query(query, params);
```

### 1b. Controller

**File:** `server/src/controllers/assetAssignments.controller.ts` (around line 897)

```ts
export async function getAssetChecklistsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const employeeId = req.query.employee_id as string | undefined;
    const checklists = await checklistListRepo.getAssetChecklists(employeeId);
    return res.status(200).json({ checklists });
  } catch (error) {
    logger.error('Get asset checklists failed:', error);
    return res.status(500).json({ error: 'Failed to get asset checklists' });
  }
}
```

---

## Step 2 — Client: Convert to sub-tabs + add checklist tab

**File:** `client/src/pages/profile/profileComponents/tabs/documentsTab.tsx`

### 2a. Add imports (near top of file)

```ts
import { ClipboardList } from 'lucide-react';
import { generateAssetChecklistPDF } from '@/lib/pdfGenerator/assetChecklistPdf';
```

### 2b. Add ChecklistRow type (after the existing interfaces, around line 2424)

```ts
type ChecklistRow = {
  id: string;
  form_number?: string | null;
  assignment_id: string;
  employee_id: string;
  employee_name: string;
  employee_designation?: string | null;
  employee_department?: string | null;
  employee_company?: string | null;
  employee_company_logo_url?: string | null;
  type_onboarding: boolean;
  type_offboarding: boolean;
  received_by?: string | null;
  checklist_data: any;
  remarks?: string | null;
  created_at: string;
  creator_name?: string | null;
  creator_digital_signature?: string | null;
  employee_signed_at?: string | null;
  employee_digital_signature?: string | null;
  dept_head_signed_at?: string | null;
  dept_head_signed_by?: string | null;
  dept_head_digital_signature?: string | null;
  dept_head_name?: string | null;
  it_manager_signed_at?: string | null;
  it_manager_signed_by?: string | null;
  it_manager_digital_signature?: string | null;
  it_manager_name?: string | null;
  asset?: {
    id: string;
    code?: string | null;
    name?: string | null;
  } | null;
};
```

### 2c. Add new state variables (after existing state declarations, around line 2462)

```ts
const [assetChecklistForms, setAssetChecklistForms] = useState<ChecklistRow[]>([]);
const [filteredChecklistForms, setFilteredChecklistForms] = useState<ChecklistRow[]>([]);
const [checklistSearchQuery, setChecklistSearchQuery] = useState('');
const [selectedChecklist, setSelectedChecklist] = useState<ChecklistRow | null>(null);
const [showChecklistPreview, setShowChecklistPreview] = useState(false);
const [checklistPdfUrl, setChecklistPdfUrl] = useState<string | null>(null);
```

### 2d. Update the internal `activeTab` state (line 2481)

Replace:
```ts
const [activeTab, setActiveTabState] = useState<'accountability' | 'returns'>('accountability');
```

With:
```ts
const [activeSubTab, setActiveSubTab] = useState<string>('accountability');
```

### 2e. Add fetchAssetChecklistForms function (after fetchAssetBorrowForms, around line 2661)

```ts
const fetchAssetChecklistForms = async () => {
  if (!currentUser?.id) {
    setAssetChecklistForms([]);
    setFilteredChecklistForms([]);
    return;
  }
  try {
    const response = await api.get(`/asset-assignments/checklists?employee_id=${currentUser.id}`);
    const forms: ChecklistRow[] = Array.isArray(response.checklists) ? response.checklists : [];
    setAssetChecklistForms(forms);
    setFilteredChecklistForms(forms);
  } catch (error) {
    console.error('Failed to fetch checklist forms:', error);
    setAssetChecklistForms([]);
    setFilteredChecklistForms([]);
  }
};
```

### 2f. Add checklist search filter effect (after borrow search effect, around line 2643)

```ts
useEffect(() => {
  if (!checklistSearchQuery.trim()) {
    setFilteredChecklistForms(assetChecklistForms);
  } else {
    const q = checklistSearchQuery.trim().toLowerCase();
    const filtered = assetChecklistForms.filter(row =>
      [row.form_number, row.employee_name, row.employee_department, row.employee_company, row.asset?.name, row.asset?.code]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(q))
    );
    setFilteredChecklistForms(filtered);
  }
}, [checklistSearchQuery, assetChecklistForms]);
```

### 2g. Add checklist fetch to the loadData useEffect (around line 2663-2677)

Add `fetchAssetChecklistForms()` to the Promise.all array:

```ts
await Promise.all([
  fetchAccountabilityForms(),
  fetchAssetReturnForms(),
  fetchAssetTransferForms(),
  fetchAssetBorrowForms(),
  fetchAssetChecklistForms(),
]);
```

### 2h. Add handleDownloadChecklist and handleViewChecklist functions

After the borrow-related handlers:

```ts
const handleDownloadChecklist = async (row: ChecklistRow) => {
  try {
    const assetLabel = row.asset
      ? `${row.asset.name || 'Asset'} (${row.asset.code || '—'})`
      : 'Asset';
    const blob = await generateAssetChecklistPDF({ ...row, asset_label: assetLabel });
    const formNumber = row.form_number || `CHK-${row.assignment_id}`;
    downloadPDF(blob, `Asset_Checklist_${formNumber}.pdf`);
    toast.success('Checklist PDF downloaded successfully');
  } catch (error) {
    console.error('Failed to download checklist PDF:', error);
    toast.error('Failed to download checklist PDF');
  }
};

const handleViewChecklist = async (row: ChecklistRow) => {
  setSelectedChecklist(row);
  setShowChecklistPreview(true);
};
```

### 2i. Replace the `<CardContent>` section (lines 2978-3365)

Replace the entire CardContent with the new tabbed structure:

```tsx
<CardContent className="p-4 sm:p-6 lg:p-8">
  <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
    <TabsList className={cn(segmentTabsListClassName, 'grid grid-cols-2 sm:grid-cols-5 mb-6')}>
      <TabsTrigger value="accountability" className={cn(segmentTabsTriggerClassName, 'text-xs sm:text-sm')}>
        <FileCheck className="mr-1.5 h-4 w-4" /> Accountability
      </TabsTrigger>
      <TabsTrigger value="returns" className={cn(segmentTabsTriggerClassName, 'text-xs sm:text-sm')}>
        <FileDown className="mr-1.5 h-4 w-4" /> Returns
      </TabsTrigger>
      <TabsTrigger value="transfers" className={cn(segmentTabsTriggerClassName, 'text-xs sm:text-sm')}>
        <ArrowRightLeft className="mr-1.5 h-4 w-4" /> Transfers
      </TabsTrigger>
      <TabsTrigger value="borrows" className={cn(segmentTabsTriggerClassName, 'text-xs sm:text-sm')}>
        <HandHelping className="mr-1.5 h-4 w-4" /> Borrows
      </TabsTrigger>
      <TabsTrigger value="checklists" className={cn(segmentTabsTriggerClassName, 'text-xs sm:text-sm')}>
        <ClipboardList className="mr-1.5 h-4 w-4" /> Checklists
      </TabsTrigger>
    </TabsList>

    {/* TabsContent: Accountability */}
    <TabsContent value="accountability" className="mt-0">
      ...existing accountability section content (lines 2979-3083)...
    </TabsContent>

    {/* TabsContent: Returns */}
    <TabsContent value="returns" className="mt-0">
      ...existing return forms section content (lines 3085-3188)...
    </TabsContent>

    {/* TabsContent: Transfers */}
    <TabsContent value="transfers" className="mt-0">
      ...existing transfer forms section content (lines 3190-3274)...
    </TabsContent>

    {/* TabsContent: Borrows */}
    <TabsContent value="borrows" className="mt-0">
      ...existing borrow forms section content (lines 3276-3352)...
    </TabsContent>

    {/* TabsContent: Checklists (NEW) */}
    <TabsContent value="checklists" className="mt-0">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-6 h-6 text-red-600" />
        <h3 className="text-xl font-semibold text-gray-900">Asset Checklist Forms</h3>
        <span className="bg-red-100 text-red-800 text-sm px-2 py-1 rounded-full">
          {filteredChecklistForms.length}
        </span>
      </div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search form number, employee, asset..."
          value={checklistSearchQuery}
          onChange={e => setChecklistSearchQuery(e.target.value)}
          className="pl-10 pr-4 py-2 w-full max-w-md"
        />
      </div>
      {filteredChecklistForms.length === 0 ? (
        <div className="text-center py-12 rounded-lg">
          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          {checklistSearchQuery ? (
            <>
              <p className="text-gray-500 text-lg">No checklist forms found</p>
              <p className="text-gray-400 text-sm mt-1">No forms match &quot;{checklistSearchQuery}&quot;.</p>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-lg">No checklist forms yet</p>
              <p className="text-gray-400 text-sm mt-1">Checklist forms will appear here when assigned.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChecklistForms.map(row => (
            <Card key={row.id} className="hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <ClipboardList className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {row.form_number || `CHK-${row.assignment_id}`}
                      </CardTitle>
                      <p className="text-sm text-gray-500">
                        Created {new Date(row.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                    {row.type_onboarding && row.type_offboarding
                      ? 'Onboarding/Offboarding'
                      : row.type_onboarding
                        ? 'Onboarding'
                        : row.type_offboarding
                          ? 'Offboarding'
                          : 'Checklist'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{row.employee_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">
                      {row.asset
                        ? `${row.asset.name || 'Asset'} (${row.asset.code || '—'})`
                        : 'Asset'}
                    </p>
                  </div>
                </div>
                {row.employee_department && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600">
                        Department: {row.employee_department}
                      </p>
                    </div>
                  </div>
                )}
                {row.received_by && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600">
                        Received by: {row.received_by}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">
                      {new Date(row.created_at).toLocaleDateString()}{' '}
                      {new Date(row.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </CardContent>
              <div className="flex gap-2 border-t border-slate-100 p-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 hover:bg-red-600 hover:text-white"
                  onClick={() => handleViewChecklist(row)}
                >
                  <Eye className="mr-2 h-4 w-4" /> View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 hover:bg-blue-600 hover:text-white"
                  onClick={() => handleDownloadChecklist(row)}
                >
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </TabsContent>
  </Tabs>
</CardContent>
```

### 2j. Add checklist preview dialog (after the Return Form Detail Dialog, before the closing `</>`)

```tsx
{/* Checklist Preview Dialog */}
<Dialog open={showChecklistPreview} onOpenChange={(open) => {
  if (!open) {
    setShowChecklistPreview(false);
    if (checklistPdfUrl) {
      URL.revokeObjectURL(checklistPdfUrl);
      setChecklistPdfUrl(null);
    }
  }
}}>
  <AppDialogFrame className="max-w-4xl max-h-[90vh] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
    <AppDialogGradientHeader
      title={
        selectedChecklist
          ? `${selectedChecklist.employee_name} - ${selectedChecklist.form_number || `CHK-${selectedChecklist.assignment_id}`}`
          : 'Asset Checklist'
      }
      description="Asset Checklist Form Preview"
    />
    <AppDialogBody className="min-h-0 flex-1 overflow-auto !p-0">
      {checklistPdfUrl ? (
        <PDFViewer pdfUrl={checklistPdfUrl} className="h-full w-full" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-gray-500">
          Generating checklist PDF preview...
        </div>
      )}
    </AppDialogBody>
    <AppDialogChromeFooter className="justify-end gap-3">
      {selectedChecklist && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownloadChecklist(selectedChecklist)}
        >
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setShowChecklistPreview(false);
          if (checklistPdfUrl) {
            URL.revokeObjectURL(checklistPdfUrl);
            setChecklistPdfUrl(null);
          }
        }}
      >
        Close
      </Button>
    </AppDialogChromeFooter>
  </AppDialogFrame>
</Dialog>
```

### 2k. Add useEffect to generate checklist PDF when preview opens

After the other effects:

```ts
useEffect(() => {
  if (!showChecklistPreview || !selectedChecklist) return;
  let cancelled = false;
  const generate = async () => {
    try {
      const assetLabel = selectedChecklist.asset
        ? `${selectedChecklist.asset.name || 'Asset'} (${selectedChecklist.asset.code || '—'})`
        : 'Asset';
      const blob = await generateAssetChecklistPDF({
        ...selectedChecklist,
        asset_label: assetLabel,
      });
      if (cancelled) return;
      const url = URL.createObjectURL(blob);
      setChecklistPdfUrl(url);
    } catch (error) {
      console.error('Failed to generate checklist preview:', error);
      toast.error('Failed to generate checklist PDF');
    }
  };
  generate();
  return () => {
    cancelled = true;
    setChecklistPdfUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };
}, [showChecklistPreview, selectedChecklist]);
```

### 2l. Remove unused old activeTab state

Delete or comment out the old `const [activeTab, setActiveTabState] = useState<'accountability' | 'returns'>('accountability');` since it's been replaced by `activeSubTab`.

---

## Step 3 — Verify

```bash
npm run lint --workspace=server
npm run lint --workspace=client
npm run test:unit --workspace=server
```
