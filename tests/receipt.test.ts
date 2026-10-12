import { describe, it, expect } from "vitest";
import { generateThermalReceiptText } from "../src/lib/receipt";
import { Bill, StoreConfig } from "../src/types";

describe("ESC/POS Thermal Receipt Engine Tests", () => {
  const mockStore: StoreConfig = {
    store_name: "Urban Mart",
    branch_name: "Ghansoli Superstore",
    tagline: "Freshness & Value",
    address_line1: "Sector 19, Ghansoli",
    address_line2: "Near Railway Station",
    city: "Navi Mumbai",
    pincode: "400701",
    state: "Maharashtra",
    state_code: "27",
    phone: "+91 98201 55667",
    email: "ghansoli@urbanmart.com",
    gstin: "27AABCU1234F1Z5",
    fssai_lic_no: "11521000000123",
    receipt_footer_msg: "Thank you! Visit again.",
    thermal_paper_size: "80mm",
    auto_cut: true,
    currency_symbol: "₹",
    loyalty_points_per_100: 1,
    loyalty_point_value: 1,
    supervisor_discount_limit_percent: 10,
  };

  const mockBill: Bill = {
    id: "bill-001",
    invoice_number: "UM-2026-00001",
    date: "2026-10-12T10:00:00.000Z",
    cashier_id: "usr-pos-01",
    cashier_name: "Ramesh Pawar",
    counter_id: "POS-01",
    customer_phone: "9820123456",
    customer_name: "Rajesh Sharma",
    items: [
      {
        product_id: "p1",
        barcode: "8901030383701",
        name: "Tata Salt Vacuum Evaporated 1kg Pack",
        unit: "PACK",
        mrp: 28,
        selling_price: 26,
        qty: 2,
        gst_rate: 5,
        discount_amount: 0,
        taxable_value: 49.52,
        cgst: 1.24,
        sgst: 1.24,
        igst: 0,
        cess: 0,
        total: 52,
      },
    ],
    total_items: 1,
    total_qty: 2,
    subtotal_mrp: 56,
    item_discount_total: 0,
    bill_discount_percent: 0,
    bill_discount_amount: 0,
    taxable_subtotal: 49.52,
    cgst_total: 1.24,
    sgst_total: 1.24,
    igst_total: 0,
    cess_total: 0,
    total_tax: 2.48,
    round_off: 0,
    grand_total: 52,
    payment_mode: "CASH",
    payments: [{ mode: "CASH", amount: 52 }],
    tender_amount: 100,
    change_returned: 48,
    loyalty_points_earned: 0,
    loyalty_points_redeemed: 0,
    status: "COMPLETED",
    created_at: "2026-10-12T10:00:00.000Z",
  };

  it("formats 80mm receipt within 44-character line boundary", () => {
    const text = generateThermalReceiptText(mockBill, mockStore, "80mm");
    const lines = text.split("\n").filter((l) => l.trim().length > 0);

    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(44);
    }

    expect(text).toContain("URBAN MART");
    expect(text).toContain("UM-2026-00001");
    expect(text).toContain("GSTIN: 27AABCU1234F1Z5");
    expect(text).toContain("GRAND TOTAL:");
    expect(text).toContain("52.00");
  });

  it("formats 58mm compact receipt within 32-character boundary and handles long product names", () => {
    const text = generateThermalReceiptText(mockBill, mockStore, "58mm");
    const lines = text.split("\n").filter((l) => l.trim().length > 0);

    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(32);
    }

    expect(text).toContain("URBAN MART");
    expect(text).toContain("UM-2026-00001");
    // Long name wrapped across lines
    expect(text).toContain("Tata Salt Vacuum");
  });
});
