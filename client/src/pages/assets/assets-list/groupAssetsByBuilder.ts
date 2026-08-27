import type { Asset } from './assetsComponents/assetTable/assetData';



type BuilderItem = {

  asset_code: string;

  asset_name?: string;

  category_name?: string;

  type_name?: string;

  is_parent?: boolean;

};



type BuilderRecord = {

  status?: string;

  items?: BuilderItem[];

};



function childFromBuilderItem(item: BuilderItem, builderStatus?: string): Asset {

  return {

    id: item.asset_code,

    name: item.asset_name ?? item.asset_code,

    image: '',

    description: '',

    category: item.category_name ?? '',

    type: item.type_name ?? '',

    serialNo: '',

    modelNo: '',

    brand: '',

    status: builderStatus ?? 'Partial',

    assignedTo: '',

    department: '',

    location: '',

    purchaseDate: null,

    purchasePrice: 0,

    supplier: '',

    warranty: null,

    warranty_months: null,

    documents: [],

    maintenanceSchedule: 'None',

    lastMaintenanceDate: null,

    nextMaintenanceDate: null,

    condition: 'Good',

    usefulLifeYears: 0,

    salvageValue: 0,

    depreciationMethod: '',

    annualDepreciation: 0,

    depreciationStartDate: null,

    company: '',

    building: '',

    createdAt: new Date(0),

    createdBy: '',

    updatedAt: new Date(0),

    updatedBy: '',

  };

}



/** Nest builder child assets under their parent row for expandable table display. */

export function groupAssetsByBuilder(

  assets: Asset[],

  builders: BuilderRecord[]

): Asset[] {

  if (!builders.length || !assets.length) return assets;



  const assetByCode = new Map(assets.map(a => [a.id, a]));

  const childCodes = new Set<string>();

  const parentEnhancements = new Map<

    string,

    { children: Asset[]; builderStatus?: string }

  >();



  for (const builder of builders) {

    if (!builder.items?.length) continue;



    const parentItem =

      builder.items.find(i => i.is_parent) ?? builder.items[0];

    const childItems = builder.items.filter(

      i => i.asset_code !== parentItem.asset_code

    );



    childItems.forEach(c => childCodes.add(c.asset_code));



    const parentAsset = assetByCode.get(parentItem.asset_code);

    if (!parentAsset) continue;



    const existingChildrenByCode = new Map(

      (parentAsset.children ?? []).map(child => [child.id, child])

    );



    const resolvedChildren = childItems.map(

      item =>

        assetByCode.get(item.asset_code) ??

        existingChildrenByCode.get(item.asset_code) ??

        childFromBuilderItem(item, builder.status)

    );



    if (resolvedChildren.length > 0) {

      parentEnhancements.set(parentItem.asset_code, {

        children: resolvedChildren,

        builderStatus: builder.status,

      });

    }

  }



  if (childCodes.size === 0 && parentEnhancements.size === 0) {

    return assets;

  }



  return assets

    .filter(a => !childCodes.has(a.id))

    .map(asset => {

      const enhancement = parentEnhancements.get(asset.id);

      if (enhancement) {

        return {

          ...asset,

          isAssetBuilder: true,

          builderStatus: enhancement.builderStatus ?? asset.builderStatus,

          children: enhancement.children,

        };

      }

      return asset;

    });

}


