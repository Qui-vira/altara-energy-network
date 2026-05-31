export type QuoteTotalsInput = {
  equipmentCost: number;
  installationLabor: number;
  transport: number;
  siteInspectionFee: number;
  altaraManagementFee: number;
  profitMargin: number;
  optionalMaintenanceFee: number;
  discount: number;
  vatTax: number;
  depositPercent?: number;
};

export function calculateQuoteTotals(input: QuoteTotalsInput) {
  const subtotal =
    input.equipmentCost +
    input.installationLabor +
    input.transport +
    input.siteInspectionFee +
    input.altaraManagementFee +
    input.profitMargin +
    input.optionalMaintenanceFee -
    input.discount;
  const totalPrice = Math.max(0, subtotal + input.vatTax);
  const depositAmount = Math.round(totalPrice * ((input.depositPercent ?? 70) / 100));
  const balanceAmount = totalPrice - depositAmount;
  return { subtotal, totalPrice, depositAmount, balanceAmount };
}
