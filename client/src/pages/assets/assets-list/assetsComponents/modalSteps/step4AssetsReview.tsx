// src/pages/assets/assetsComponents/modalSteps/step4AssetsReview.tsx

import {
  CheckCircle2,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  ImageIcon,
  Building2,
  Users,
  Home,
  Building,
  StickyNote,
  File,
} from 'lucide-react';
import { AssetFormData } from '../assetTypes/assetFormTypes';
import { AssetDocument, type AssetAssignment } from '../assetTable/assetData';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';

// Utility function to extract filename from Cloudinary URL or return the filename
const getDisplayFileName = (fileName: string): string => {
  // If it's a Cloudinary URL, extract the filename from the end
  if (fileName.includes('cloudinary.com') || fileName.includes('/')) {
    const parts = fileName.split('/');
    const lastPart = parts[parts.length - 1];
    // Remove query parameters if any
    const cleanName = lastPart.split('?')[0];
    // If it looks like a hash, try to get a better name from the URL
    if (cleanName.length > 50 && !cleanName.includes('.')) {
      // For Cloudinary URLs, the public_id might be the filename
      // Try to find a more readable name
      return cleanName;
    }
    return cleanName;
  }
  return fileName;
};
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Step4ReviewProps {
  formData: AssetFormData;
  showReviewHeader?: boolean;
  assetDocuments?: AssetDocument[];
  users?: any[];
  currentAssignment?: AssetAssignment;
  showFinancialInfo?: boolean;
}

export function Step4Review({
  formData,
  showReviewHeader = true,
  assetDocuments,
  users = [],
  currentAssignment,
  showFinancialInfo = true,
}: Step4ReviewProps) {
  const formatDate = (iso?: string) =>
    iso ? format(new Date(iso), 'PPP') : '—';
  const hasImage = !!formData.imageUrl;
  const hasDocuments = assetDocuments && assetDocuments.length > 0;

  return (
    <div className="space-y-6 sm:space-y-10 lg:space-y-12 max-w-7xl mx-auto w-full min-w-0 px-0 sm:px-4 md:px-6 lg:px-8">
      {showReviewHeader && (
        <div className="text-center px-1">
          <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-green-600 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            Review Your Asset
          </h3>
          <p className="text-gray-600 mt-2 sm:mt-3 text-sm sm:text-base md:text-lg px-2">
            Double-check all details before final submission
          </p>
        </div>
      )}

      {hasImage && (
        <div className="flex justify-center -mt-2 sm:-mt-6">
          <div className="relative max-w-lg w-full min-w-0 group">
            <img
              src={formData.imageUrl}
              alt="Asset preview"
              className="rounded-2xl sm:rounded-3xl object-cover w-full h-48 sm:h-72 md:h-96 max-h-[50vh] sm:max-h-none shadow-xl sm:shadow-2xl border-4 sm:border-8 border-white transition-transform group-hover:scale-[1.02]"
              onError={e => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <div className="absolute top-3 left-3 sm:top-5 sm:left-5 bg-black/75 backdrop-blur-sm text-white px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg">
              <ImageIcon className="h-5 w-5" />
              Asset Photo
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8 xl:gap-12 min-w-0">
        <div className="space-y-5 sm:space-y-8 min-w-0">
          <Section title="Basic Information">
            <InfoRow label="Asset Name" value={formData.name || '—'} bold />
            <InfoRow
              label="Asset ID"
              value={formData.assetId || 'Auto-generated on save'}
            />
            <InfoRow
              label="Description"
              value={formData.description || 'No description provided'}
              multiline
            />
            <InfoRow label="Category" value={formData.category || '—'} />
            <InfoRow label="Type" value={formData.type || '—'} />
            <InfoRow label="Brand" value={formData.brand || '—'} />
            <InfoRow label="Model" value={formData.model || '—'} />
            <InfoRow label="Serial Number" value={formData.serial || '—'} />
            <InfoRow label="Supplier" value={formData.supplier || '—'} />
          </Section>

          <Section title="Current Status">
            <InfoRow
              label="Condition"
              value={formData.condition || '—'}
              highlight={
                ['New', 'Excellent', 'Good'].includes(formData.condition || '')
                  ? 'text-green-600 font-bold'
                  : 'text-orange-600 font-bold'
              }
            />
            <InfoRow
              label="Status"
              value={formData.status || 'In Use'}
              highlight="text-blue-600 font-bold"
            />
          </Section>

          <Section title="Maintenance">
            <InfoRow
              label="Maintenance Schedule"
              value={formData.maintenanceSchedule || 'Not configured'}
            />
          </Section>
        </div>

        <div className="space-y-5 sm:space-y-8 min-w-0">
          {showFinancialInfo && (
            <Section
              title="Financial Information"
              icon={<DollarSign className="h-6 w-6 text-green-600" />}
            >
              <InfoRow
                label="Original Value"
                value={
                  formData.assetValue
                    ? formatCurrency(formData.assetValue)
                    : '—'
                }
                bold
              />
              <InfoRow
                label="Salvage Value"
                value={
                  formData.salvageValue
                    ? formatCurrency(formData.salvageValue)
                    : '—'
                }
              />
              <InfoRow
                label="Useful Life"
                value={
                  formData.usefulLifeYears
                    ? `${formData.usefulLifeYears} years`
                    : '—'
                }
              />
              <InfoRow
                label="Annual Depreciation"
                value={
                  formData.annualDepreciation
                    ? formatCurrency(formData.annualDepreciation)
                    : '—'
                }
              />
              <InfoRow
                label="Depreciation Method"
                value={
                  formData.depreciationMethod
                    ? formData.depreciationMethod === 'straight-line'
                      ? 'Straight-Line'
                      : formData.depreciationMethod
                          .split('-')
                          .map(
                            word => word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(' ')
                    : '—'
                }
              />
            </Section>
          )}

          <Section
            title="Dates & Warranty"
            icon={<Calendar className="h-6 w-6 text-purple-600" />}
          >
            <InfoRow
              label="Purchase Date"
              value={formatDate(formData.purchaseDate)}
            />
            <InfoRow
              label="Depreciation Start Date"
              value={formatDate(formData.depreciationStartDate)}
            />
            <InfoRow
              label="Warranty Period"
              value={
                formData.warrantyMonths
                  ? `${formData.warrantyMonths} months`
                  : 'No warranty'
              }
              highlight={
                formData.warrantyMonths ? 'text-emerald-600 font-medium' : ''
              }
            />
          </Section>

          <Section
            title="Location & Assignment"
            icon={<MapPin className="h-6 w-6 text-indigo-600" />}
          >
            <InfoRow
              label="Company / Business Unit"
              value={formData.company || '—'}
              icon={<Building className="h-5 w-5 text-indigo-600" />}
            />
            <InfoRow
              label="Site"
              value={formData.locationSiteName || '—'}
              icon={<Home className="h-5 w-5 text-indigo-600" />}
            />
            <InfoRow
              label="Building"
              value={formData.locationBuilding || '—'}
              icon={<Building2 className="h-5 w-5 text-indigo-600" />}
            />
            <InfoRow
              label="Department"
              value={formData.department || '—'}
              icon={<Users className="h-5 w-5 text-indigo-600" />}
            />
            <InfoRow
              label="Room / Area"
              value={formData.locationRoom || '—'}
              icon={<MapPin className="h-5 w-5 text-indigo-600" />}
            />
            {!currentAssignment && (
              <InfoRow
                label="Assigned User"
                value={
                  formData.assignedUser
                    ? (() => {
                        const user = users.find(
                          u => u.userID === formData.assignedUser
                        );
                        return user
                          ? `${user.first_name} ${user.last_name}${user.employee_number ? ` (${user.employee_number})` : ''}`
                          : `User ID: ${formData.assignedUser}`;
                      })()
                    : 'Not assigned'
                }
                icon={<Users className="h-5 w-5 text-blue-600" />}
              />
            )}
            {formData.locationNotes && (
              <InfoRow
                label="Location Notes"
                value={formData.locationNotes}
                icon={<StickyNote className="h-5 w-5 text-gray-600" />}
                multiline
              />
            )}
            {currentAssignment ? (
              <>
                <InfoRow
                  label="Assigned To"
                  value={`${currentAssignment.user.name} (${currentAssignment.user.employeeNumber || currentAssignment.user.id})`}
                  icon={<Users className="h-5 w-5 text-blue-600" />}
                />
                <InfoRow
                  label="Position"
                  value={currentAssignment.user.position || 'Not specified'}
                />
                <InfoRow
                  label="Assignment Status"
                  value={currentAssignment.status}
                  highlight="text-green-600 font-bold"
                />
              </>
            ) : (
              <InfoRow
                label="Assignment Status"
                value="Not assigned"
                highlight="text-gray-500"
              />
            )}
          </Section>
        </div>
      </div>

      {hasDocuments && (
        <Section
          title={`Supporting Documents (${assetDocuments!.length})`}
          icon={<FileText className="h-6 w-6 text-blue-600" />}
        >
          <div className="space-y-4">
            {assetDocuments!.map((doc, idx: number) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md min-w-0"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    <File className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline break-words"
                      title={`Open ${getDisplayFileName(doc.fileName)}`}
                    >
                      {getDisplayFileName(doc.fileName) || `Document ${idx + 1}`}
                    </a>
                    <p className="text-xs text-gray-500 mt-1 break-words">
                      {(doc.fileSize / 1024 / 1024).toFixed(1)} MB •{' '}
                      {doc.fileType}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 sm:ml-auto">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full sm:w-auto justify-center items-center px-3 py-2 sm:py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors"
                  >
                    Open File
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-4 sm:p-6 md:p-8 shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-300 min-w-0">
      <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 min-w-0">
        {icon ? (
          <span className="shrink-0 [&_svg]:h-5 [&_svg]:w-5 sm:[&_svg]:h-6 sm:[&_svg]:w-6">
            {icon}
          </span>
        ) : null}
        <span className="break-words">{title}</span>
      </h4>
      <div className="space-y-3 sm:space-y-5">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  bold,
  highlight,
  multiline,
  icon,
}: {
  label: string;
  value: string | React.ReactNode;
  bold?: boolean;
  highlight?: string;
  multiline?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`flex gap-3 sm:gap-4 min-w-0 ${multiline ? 'items-start' : 'items-start sm:items-center'}`}
    >
      {icon && <div className="mt-0.5 sm:mt-1 flex-shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <span className="text-xs sm:text-sm font-semibold text-gray-600">
          {label}:
        </span>
        <span
          className={`
            block mt-0.5 sm:mt-1 sm:pl-1 font-medium text-gray-900 break-words
            ${bold ? 'text-base sm:text-lg md:text-xl font-bold text-gray-950' : 'text-sm sm:text-base md:text-lg'}
            ${highlight || ''}
            ${multiline ? 'text-sm sm:text-base leading-relaxed whitespace-pre-wrap' : ''}
          `}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
