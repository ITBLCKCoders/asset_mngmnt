import { jsPDF } from 'jspdf';
import {
  addCompanyLogoToPDF,
  autoTable,
  downloadPDF,
  fetchActiveCompanyForAccountabilityForm,
  getCompanyAccentColor,
  getCompanyAccentHex,
  isBlackCoders,
  resolveCompanyBranding,
} from './shared';

import type { DashboardData, MovementDataPoint, AuditLogItem } from '@/pages/dashboard/dashboard';
import type { PdfCompanyBranding } from './shared';

const PAGE_WIDTH = 215.9;
const PAGE_HEIGHT = 330.2;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_BAR_Y = 320;
const FOOTER_LINE_Y = 324;

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

function getMovementData(
  dashboardData: DashboardData,
  movementPeriod: 'weekly' | 'monthly'
): MovementDataPoint[] {
  return dashboardData.movement?.[movementPeriod] ?? [];
}

export async function generateDashboardPDF(
  dashboardData: DashboardData,
  companyName: string | null | undefined,
  auditLogs: AuditLogItem[],
  movementPeriod: 'weekly' | 'monthly'
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_WIDTH, PAGE_HEIGHT],
  });

  doc.setProperties({
    title: 'Asset Management Dashboard',
    subject: 'Dashboard Export',
    author: 'Asset Management System',
  });

  const branding = await resolveCompanyBranding(
    (await fetchActiveCompanyForAccountabilityForm()) as PdfCompanyBranding | null
  );
  const resolvedName = branding?.name || companyName || null;
  const accentColor = getCompanyAccentColor(resolvedName);
  const isBc = isBlackCoders(resolvedName);
  const headerFill: [number, number, number] = isBc ? [0, 0, 0] : [accentColor.r, accentColor.g, accentColor.b];

  // --- Header: Logo + Title ---
  await addCompanyLogoToPDF(doc, branding?.logo_url, MARGIN, 10);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('ASSET MANAGEMENT DASHBOARD', PAGE_WIDTH / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${formatDate()}`, PAGE_WIDTH / 2, 27, { align: 'center' });

  if (resolvedName) {
    doc.text(`Company: ${resolvedName}`, PAGE_WIDTH / 2, 33, { align: 'center' });
  }

  // --- Section 1: Summary Stats ---
  let y = 42;
  const s = dashboardData.stats;
  const statRows: string[][] = [];

  const statDefs: [string, number][] = [
    ['Total Assets', s.totalAssets],
    ['Active Assets', s.activeAssignments],
    ['Available', s.availableAssets],
    ['Deployed', s.deployedAssets],
    ['Under Maintenance', s.underMaintenance],
    ['Under Repair', s.underRepair],
    ['Disposed', s.disposedAssets],
    ['Borrow Requests', s.borrowRequestsCount],
    ['Pending Transfer', s.pendingTransferCount],
    ['Pending Return', s.pendingReturnCount],
    ['Borrowed', s.borrowedAssets],
    ['Returned', s.returnedAssets],
    ['Transfered', s.transferedAssets],
    ['For Disposal', s.forDisposal],
    ['For Maintenance', s.forMaintenance],
    ['For Repair', s.forRepair],
  ];

  for (const [label, value] of statDefs) {
    statRows.push([label, String(value)]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Metric', 'Value']],
    body: statRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: headerFill, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: CONTENT_WIDTH * 0.7 }, 1: { cellWidth: CONTENT_WIDTH * 0.3, halign: 'center' } },
    didParseCell: (data) => {
      if (data.row.index % 2 === 1 && data.section === 'body') {
        data.cell.styles.fillColor = [248, 248, 248];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // --- Section 2: Asset by Type ---
  if (dashboardData.assetByType && dashboardData.assetByType.length > 0) {
    if (y > PAGE_HEIGHT - 60) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset by Type', MARGIN, y);
    y += 5;

    const typeBody = dashboardData.assetByType.map((item) => [
      item.typeName,
      String(item.total),
      String(item.inUse ?? '—'),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Type', 'Total', 'In Use']],
      body: typeBody,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: headerFill, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: CONTENT_WIDTH * 0.5 }, 1: { cellWidth: CONTENT_WIDTH * 0.25, halign: 'center' }, 2: { cellWidth: CONTENT_WIDTH * 0.25, halign: 'center' } },
      didParseCell: (data) => {
        if (data.row.index % 2 === 1 && data.section === 'body') {
          data.cell.styles.fillColor = [248, 248, 248];
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- Section 3: Status Distribution ---
  if (dashboardData.statusDistribution && dashboardData.statusDistribution.length > 0) {
    if (y > PAGE_HEIGHT - 60) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Status Distribution', MARGIN, y);
    y += 5;

    const statusBody = dashboardData.statusDistribution.map((item) => [
      item.name,
      String(item.value),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Status', 'Count']],
      body: statusBody,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: headerFill, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: CONTENT_WIDTH * 0.6 }, 1: { cellWidth: CONTENT_WIDTH * 0.4, halign: 'center' } },
      didParseCell: (data) => {
        if (data.row.index % 2 === 1 && data.section === 'body') {
          data.cell.styles.fillColor = [248, 248, 248];
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- Section 4: Assignments & Returns ---
  const movementData = getMovementData(dashboardData, movementPeriod);
  const periodLabel = movementPeriod === 'weekly' ? 'Weekly' : 'Monthly';
  const assignReturnRows = movementData.map((d) => ({
    label: d.label || d.period,
    assigned: d.assigned,
    returned: d.returned,
    netChange: d.netChange ?? d.assigned - d.returned,
  }));

  if (assignReturnRows.length > 0) {
    if (y > PAGE_HEIGHT - 60) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Assignments & Returns (${periodLabel})`, MARGIN, y);
    y += 5;

    const arBody = assignReturnRows.map((r) => [
      r.label,
      String(r.assigned),
      String(r.returned),
      String(r.netChange),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Period', 'Assigned', 'Returned', 'Net Change']],
      body: arBody,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: headerFill, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: CONTENT_WIDTH * 0.4 }, 1: { cellWidth: CONTENT_WIDTH * 0.2, halign: 'center' }, 2: { cellWidth: CONTENT_WIDTH * 0.2, halign: 'center' }, 3: { cellWidth: CONTENT_WIDTH * 0.2, halign: 'center' } },
      didParseCell: (data) => {
        if (data.row.index % 2 === 1 && data.section === 'body') {
          data.cell.styles.fillColor = [248, 248, 248];
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- Section 5: Requests Over Time ---
  const requestsRows = movementData.map((d) => ({
    label: d.label || d.period,
    borrowRequests: d.borrowRequests ?? 0,
    transfer: d.transfer ?? 0,
    repair: d.repair ?? 0,
  }));

  if (requestsRows.length > 0) {
    if (y > PAGE_HEIGHT - 60) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Requests Over Time (${periodLabel})`, MARGIN, y);
    y += 5;

    const reqBody = requestsRows.map((r) => [
      r.label,
      String(r.borrowRequests),
      String(r.transfer),
      String(r.repair),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Period', 'Borrow', 'Transfer', 'Repair']],
      body: reqBody,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: headerFill, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: CONTENT_WIDTH * 0.4 }, 1: { cellWidth: CONTENT_WIDTH * 0.2, halign: 'center' }, 2: { cellWidth: CONTENT_WIDTH * 0.2, halign: 'center' }, 3: { cellWidth: CONTENT_WIDTH * 0.2, halign: 'center' } },
      didParseCell: (data) => {
        if (data.row.index % 2 === 1 && data.section === 'body') {
          data.cell.styles.fillColor = [248, 248, 248];
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- Section 6: Recent Activity ---
  if (auditLogs && auditLogs.length > 0) {
    if (y > PAGE_HEIGHT - 60) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Activity', MARGIN, y);
    y += 5;

    const activityBody = auditLogs.slice(0, 20).map((log) => [
      formatTimestamp(log.timestamp),
      log.user?.name || log.user?.email || '—',
      log.action,
      log.resource || '—',
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Timestamp', 'User', 'Action', 'Resource']],
      body: activityBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: headerFill, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: CONTENT_WIDTH * 0.28 },
        1: { cellWidth: CONTENT_WIDTH * 0.25 },
        2: { cellWidth: CONTENT_WIDTH * 0.22 },
        3: { cellWidth: CONTENT_WIDTH * 0.25 },
      },
      didParseCell: (data) => {
        if (data.row.index % 2 === 1 && data.section === 'body') {
          data.cell.styles.fillColor = [248, 248, 248];
        }
      },
    });
  }

  // --- Footer accent on page 1 (accountability form pattern) ---
  doc.setPage(1);
  if (isBc) {
    doc.setDrawColor(220, 38, 38);
    doc.setFillColor(220, 38, 38);
    doc.setLineWidth(0.1);
    doc.rect(MARGIN, FOOTER_BAR_Y, CONTENT_WIDTH, 1, 'FD');
  } else {
    doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
    doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
    doc.setLineWidth(0.1);
    doc.rect(MARGIN, FOOTER_BAR_Y, CONTENT_WIDTH, 1, 'FD');
  }
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(6);
  doc.line(MARGIN, FOOTER_LINE_Y, PAGE_WIDTH - MARGIN, FOOTER_LINE_Y);

  return new Blob([doc.output('blob')], { type: 'application/pdf' });
}
