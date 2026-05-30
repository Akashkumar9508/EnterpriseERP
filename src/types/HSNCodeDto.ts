export interface HSNCodeDto {
  id?: string;
  code: string;
  description?: string;
  taxProfileId?: string;
  taxProfileName?: string;
  /** Computed by API as CGST + SGST + CESS from the linked TaxProfile (read-only). */
  gstPercentage: number;
  createdAt?: string;
}
