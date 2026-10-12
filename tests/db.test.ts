import { describe, it, expect, beforeEach } from "vitest";
import { UrbanMartDatabase } from "../src/lib/db/memory-db";
import path from "path";
import fs from "fs";

describe("Database Storage & Master Catalog Tests", () => {
  let db: UrbanMartDatabase;
  const testDbPath = path.resolve(__dirname, "test-master-db.json");

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new UrbanMartDatabase(testDbPath);
  });

  it("seeds realistic B-Mart Ghansoli items on first load", () => {
    const products = db.getProducts();
    expect(products.length).toBeGreaterThanOrEqual(28);

    // Verify GST slabs are all present
    const slabs = new Set(products.map((p) => p.gst_rate));
    expect(slabs.has(0)).toBe(true);
    expect(slabs.has(5)).toBe(true);
    expect(slabs.has(12)).toBe(true);
    expect(slabs.has(18)).toBe(true);
    expect(slabs.has(28)).toBe(true);

    // Check store config
    const config = db.getStoreConfig();
    expect(config.store_name).toBe("Urban Mart");
    expect(config.city).toBe("Navi Mumbai");
    expect(config.state_code).toBe("27");
  });

  it("supports fast barcode and text searches", () => {
    const byBarcode = db.getProductByBarcode("8901030383701"); // Tata Salt
    expect(byBarcode).toBeDefined();
    expect(byBarcode?.name).toContain("Tata Salt");

    const searchResults = db.searchProducts("Amul");
    expect(searchResults.length).toBeGreaterThanOrEqual(3);
  });

  it("creates, updates, and deletes products with audit trail", () => {
    const newProd = db.createProduct({
      barcode: "890999900001",
      sku: "TEST-SKU-01",
      name: "Urban Mart Test Biscuit",
      category: "Snacks",
      subcategory: "Biscuits",
      brand: "Urban Mart",
      hsn: "1905",
      unit: "PACK",
      mrp: 50,
      purchase_rate: 35,
      selling_price: 45,
      gst_rate: 18,
      stock_qty: 100,
      min_stock_alert: 20,
      is_active: true,
    });

    expect(newProd.id).toBeDefined();
    expect(db.getProductById(newProd.id)?.name).toBe("Urban Mart Test Biscuit");

    // Update product
    const updated = db.updateProduct(newProd.id, { selling_price: 42 });
    expect(updated?.selling_price).toBe(42);

    // Delete product
    const deleted = db.deleteProduct(newProd.id);
    expect(deleted).toBe(true);
    expect(db.getProductById(newProd.id)).toBeUndefined();
  });

  it("calculates live dashboard KPIs accurately", () => {
    const stats = db.getDashboardMetrics();
    expect(stats.todayStr).toBeDefined();
    expect(stats.totalStockCostValuation).toBeGreaterThan(0);
    expect(stats.totalStockMrpValuation).toBeGreaterThan(stats.totalStockCostValuation);
  });
});
