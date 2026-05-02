import { Company } from './companyTypes';

export const formatAddress = (c: Company): string => {
  const parts = [
    c.unit_no,
    c.building_street,
    c.barangay_name,
    c.city_name,
    c.province_name && c.province_name !== c.city_name ? c.province_name : null,
    c.region_name,
    c.zipcode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'No address provided';
};
