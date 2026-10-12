// Indian GST & POS Tax Engine for Urban Mart Supermarket
import { BillItem, GSTRate, Product } from "../types";

export interface TaxBreakupItem {
  gst_rate: GSTRate;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total_tax: number;
}

export interface CalculationResult {
  items: BillItem[];
  total_items: number;
  total_qty: number;
  subtotal_mrp: number;
  item_discount_total: number;
  bill_discount_amount: number;
  taxable_subtotal: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  cess_total: number;
  total_tax: number;
  round_off: number;
  grand_total: number;
  tax_breakup: TaxBreakupItem[];
}

/**
 * Rounds a number to 2 decimal places with banker's / standard arithmetic round
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates line tax and net amounts for an inclusive price item
 */
export function calculateItemTax(
  sellingPrice: number,
  mrp: number,
  qty: number,
  gstRate: GSTRate,
  itemDiscount: number = 0,
  isInterstate: boolean = false
): {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  lineTotal: number;
} {
  const lineGross = Math.max(0, sellingPrice * qty - itemDiscount);

  if (gstRate === 0) {
    return {
      taxableValue: round2(lineGross),
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
      totalTax: 0,
      lineTotal: round2(lineGross),
    };
  }

  // Inclusive GST Formula: Taxable = Gross / (1 + Rate / 100)
  const taxableValue = round2(lineGross / (1 + gstRate / 100));
  const totalTax = round2(lineGross - taxableValue);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterstate) {
    igst = totalTax;
  } else {
    // Split equally into CGST and SGST
    cgst = round2(totalTax / 2);
    sgst = round2(totalTax - cgst); // Ensure exact match without rounding drift
  }

  return {
    taxableValue,
    cgst,
    sgst,
    igst,
    cess: 0,
    totalTax,
    lineTotal: round2(lineGross),
  };
}

/**
 * Builds a BillItem from a Product and desired quantity/discounts
 */
export function createBillItem(
  product: Product,
  qty: number = 1,
  unitDiscount: number = 0,
  isInterstate: boolean = false
): BillItem {
  const mrp = Number(product.mrp);
  const sellingPrice = Number(product.selling_price);
  const itemDiscount = round2(unitDiscount * qty);

  const tax = calculateItemTax(
    sellingPrice,
    mrp,
    qty,
    product.gst_rate,
    itemDiscount,
    isInterstate
  );

  return {
    product_id: product.id,
    barcode: product.barcode,
    name: product.name,
    unit: product.unit,
    mrp,
    selling_price: sellingPrice,
    qty,
    gst_rate: product.gst_rate,
    discount_amount: itemDiscount,
    taxable_value: tax.taxableValue,
    cgst: tax.cgst,
    sgst: tax.sgst,
    igst: tax.igst,
    cess: 0,
    total: tax.lineTotal,
  };
}

/**
 * Computes entire cart totals including discounts, taxes, and nearest rupee round-off
 */
export function calculateCartTotals(
  items: BillItem[],
  billDiscountPercent: number = 0,
  billDiscountFixed: number = 0,
  isInterstate: boolean = false
): CalculationResult {
  let totalQty = 0;
  let subtotalMrp = 0;
  let itemDiscountTotal = 0;
  let taxableSubtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let totalTax = 0;
  let runningGross = 0;

  const breakupMap = new Map<GSTRate, TaxBreakupItem>();
  const allRates: GSTRate[] = [0, 5, 12, 18, 28];
  for (const r of allRates) {
    breakupMap.set(r, {
      gst_rate: r,
      taxable_value: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
      total_tax: 0,
    });
  }

  for (const item of items) {
    totalQty = round2(totalQty + item.qty);
    subtotalMrp = round2(subtotalMrp + item.mrp * item.qty);
    itemDiscountTotal = round2(itemDiscountTotal + item.discount_amount);
    runningGross = round2(runningGross + item.total);

    taxableSubtotal = round2(taxableSubtotal + item.taxable_value);
    cgstTotal = round2(cgstTotal + item.cgst);
    sgstTotal = round2(sgstTotal + item.sgst);
    igstTotal = round2(igstTotal + item.igst);
    totalTax = round2(totalTax + (item.cgst + item.sgst + item.igst));

    const bk = breakupMap.get(item.gst_rate)!;
    bk.taxable_value = round2(bk.taxable_value + item.taxable_value);
    bk.cgst = round2(bk.cgst + item.cgst);
    bk.sgst = round2(bk.sgst + item.sgst);
    bk.igst = round2(bk.igst + item.igst);
    bk.total_tax = round2(bk.total_tax + (item.cgst + item.sgst + item.igst));
  }

  // Calculate bill-level discount
  let billDiscountAmount = 0;
  if (billDiscountPercent > 0) {
    billDiscountAmount = round2((runningGross * billDiscountPercent) / 100);
  } else if (billDiscountFixed > 0) {
    billDiscountAmount = round2(Math.min(runningGross, billDiscountFixed));
  }

  // If invoice-level discount is given, adjust taxable and GST proportionally
  if (billDiscountAmount > 0 && runningGross > 0) {
    const factor = (runningGross - billDiscountAmount) / runningGross;
    taxableSubtotal = round2(taxableSubtotal * factor);
    cgstTotal = round2(cgstTotal * factor);
    sgstTotal = round2(sgstTotal * factor);
    igstTotal = round2(igstTotal * factor);
    totalTax = round2(cgstTotal + sgstTotal + igstTotal);

    for (const bk of breakupMap.values()) {
      bk.taxable_value = round2(bk.taxable_value * factor);
      bk.cgst = round2(bk.cgst * factor);
      bk.sgst = round2(bk.sgst * factor);
      bk.igst = round2(bk.igst * factor);
      bk.total_tax = round2(bk.cgst + bk.sgst + bk.igst);
    }
  }

  const netPayablePreRound = Math.max(0, round2(runningGross - billDiscountAmount));

  // Nearest rupee round-off
  const grandTotal = Math.round(netPayablePreRound);
  const roundOff = round2(grandTotal - netPayablePreRound);

  // Filter tax breakup to only rates where tax is charged
  const taxBreakup = Array.from(breakupMap.values()).filter(
    (b) => b.total_tax > 0
  );

  return {
    items,
    total_items: items.length,
    total_qty: totalQty,
    subtotal_mrp: subtotalMrp,
    item_discount_total: itemDiscountTotal,
    bill_discount_amount: billDiscountAmount,
    taxable_subtotal: taxableSubtotal,
    cgst_total: cgstTotal,
    sgst_total: sgstTotal,
    igst_total: igstTotal,
    cess_total: 0,
    total_tax: totalTax,
    round_off: roundOff,
    grand_total: grandTotal,
    tax_breakup: taxBreakup,
  };
}
