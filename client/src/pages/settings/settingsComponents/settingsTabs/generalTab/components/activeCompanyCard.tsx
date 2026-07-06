import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

import { Label } from '@/components/ui/label';
import { CheckCircle2, MapPin, Building2 } from 'lucide-react';
import { Company } from './utils/companyTypes';
import { formatAddress } from './utils/companyUtils';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';

interface ActiveCompanyCardProps {
  activeCompany: Company;
}

export function ActiveCompanyCard({ activeCompany }: ActiveCompanyCardProps) {
  const isMain = !!activeCompany.is_main;

  return (
    <Card className="relative overflow-hidden border-2 border-red-500/30 bg-gradient-to-br from-red-50 to-white shadow-lg">
      <div className="absolute top-0 right-0 flex flex-col gap-1">
        <div className="bg-red-600 text-white px-8 py-3 rounded-bl-2xl font-bold text-lg flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6" />
          ACTIVE COMPANY
        </div>
        {isMain && (
          <div className="bg-red-600 text-white px-8 py-3 rounded-bl-2xl font-bold text-lg flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            MAIN COMPANY
          </div>
        )}
      </div>

      <CardHeader className="pb-4">
        <div className="flex items-start gap-6">
          <div className="h-28 w-28 ring-4 ring-red-500/20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {activeCompany.logo_url ? (
              <img
                src={proxyCloudinaryUrl(activeCompany.logo_url)}
                alt={`${activeCompany.name} logo`}
                className="h-full w-full object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="text-4xl font-bold bg-red-100 text-red-700 h-full w-full flex items-center justify-center">
                {activeCompany.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">
              {activeCompany.name}
            </CardTitle>
            <p className="text-muted-foreground mt-2 text-lg">
              Manage the assets and settings for the active company.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 text-base">
        {/* Left Column */}
        <div className="space-y-6">
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="font-semibold">{activeCompany.email}</p>
          </div>

          <div>
            <Label className="text-muted-foreground">Company Code</Label>
            <p className="font-mono text-xl bg-muted px-4 py-2 rounded-lg inline-block">
              {activeCompany.code}
            </p>
          </div>

          {activeCompany.prefix && (
            <div>
              <Label className="text-muted-foreground">Prefix</Label>
              <p className="font-semibold">{activeCompany.prefix}</p>
            </div>
          )}

          {activeCompany.phone && (
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p className="font-medium">{activeCompany.phone}</p>
            </div>
          )}

          {activeCompany.website && (
            <div>
              <Label className="text-muted-foreground">Website</Label>
              <a
                href={
                  activeCompany.website.startsWith('http')
                    ? activeCompany.website
                    : `https://${activeCompany.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium block mt-1"
              >
                {activeCompany.website}
              </a>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div>
            <Label className="text-muted-foreground flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Business Address
            </Label>
            <p className="mt-2 text-foreground leading-relaxed">
              {formatAddress(activeCompany)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4">
            <div>
              <Label className="text-muted-foreground">Tax ID</Label>
              <p className="font-semibold">
                {activeCompany.taxId || 'Not set'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Industry</Label>
              <p className="font-semibold capitalize">
                {(activeCompany.industry || 'Not set').replace(/_/g, ' ')}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Company Size</Label>
              <p className="font-semibold">{activeCompany.size || 'Not set'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
