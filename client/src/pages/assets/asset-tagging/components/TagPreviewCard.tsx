'use client';

import { Company } from '@/pages/settings/settingsComponents/settingsTabs/generalTab/components/utils/companyTypes';
import QRCode from 'react-qr-code';
import { Barcode } from './Barcode';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';

interface TagPreviewCardProps {
  asset: {
    id: string;
    name: string;
  };
  activeCompany: Company | null;
  qrData: string;
  tagType: 'qr' | 'barcode';
  barcodeFormat?: string;
}

export function TagPreviewCard({
  asset,
  activeCompany,
  qrData,
  tagType,
  barcodeFormat = 'CODE128',
}: TagPreviewCardProps) {
  return (
    <div
      key={asset.id}
      className="relative border-2 border-red-500/20 bg-white rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 print:border print:p-3 print:shadow-none"
    >
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full -translate-y-10 translate-x-10 print:hidden"></div>

      <div className="relative space-y-4">
        {tagType === 'qr' ? (
          <>
            <div className="flex items-center justify-center gap-6">
              {activeCompany && (
                <div className="flex flex-col items-center flex-shrink-0 space-y-3">
                  {activeCompany.logo_url && (
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-red-100">
                      <img
                        src={proxyCloudinaryUrl(activeCompany.logo_url)}
                        alt={`${activeCompany.name} logo`}
                        className="h-24 w-auto max-w-48 object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div className="text-sm font-bold text-black text-center max-w-48 uppercase tracking-wide">
                    {activeCompany.name}
                  </div>
                </div>
              )}
              <div className="p-3 bg-white rounded-xl shadow-md border-2 border-red-100 flex items-center justify-center">
                <QRCode value={qrData} size={120} className="flex-shrink-0" />
              </div>
            </div>
            <div className="text-center space-y-1 pt-2 border-t border-red-100">
              <h3 className="font-bold text-base text-gray-900 leading-tight">
                {asset.name}
              </h3>
              <div className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full uppercase tracking-wider">
                {asset.id}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center space-y-3">
              {activeCompany && (
                <div className="flex flex-col items-center space-y-1">
                  {activeCompany.logo_url && (
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-red-100">
                      <img
                        src={proxyCloudinaryUrl(activeCompany.logo_url)}
                        alt={`${activeCompany.name} logo`}
                        className="h-24 w-auto max-w-48 object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div className="text-sm font-bold text-black text-center uppercase tracking-wide">
                    {activeCompany.name}
                  </div>
                </div>
              )}
              <Barcode value={asset.id} width={360} format={barcodeFormat} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-gray-900 leading-tight">
                {asset.name}
              </h3>
              <div className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full uppercase tracking-wider">
                {asset.id}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
