'use client';

import { memo } from 'react';
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
  tagType: 'qr' | 'barcode' | 'both';
  barcodeFormat?: string;
  barcodeWidth?: number;
  showCompanyLogo?: boolean;
  showCompanyName?: boolean;
  showAssetName?: boolean;
  showAssetCode?: boolean;
}

function LogoSection({ activeCompany, showLogo, showName }: { activeCompany: Company | null; showLogo: boolean; showName: boolean }) {
  if (!activeCompany || (!showLogo && !showName)) return null;
  return (
    <div className="flex flex-col items-center space-y-0.5">
      {showLogo && activeCompany.logo_url && (
        <div className="p-1 bg-white rounded shadow-sm">
          <img
            src={proxyCloudinaryUrl(activeCompany.logo_url)}
            alt={`${activeCompany.name} logo`}
            className="h-10 w-auto max-w-20 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      {showName && (
        <div className="text-[10px] font-bold text-black text-center uppercase tracking-wide leading-tight">
          {activeCompany.name}
        </div>
      )}
    </div>
  );
}

function AssetInfo({ name, id, showName, showCode }: { name: string; id: string; showName: boolean; showCode: boolean }) {
  if (!showName && !showCode) return null;
  return (
    <div className="flex flex-col items-center space-y-1">
      {showName && (
        <h3 className="font-bold text-xs text-gray-900 leading-tight text-center w-full">
          {name}
        </h3>
      )}
      {showCode && (
        <div className="text-[10px] font-semibold text-red-700 uppercase tracking-wider">
          {id}
        </div>
      )}
    </div>
  );
}

const TagPreviewCard = memo(function TagPreviewCard({
  asset,
  activeCompany,
  qrData,
  tagType,
  barcodeFormat = 'CODE128',
  barcodeWidth = 150,
  showCompanyLogo = true,
  showCompanyName = true,
  showAssetName = true,
  showAssetCode = true,
}: TagPreviewCardProps) {
  return (
    <div
      key={asset.id}
      className="relative border-2 border-red-200 bg-white rounded-lg shadow-sm print:shadow-none p-2 print:p-2"
    >
      <div className="relative space-y-2">
        {tagType === 'qr' && (
          <>
            <div className="flex items-center justify-center gap-3">
              {activeCompany && (showCompanyLogo || showCompanyName) && (
                <div className="flex flex-col items-center flex-shrink-0 space-y-1">
                  {showCompanyLogo && activeCompany.logo_url && (
                    <div className="p-1 bg-white rounded shadow-sm">
                      <img
                        src={proxyCloudinaryUrl(activeCompany.logo_url)}
                        alt={`${activeCompany.name} logo`}
                        className="h-10 w-auto max-w-20 object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  {showCompanyName && (
                    <div className="text-[10px] font-bold text-black text-center max-w-20 uppercase tracking-wide leading-tight">
                      {activeCompany.name}
                    </div>
                  )}
                </div>
              )}
              <div className="p-2 bg-white rounded-lg shadow-sm flex items-center justify-center">
                <QRCode value={qrData} size={70} className="flex-shrink-0" />
              </div>
            </div>
            <AssetInfo name={asset.name} id={asset.id} showName={showAssetName} showCode={showAssetCode} />
          </>
        )}

        {tagType === 'barcode' && (
          <>
            <LogoSection activeCompany={activeCompany} showLogo={showCompanyLogo} showName={showCompanyName} />
            <div className="flex justify-center w-full">
              <Barcode value={asset.id} width={barcodeWidth} format={barcodeFormat} />
            </div>
            <AssetInfo name={asset.name} id={asset.id} showName={showAssetName} showCode={showAssetCode} />
          </>
        )}

        {tagType === 'both' && (
          <>
            <div className="flex items-center justify-center gap-3">
              {activeCompany && (showCompanyLogo || showCompanyName) && (
                <div className="flex flex-col items-center flex-shrink-0 space-y-1">
                  {showCompanyLogo && activeCompany.logo_url && (
                    <div className="p-1 bg-white rounded shadow-sm">
                      <img
                        src={proxyCloudinaryUrl(activeCompany.logo_url)}
                        alt={`${activeCompany.name} logo`}
                        className="h-10 w-auto max-w-20 object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  {showCompanyName && (
                    <div className="text-[10px] font-bold text-black text-center max-w-20 uppercase tracking-wide leading-tight">
                      {activeCompany.name}
                    </div>
                  )}
                </div>
              )}
              <div className="p-1.5 bg-white rounded-lg shadow-sm flex items-center justify-center">
                <QRCode value={qrData} size={60} className="flex-shrink-0" />
              </div>
            </div>
            <div className="flex justify-center w-full">
              <Barcode value={asset.id} width={barcodeWidth} format={barcodeFormat} />
            </div>
            <AssetInfo name={asset.name} id={asset.id} showName={showAssetName} showCode={showAssetCode} />
          </>
        )}
      </div>
    </div>
  );
});

export { TagPreviewCard };
