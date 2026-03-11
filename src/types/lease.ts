export type LeaseRow = {
  unitType: string;
  description: string;
  unitArea: number;
  leaseStartDate: string;
  leaseEndDate: string;
  leaseTerm: number;
  rent: number;
  psf: number;
  freeMonths: number;
  netRent: number;
  leasingAssociate: string;
  affordable: boolean;
};
export type LeaseData = Record<string, LeaseRow>;
