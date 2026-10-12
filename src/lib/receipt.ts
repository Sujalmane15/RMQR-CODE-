// Thermal Receipt & Invoice Print Engine (80mm / 58mm / A4)
import { Bill, StoreConfig } from "../types";

export interface ReceiptTextOptions {
  width: "80mm" | "58mm";
}

/**
 * Pads and centers text within a specified column width
 */
function center(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  const left = Math.floor((width - text.length) / 2);
  return " ".repeat(left) + text;
}

/**
 * Formats a two-column line: left text, right text with spaces between
 */
function line2(left: string, right: string, width: number): string {
  const spaceNeeded = width - left.length - right.length;
  if (spaceNeeded <= 0) {
    return left.substring(0, width - right.length - 1) + " " + right;
  }
  return left + " ".repeat(spaceNeeded) + right;
}

/**
 * Repeats a character across the line width
 */
function divider(char: string, width: number): string {
  return char.repeat(width);
}

/**
 * Generates raw thermal printer plaintext string
 */
export function generateThermalReceiptText(
  bill: Bill,
  store: StoreConfig,
  format: "80mm" | "58mm" = "80mm"
): string {
  const width = format === "58mm" ? 32 : 44;
  const lines: string[] = [];

  // Header
  lines.push(center(store.store_name.toUpperCase(), width));
  if (store.branch_name) {
    lines.push(center(store.branch_name, width));
  }
  lines.push(center(store.address_line1, width));
  lines.push(center(`${store.city} - ${store.pincode}`, width));
  lines.push(center(`GSTIN: ${store.gstin}`, width));
  lines.push(center(`FSSAI: ${store.fssai_lic_no}`, width));
  lines.push(center(`Phone: ${store.phone}`, width));
  lines.push(divider("=", width));

  // Bill Info
  lines.push(line2(`Bill No: ${bill.invoice_number}`, bill.date.substring(0, 10), width));
  lines.push(line2(`Cashier: ${bill.cashier_name}`, bill.counter_id, width));
  if (bill.customer_name || bill.customer_phone) {
    const cust = bill.customer_phone || bill.customer_name || "";
    lines.push(line2("Customer:", cust, width));
  }
  lines.push(divider("-", width));

  // Column Headers
  if (format === "58mm") {
    lines.push("Item          Qty   Rate     Net");
  } else {
    lines.push("Item Description    Qty   MRP   Rate     Net");
  }
  lines.push(divider("-", width));

  // Items
  for (const item of bill.items) {
    if (format === "58mm") {
      if (item.name.length > width) {
        lines.push(item.name.substring(0, width));
        if (item.name.length > width) {
          lines.push(item.name.substring(width, width * 2));
        }
      } else {
        lines.push(item.name);
      }
      const details = `${item.qty} ${item.unit} x ${item.selling_price}`;
      const totalStr = `₹${item.total.toFixed(2)}`;
      lines.push(line2(`  ${details}`, totalStr, width));
    } else {
      const name =
        item.name.length > 18
          ? item.name.substring(0, 17) + "."
          : item.name.padEnd(18);
      const qty = `${item.qty}`.padStart(4);
      const mrp = `${item.mrp}`.padStart(5);
      const rate = `${item.selling_price}`.padStart(6);
      const net = `${item.total.toFixed(2)}`.padStart(7);
      lines.push(`${name} ${qty} ${mrp} ${rate} ${net}`);
    }
  }

  lines.push(divider("-", width));

  // Summary
  lines.push(line2(`Total Items / Qty:`, `${bill.total_items} / ${bill.total_qty}`, width));
  lines.push(line2(`Subtotal (MRP):`, `₹${bill.subtotal_mrp.toFixed(2)}`, width));
  if (bill.item_discount_total + bill.bill_discount_amount > 0) {
    const totalSaving = bill.item_discount_total + bill.bill_discount_amount;
    lines.push(line2(`Total Savings:`, `-₹${totalSaving.toFixed(2)}`, width));
  }
  lines.push(line2(`Taxable Value:`, `₹${bill.taxable_subtotal.toFixed(2)}`, width));
  lines.push(line2(`CGST:`, `₹${bill.cgst_total.toFixed(2)}`, width));
  lines.push(line2(`SGST:`, `₹${bill.sgst_total.toFixed(2)}`, width));
  if (bill.round_off !== 0) {
    lines.push(line2(`Round Off:`, `${bill.round_off > 0 ? "+" : ""}₹${bill.round_off.toFixed(2)}`, width));
  }
  lines.push(divider("=", width));
  lines.push(line2(`GRAND TOTAL:`, `₹${bill.grand_total.toFixed(2)}`, width));
  lines.push(divider("=", width));

  // Payment
  lines.push(line2(`Payment Mode:`, bill.payment_mode, width));
  if (bill.payment_mode === "CASH" || bill.payment_mode === "SPLIT") {
    if (bill.tender_amount > 0) {
      lines.push(line2(`Cash Tendered:`, `₹${bill.tender_amount.toFixed(2)}`, width));
      lines.push(line2(`Change Returned:`, `₹${bill.change_returned.toFixed(2)}`, width));
    }
  }
  if (bill.loyalty_points_earned > 0) {
    lines.push(line2(`Points Earned:`, `+${bill.loyalty_points_earned}`, width));
  }

  // Footer
  lines.push(divider("-", width));
  const savings = (bill.subtotal_mrp - bill.grand_total);
  if (savings > 0) {
    lines.push(center(`*** YOU SAVED ₹${savings.toFixed(2)} TODAY! ***`, width));
  }
  lines.push(center(store.receipt_footer_msg || "THANK YOU! VISIT AGAIN", width));
  lines.push(center("GST Invoice - Tax Paid Under Normal Scheme", width));
  lines.push(divider("=", width));
  lines.push("\n\n\n"); // Feed for paper cutter

  return lines.join("\n");
}
