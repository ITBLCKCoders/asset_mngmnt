'use client';

import { memo } from 'react';
import QRCode from 'react-qr-code';
import { Barcode } from './Barcode';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';

interface TagPreviewCardProps {
  asset: {
    id: string;
    name: string;
    company_logo?: string;
    company_name?: string;
    tagCode?: string;
  };
  qrData: string;
  tagType: 'qr' | 'barcode' | 'both';
  barcodeFormat?: string;
  barcodeWidth?: number;
  showCompanyLogo?: boolean;
  showCompanyName?: boolean;
  showAssetName?: boolean;
  showAssetCode?: boolean;
}

function LogoSection({ asset, showLogo, showName }: { asset: { company_logo?: string; company_name?: string }; showLogo: boolean; showName: boolean }) {
  if ((!showLogo || !asset.company_logo) && (!showName || !asset.company_name)) return null;
  return (
    <div className="flex flex-col items-center space-y-0.5">
      {showLogo && asset.company_logo && (
        <div className="p-1 bg-white rounded shadow-sm">
          <img
            src={proxyCloudinaryUrl(asset.company_logo)}
            alt={`${asset.company_name || ''} logo`}
            className="h-10 w-auto max-w-20 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      {showName && asset.company_name && (
        <div className="text-[10px] font-bold text-black text-center uppercase tracking-wide leading-tight">
          {asset.company_name}
        </div>
      )}
    </div>
  );
}

function CompanySection({ asset, showLogo, showName }: { asset: { company_logo?: string; company_name?: string }; showLogo: boolean; showName: boolean }) {
  if ((!showLogo || !asset.company_logo) && (!showName || !asset.company_name)) return null;
  return (
    <div className="flex flex-col items-center flex-shrink-0 space-y-1">
      {showLogo && asset.company_logo && (
        <div className="p-1 bg-white rounded shadow-sm">
          <img
            src={proxyCloudinaryUrl(asset.company_logo)}
            alt={`${asset.company_name || ''} logo`}
            className="h-10 w-auto max-w-20 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      {showName && asset.company_name && (
        <div className="text-[10px] font-bold text-black text-center max-w-20 uppercase tracking-wide leading-tight">
          {asset.company_name}
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
              {(showCompanyLogo || showCompanyName) && (asset.company_logo || asset.company_name) && (
                <CompanySection asset={asset} showLogo={showCompanyLogo} showName={showCompanyName} />
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
            <LogoSection asset={asset} showLogo={showCompanyLogo} showName={showCompanyName} />
            <div className="flex justify-center w-full">
              <Barcode value={asset.tagCode || asset.id} width={barcodeWidth} format={barcodeFormat} />
            </div>
            <AssetInfo name={asset.name} id={asset.id} showName={showAssetName} showCode={showAssetCode} />
          </>
        )}

        {tagType === 'both' && (
          <>
            <div className="flex items-center justify-center gap-3">
              {(showCompanyLogo || showCompanyName) && (asset.company_logo || asset.company_name) && (
                <CompanySection asset={asset} showLogo={showCompanyLogo} showName={showCompanyName} />
              )}
              <div className="p-1.5 bg-white rounded-lg shadow-sm flex items-center justify-center">
                <QRCode value={qrData} size={60} className="flex-shrink-0" />
              </div>
            </div>
            <div className="flex justify-center w-full">
              <Barcode value={asset.tagCode || asset.id} width={barcodeWidth} format={barcodeFormat} />
            </div>
            <AssetInfo name={asset.name} id={asset.id} showName={showAssetName} showCode={showAssetCode} />
          </>
        )}
      </div>
    </div>
  );
});

export { TagPreviewCard };
