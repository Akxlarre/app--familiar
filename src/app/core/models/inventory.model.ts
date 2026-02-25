// =============================================================================
// FamilyApp — Inventory & Shopping List models
// =============================================================================

export type ProductLocation = 'refrigerador' | 'despensa' | 'freezer' | 'otro';
export type StockStatus = 'ok' | 'low' | 'out';
export type ShoppingListStatus = 'active' | 'closed' | 'archived';
export type ShoppingListItemSource = 'manual' | 'low_stock' | 'out_of_stock' | 'recurring' | 'meal_plan';

export interface ProductCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface Product {
  id: string;
  household_id: string;
  category_id: string;
  name: string;
  name_normalized: string | null;
  quantity: number;
  unit: string;
  default_unit: string;
  stock_minimum: number;
  location: ProductLocation;
  expiry_date: string | null;
  barcode: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  // Campos calculados o provenientes de joins
  category_name?: string;
  stock_status?: StockStatus;
}

export interface ProductNameAlias {
  id: string;
  household_id: string;
  alias: string;
  product_id: string;
  created_at: string;
}

export interface PriceRecord {
  id: string;
  product_id: string;
  price_clp: number;
  purchase_date: string;
  store_name: string | null;
  store_location: string | null;
  receipt_id: string | null;
  units_in_pack: number | null;
  created_at: string;
}

export interface ShoppingList {
  id: string;
  household_id: string;
  name: string;
  status: ShoppingListStatus;
  closed_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ShoppingListItem {
  id: string;
  list_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit: string;
  is_checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
  price_at_purchase: number | null;
  added_by: string | null;
  source: ShoppingListItemSource;
  sort_order: number;
  created_at: string;
}

export interface InventoryLog {
  id: string;
  product_id: string;
  profile_id: string;
  quantity_before: number;
  quantity_after: number;
  change_type: 'adjust' | 'consume' | 'restock' | 'manual';
  note: string | null;
  created_at: string;
}

export interface ReceiptScanItem {
  raw_name: string;
  normalized_name: string | null;
  quantity: number;
  unit: string;
  unit_price: number | null;
  total_price: number | null;
  is_pack?: boolean;
  units_in_pack?: number | null;
  matched_product_id: string | null;
  location: ProductLocation;
  add_to_inventory: boolean;
}

export interface ReceiptScanResult {
  items: ReceiptScanItem[];
  store_name: string | null;
  date: string | null;
  total: number | null;
}
