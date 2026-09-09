# Add PDF Preview Tab to Asset Return & Transfer Confirmation Dialogs

## Goal
Add a "PDF Preview" tab inside the Asset Return Confirmation dialog (ReturnRequestsPage) and the Asset Transfer Confirmation dialog (TransferRequestsPage) so users can preview the generated PDF without opening a separate dialog.

## Current context / assumptions
- Both pages already generate PDFs client-side via `generateAssetReturnPDF` / `generateAssetTransferPDF` from `@/lib/pdfGenerator`.
- Both pages already have a separate "View Form" dialog (opened via "View Form" button) that renders `ReturnFormDetail` / `TransferFormDetail` with `contentOnly` — these components generate the PDF blob, store a blob URL, and render it in an `<iframe>`.
- `ReturnFormDetail` and `TransferFormDetail` live in `client/src/pages/profile/profileComponents/tabs/documentsTab.tsx` and export the PDF body when `contentOnly` is true.
- `ReturnRequestsPage` confirmation dialog already has one tab ("Physical Assets"); we add a second tab "PDF Preview".
- `TransferRequestsPage` confirmation dialog has no tabs at all; we wrap the existing content area in a `Tabs` component with two tabs: "Assets" and "PDF Preview".
- PDF blobs are in-memory (URL.createObjectURL) and short-lived; each render of the preview tab regenerates the blob on demand so it stays fresh.
- No backend changes needed — this is purely client-side tab + PDF render wiring.
- The existing separate "View Form" dialog remains as-is; the new tab is an additional path to the same preview. We do not remove the separate dialog.

## Architecture / proposed approach
- In each confirmation dialog, add a "PDF Preview" tab.
- The tab content renders the same `contentOnly` body that `ReturnFormDetail` / `TransferFormDetail` already produce: an `<iframe>` pointing at a blob URL generated from the current form data.
- PDF generation is triggered lazily when the user opens the PDF Preview tab (not on dialog open), to avoid blocking the confirmation dialog's initial render.
- We reuse the existing `buildReturnDataForPDFFromBatch` / `buildTransferDataForPDFFromBatch` + `generateAssetReturnPDF` / `generateAssetTransferPDF` pipeline already imported in both pages.
- The PDF Preview tab body mirrors the `pdfBody` fragment inside `ReturnFormDetail`/`TransferFormDetail`: a flex container with a bordered iframe, a loading spinner, and an error state. We do not import the full component with its header/footer — we inline the body fragment only, keeping the dialog chrome unchanged.
- Tab state is independent of the existing `activeTab` used for the page-level Request/Processed tabs.

## Step-by-step tasks

### Task 1: Add PDF Preview tab to Return Requests confirmation dialog
**File**: `client/src/pages/assets/returnRequestsPage.tsx`

**What to do**:
1. Add a new state variable near the other dialog state (around line 184, alongside `processForm`):
   ```ts
   const [returnPdfPreviewTab, setReturnPdfPreviewTab] = useState('physical-assets');
   const [returnPdfUrl, setReturnPdfUrl] = useState<string>('');
   const [returnPdfLoading, setReturnPdfLoading] = useState(false);
   const [returnPdfError, setReturnPdfError] = useState<string | null>(null);
   const returnPdfUrlRef = useRef<string>('');
   ```
   Note: `useRef` is already imported at line 78.

2. Add a `useEffect` (after the existing `useEffect` at line 311) that regenerates the PDF when the user switches to the PDF Preview tab AND a form is open:
   ```ts
   useEffect(() => {
     if (returnPdfPreviewTab !== 'pdf-preview' || !processForm) return;
     let cancelled = false;
     const generate = async () => {
       setReturnPdfLoading(true);
       setReturnPdfError(null);
       setReturnPdfUrl('');
       if (returnPdfUrlRef.current.startsWith('blob:')) {
         URL.revokeObjectURL(returnPdfUrlRef.current);
       }
       returnPdfUrlRef.current = '';
       try {
         const data = buildReturnDataForPDFFromBatch(processForm);
         if (!data) {
           setReturnPdfError('Return form data is missing or incomplete');
           return;
         }
         const blob = await generateAssetReturnPDF(data);
         if (cancelled) return;
         const url = URL.createObjectURL(blob);
         returnPdfUrlRef.current = url;
         setReturnPdfUrl(url);
       } catch (err) {
         if (!cancelled) {
           console.error('Return PDF preview generation failed:', err);
           setReturnPdfError('Failed to generate PDF preview. Please try again.');
         }
       } finally {
         if (!cancelled) setReturnPdfLoading(false);
       }
     };
     generate();
     return () => { cancelled = true; };
   }, [returnPdfPreviewTab, processForm]);
   ```

3. Convert the existing single-tab block at lines 1401–1596 into a two-tab `Tabs` block. The current structure is:
   ```
   <Tabs defaultValue="physical-assets">
     <TabsList><TabsTrigger value="physical-assets">Physical Assets</TabsTrigger></TabsList>
     <TabsContent value="physical-assets">...</TabsContent>
   </Tabs>
   ```
   Change to:
   ```tsx
   <Tabs
     value={returnPdfPreviewTab}
     onValueChange={v => setReturnPdfPreviewTab(v as 'physical-assets' | 'pdf-preview')}
     className="w-full"
   >
     <TabsList className={segmentTabsListClassName + ' grid grid-cols-2 w-full'}>
       <TabsTrigger value="physical-assets" className={segmentTabsTriggerClassName}>
         Physical Assets
         <Badge variant="secondary" className="ml-1 text-xs">{processForm.returns.length}</Badge>
       </TabsTrigger>
       <TabsTrigger value="pdf-preview" className={segmentTabsTriggerClassName}>
         PDF Preview
       </TabsTrigger>
     </TabsList>

     <TabsContent value="physical-assets" className="mt-4 space-y-4">
       {/* EXISTING physical-assets content — unchanged, lines 1412–1594 */}
     </TabsContent>

     <TabsContent value="pdf-preview" className="mt-4 space-y-4">
       <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3">
         <h3 className="text-sm font-semibold text-slate-800 tracking-tight uppercase flex items-center gap-2 mb-3">
           <FileText className="h-4 w-4 text-red-500" />
           Asset Return Form — PDF Preview
         </h3>
         <div className="w-full flex-1 min-h-0 border rounded-lg overflow-hidden bg-gray-50">
           {returnPdfError && !returnPdfLoading && !returnPdfUrl ? (
             <div className="w-full h-full min-h-[200px] flex items-center justify-center text-red-500">
               {returnPdfError}
             </div>
           ) : (
             <div className="relative w-full h-full min-h-[200px]">
               {(returnPdfLoading || !returnPdfUrl) && (
                 <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                   <div className="flex flex-col items-center gap-3 text-gray-500">
                     <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                     <p className="text-sm">Loading PDF preview...</p>
                   </div>
                 </div>
               )}
               {returnPdfUrl && (
                 <iframe
                   src={returnPdfUrl}
                   className="w-full h-full min-h-0"
                   title="Return Form PDF Preview"
                   style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                 />
               )}
             </div>
           )}
         </div>
       </div>
       {returnPdfUrl && (
         <div className="flex justify-end">
           <Button
             size="sm"
             variant="outline"
             onClick={() => {
               if (!processForm) return;
               const data = buildReturnDataForPDFFromBatch(processForm);
               if (!data) { toast.error('Cannot generate PDF for download'); return; }
               generateAssetReturnPDF(data).then(blob => {
                 const fileName = processForm.form_number
                   ? `Asset_Return_Form_${processForm.form_number}_${Date.now()}.pdf`
                   : `Asset_Return_Form_${Date.now()}.pdf`;
                 downloadPDF(blob, fileName);
                 toast.success('Return form downloaded successfully');
               }).catch(() => toast.error('Failed to download PDF'));
             }}
           >
             <Download className="h-4 w-4 mr-2" />
             Download PDF
           </Button>
         </div>
       )}
     </TabsContent>
   </Tabs>
   ```
   - Keep the existing `<TabsContent value="physical-assets">` body exactly as-is (lines 1412–1594), just move it inside the new two-column `TabsList`.
   - `FileText` is already imported at line 20. `Badge` already imported at line 33. `Download` already imported at line 24. `Button` already imported at line 31.
   - The `Badge` inside the Physical Assets tab trigger was already present at lines 1406–1408 — preserve it.
   - The `-mx-3` on the rounded boxes matches the existing pattern in the same dialog (e.g. line 1343, 1427).

4. (Optional but recommended) Clean up revoked blob URL on dialog close: add to the `onOpenChange` handler on the `<Dialog>` at line 1306 — when `open` is false, revoke `returnPdfUrlRef.current` if it is a blob URL and reset state. This is optional; the next open will regenerate.

### Task 2: Add PDF Preview tab to Transfer Requests confirmation dialog
**File**: `client/src/pages/assets/transferRequestsPage.tsx`

**What to do**:
1. Add new state variables near `selectedBatch` (around line 158):
   ```ts
   const [transferPdfPreviewTab, setTransferPdfPreviewTab] = useState('assets');
   const [transferPdfUrl, setTransferPdfUrl] = useState<string>('');
   const [transferPdfLoading, setTransferPdfLoading] = useState(false);
   const [transferPdfError, setTransferPdfError] = useState<string | null>(null);
   const transferPdfUrlRef = useRef<string>('');
   ```

2. Add a `useEffect` (after the `useEffect` at line 246):
   ```ts
   useEffect(() => {
     if (transferPdfPreviewTab !== 'pdf-preview' || !selectedBatch) return;
     let cancelled = false;
     const generate = async () => {
       setTransferPdfLoading(true);
       setTransferPdfError(null);
       setTransferPdfUrl('');
       if (transferPdfUrlRef.current.startsWith('blob:')) {
         URL.revokeObjectURL(transferPdfUrlRef.current);
       }
       transferPdfUrlRef.current = '';
       try {
         const data = buildTransferDataForPDFFromBatch(selectedBatch);
         if (!data) {
           setTransferPdfError('Transfer form data is missing or incomplete');
           return;
         }
         const blob = await generateAssetTransferPDF(data);
         if (cancelled) return;
         const url = URL.createObjectURL(blob);
         transferPdfUrlRef.current = url;
         setTransferPdfUrl(url);
       } catch (err) {
         if (!cancelled) {
           console.error('Transfer PDF preview generation failed:', err);
           setTransferPdfError('Failed to generate PDF preview. Please try again.');
         }
       } finally {
         if (!cancelled) setTransferPdfLoading(false);
       }
     };
     generate();
     return () => { cancelled = true; };
   }, [transferPdfPreviewTab, selectedBatch]);
   ```

3. The current confirmation dialog body (lines 1154–1475) has NO tabs — it is a flat sequence of sections inside `AppDialogBody`. Wrap the asset-condition section (lines 1207–1365, the `{(selectedBatch.returns || []).map(...)}` block) in a `Tabs` component so the dialog has two tabs: "Assets" and "PDF Preview".

   The asset section currently starts with:
   ```tsx
   <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
     <Label className="...">Tangible Asset ({...})</Label>
   </div>
   {(selectedBatch.returns || []).map(r => (...))}
   ```
   Restructure to:
   ```tsx
   <Tabs
     value={transferPdfPreviewTab}
     onValueChange={v => setTransferPdfPreviewTab(v as 'assets' | 'pdf-preview')}
     className="w-full"
   >
     <TabsList className={segmentTabsListClassName + ' grid grid-cols-2 w-full'}>
       <TabsTrigger value="assets" className={segmentTabsTriggerClassName}>
         Assets
         <Badge variant="secondary" className="ml-1 text-xs">{(selectedBatch.returns || []).length}</Badge>
       </TabsTrigger>
       <TabsTrigger value="pdf-preview" className={segmentTabsTriggerClassName}>
         PDF Preview
       </TabsTrigger>
     </TabsList>

     <TabsContent value="assets" className="space-y-4">
       <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
         <Label className="text-sm font-semibold text-slate-800 tracking-tight uppercase flex items-center gap-2">
           <Package className="h-4 w-4 text-red-500" />
           Tangible Asset ({(selectedBatch.returns || []).length})
         </Label>
       </div>
       {(selectedBatch.returns || []).map(r => (
         /* EXISTING asset card — unchanged, lines 1215–1365 */
       ))}
     </TabsContent>

     <TabsContent value="pdf-preview" className="space-y-4">
       <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm -mx-3">
         <h3 className="text-sm font-semibold text-slate-800 tracking-tight uppercase flex items-center gap-2 mb-3">
           <FileText className="h-4 w-4 text-red-500" />
           Asset Transfer Form — PDF Preview
         </h3>
         <div className="w-full flex-1 min-h-0 border rounded-lg overflow-hidden bg-gray-50">
           {transferPdfError && !transferPdfLoading && !transferPdfUrl ? (
             <div className="w-full h-full min-h-[200px] flex items-center justify-center text-red-500">
               {transferPdfError}
             </div>
           ) : (
             <div className="relative w-full h-full min-h-[200px]">
               {(transferPdfLoading || !transferPdfUrl) && (
                 <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                   <div className="flex flex-col items-center gap-3 text-gray-500">
                     <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                     <p className="text-sm">Loading PDF preview...</p>
                   </div>
                 </div>
               )}
               {transferPdfUrl && (
                 <iframe
                   src={transferPdfUrl}
                   className="w-full h-full min-h-0"
                   title="Transfer Form PDF Preview"
                   style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                 />
               )}
             </div>
           )}
         </div>
       </div>
       {transferPdfUrl && (
         <div className="flex justify-end">
           <Button
             size="sm"
             variant="outline"
             onClick={() => {
               if (!selectedBatch) return;
               const data = buildTransferDataForPDFFromBatch(selectedBatch);
               if (!data) { toast.error('Cannot generate PDF for download'); return; }
               generateAssetTransferPDF(data).then(blob => {
                 const fileName = selectedBatch.form_number
                   ? `Asset_Transfer_Form_${selectedBatch.form_number}_${Date.now()}.pdf`
                   : `Asset_Transfer_Form_${Date.now()}.pdf`;
                 downloadPDF(blob, fileName);
                 toast.success('Transfer form downloaded successfully');
               }).catch(() => toast.error('Failed to download PDF'));
             }}
           >
             <Download className="h-4 w-4 mr-2" />
             Download PDF
           </Button>
         </div>
       )}
     </TabsContent>
   </Tabs>
   ```
   - `Package` is already imported at line 18. `FileText` already imported at line 16. `Badge` already imported at line 27. `Download` already imported at line 22. `Button` already imported at line 30. `Tabs`/`TabsContent`/`TabsList`/`TabsTrigger` already imported at lines 39–45. `segmentTabsListClassName`/`segmentTabsTriggerClassName` already imported at lines 43–44.
   - The "Request details" section (lines 1368–1394) and everything after it (Reviewed by, AdminCopySignerSelect, Verification) stays OUTSIDE the tabs, as siblings after the `</TabsContent>` — they were already siblings after the asset cards section, not inside it.

   The existing structure is:
   ```
   [Tangible Asset header]
   [asset cards map]
   [Request details]
   [Reviewed by]
   [AdminCopySignerSelect]
   [Verification]
   ```
   After the change it becomes:
   ```
   [Tabs: Assets | PDF Preview]
     [Assets tab: header + asset cards]
     [PDF Preview tab: iframe + download]
   [Request details]
   [Reviewed by]
   [AdminCopySignerSelect]
   [Verification]
   ```

### Task 3: Verify build + existing tests still pass
**Commands** (run from repo root):
```bash
npm run build --workspace=client 2>&1 | tail -30
```
Expected: `client` build succeeds (exit 0), no new type errors. Any pre-existing errors are unchanged.

```bash
npm run test:unit --workspace=server 2>&1 | tail -20
```
Expected: server unit tests pass (this task touches only client code, so server tests are a no-op sanity check).

```bash
npm run test --workspace=client 2>&1 | tail -40
```
Expected: client tests pass, including the existing `PdfPreviewModal.test.tsx`. The new tab logic is UI-only and has no new unit test scope unless the team wants one later.

## Tests / validation
- Build check: `npm run build --workspace=client` exits 0 with no new TypeScript errors.
- Test check: `npm run test --workspace=client` exits 0; existing `PdfPreviewModal.test.tsx` still passes.
- Manual smoke test (once deployed/run):
  1. Open Return Requests page → open any pending return → click "View / Return Asset" → confirm a "PDF Preview" tab appears next to "Physical Assets" → click it → PDF preview iframe loads (or shows "Loading..." then the PDF).
  2. Open Transfer Requests page → open any approved transfer → click "View & Transfer" → confirm "Assets" and "PDF Preview" tabs → click PDF Preview → preview loads.
  3. Click "Download PDF" in the preview tab → a file downloads with the expected name.
  4. Click away from the PDF tab and back → preview regenerates without stale content (blob URL is revoked on each regeneration).
  5. Open the dialog, do NOT open PDF Preview, then close the dialog → no PDF generation request was made (lazy load — verify in Network tab that no PDF gen call fires until the tab is opened).
- The existing separate "View Form" dialog still works as before (not removed).

## Risks, tradeoffs, and open questions
- **Blob URL memory**: We revoke the previous blob URL before generating a new one, and revoke on dialog close (optional step in Task 1). Without revocation, rapid tab switching could leak blob URLs. The `useRef` + revoke pattern in the existing `ReturnFormDetail`/`TransferFormDetail` components already handles this; we mirror it.
- **Lazy vs eager generation**: We generate on tab open, not on dialog open. If the PDF is large, the first open of the PDF tab may take a moment (spinner covers it). This is the same tradeoff the existing separate "View Form" dialog makes.
- **Two paths to the same PDF**: The separate "View Form" dialog and the new tab both render the same PDF. This is intentional per the task ("add a tab to see the pdf preview") — we are not removing the existing dialog. If the team later wants a single source of truth, extract a shared `PdfPreviewBody` component into `client/src/components/common/` and have both the tab and `ReturnFormDetail`/`TransferFormDetail` use it. Not in scope now.
- **Transfer dialog layout shift**: The Transfer confirmation dialog currently has no tabs; adding them changes the layout of the asset section from flat to tabbed. The "Request details", "Reviewed by", "AdminCopySignerSelect", and "Verification" blocks remain below the tabs as before. Verify visually that the tab list does not make the dialog feel cramped on small screens — the tab list uses the existing `segmentTabsListClassName` grid which already wraps.
- **`-mx-3` offset**: The PDF preview card uses `-mx-3` to match the existing cards in the Return dialog (e.g. line 1343). The Transfer dialog does not use `-mx-3` on its cards (it uses `shadow-sm` without negative margin). For consistency with the Transfer dialog's existing card style, the PDF preview card in Transfer uses `rounded-xl border border-slate-200 bg-white p-5 shadow-sm` WITHOUT `-mx-3`. If the team prefers visual parity with the Return dialog, add `-mx-3` there too — but that is a cosmetic decision, not required for function.
- **No backend changes**: This task is client-only. No API routes, DTOs, or DB migrations are touched.
