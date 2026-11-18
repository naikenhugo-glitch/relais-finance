export type Brand = "Essential" | "Ralph Lauren" | "Alo";
export type ItemType = "haut" | "bas" | "ensemble";

export const BRANDS: Brand[] = ["Essential", "Ralph Lauren", "Alo"];
export const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: "haut", label: "Haut" },
  { value: "bas", label: "Bas" },
  { value: "ensemble", label: "Ensemble" },
];

export interface Purchase {
  id: string;
  date: string;
  brand: Brand;
  type: ItemType;
  quantity: number;
  unitBuyPrice: number;
  shippingCost: number;
  unitSellPrice: number;
}

export interface Seller {
  id: string;
  name: string;
  city: string;
}

export interface Allocation {
  id: string;
  date: string;
  sellerId: string;
  brand: Brand;
  type: ItemType;
  quantity: number;
  unitBuyPrice: number;
  unitSellPrice: number;
}

export interface Sale {
  id: string;
  date: string;
  brand: Brand;
  type: ItemType;
  quantity: number;
  unitSalePrice: number;
  unitBuyPrice: number;
  /** null = vente directe (associés) */
  sellerId: string | null;
}

export interface CommissionTier {
  minSold: number;
  ratePercent: number;
  label: string;
}

export interface Settings {
  partnerAName: string;
  partnerBName: string;
  partnerAPercent: number;
  partnerBPercent: number;
  defaultBuyPrices: Record<ItemType, number>;
  defaultSellPrices: Record<ItemType, number>;
  /** Commission en % du chiffre d'affaires du vendeur */
  commissionBase: "ca" | "marge";
  commissionTiers: CommissionTier[];
}

export interface AppState {
  version: 1;
  purchases: Purchase[];
  sellers: Seller[];
  allocations: Allocation[];
  sales: Sale[];
  settings: Settings;
}

export interface StockKey {
  brand: Brand;
  type: ItemType;
}

export interface StockLine {
  brand: Brand;
  type: ItemType;
  bought: number;
  allocated: number;
  soldOwn: number;
  soldBySellers: number;
  centralRemaining: number;
  sellerRemaining: number;
  totalRemaining: number;
  avgBuyPrice: number;
  valueRemaining: number;
}

export interface SellerStats {
  seller: Seller;
  allocated: number;
  sold: number;
  remaining: number;
  revenue: number;
  buyCost: number;
  commissionRate: number;
  commission: number;
  companyProfit: number;
}

export interface DashboardTotals {
  purchaseTotal: number;
  shippingTotal: number;
  revenueTotal: number;
  commissionTotal: number;
  netProfit: number;
  itemsBought: number;
  itemsSold: number;
  stockValue: number;
  stockRemaining: number;
  ownRevenue: number;
  sellerRevenue: number;
  marginPercent: number;
}
