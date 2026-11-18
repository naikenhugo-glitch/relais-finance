import type {
  Allocation,
  AppState,
  Brand,
  CommissionTier,
  DashboardTotals,
  ItemType,
  Sale,
  SellerStats,
  Settings,
  StockLine,
} from "./types";
import { BRANDS, ITEM_TYPES } from "./types";

export function getCommissionRate(
  unitsSold: number,
  tiers: CommissionTier[],
): number {
  const sorted = [...tiers].sort((a, b) => a.minSold - b.minSold);
  let rate = sorted[0]?.ratePercent ?? 0;
  for (const tier of sorted) {
    if (unitsSold >= tier.minSold) rate = tier.ratePercent;
  }
  return rate;
}

function avgBuyFromPurchases(
  state: AppState,
  brand: Brand,
  type: ItemType,
): number {
  const lines = state.purchases.filter(
    (p) => p.brand === brand && p.type === type,
  );
  const qty = lines.reduce((s, p) => s + p.quantity, 0);
  if (qty === 0) {
    return state.settings.defaultBuyPrices[type];
  }
  const total = lines.reduce((s, p) => s + p.quantity * p.unitBuyPrice, 0);
  return total / qty;
}

export function computeStock(state: AppState): StockLine[] {
  const lines: StockLine[] = [];

  for (const brand of BRANDS) {
    for (const { value: type } of ITEM_TYPES) {
      const bought = state.purchases
        .filter((p) => p.brand === brand && p.type === type)
        .reduce((s, p) => s + p.quantity, 0);

      const allocated = state.allocations
        .filter((a) => a.brand === brand && a.type === type)
        .reduce((s, a) => s + a.quantity, 0);

      const soldOwn = state.sales
        .filter(
          (sale) =>
            sale.brand === brand &&
            sale.type === type &&
            sale.sellerId === null,
        )
        .reduce((s, sale) => s + sale.quantity, 0);

      const soldBySellers = state.sales
        .filter(
          (sale) =>
            sale.brand === brand &&
            sale.type === type &&
            sale.sellerId !== null,
        )
        .reduce((s, sale) => s + sale.quantity, 0);

      const centralRemaining = bought - allocated - soldOwn;
      const sellerRemaining = allocated - soldBySellers;
      const totalRemaining = centralRemaining + sellerRemaining;
      const avgBuyPrice = avgBuyFromPurchases(state, brand, type);

      if (bought === 0 && allocated === 0 && soldOwn === 0 && soldBySellers === 0) {
        continue;
      }

      lines.push({
        brand,
        type,
        bought,
        allocated,
        soldOwn,
        soldBySellers,
        centralRemaining,
        sellerRemaining,
        totalRemaining,
        avgBuyPrice,
        valueRemaining: totalRemaining * avgBuyPrice,
      });
    }
  }

  return lines;
}

export function centralAvailable(
  state: AppState,
  brand: Brand,
  type: ItemType,
): number {
  const line = computeStock(state).find(
    (l) => l.brand === brand && l.type === type,
  );
  return line?.centralRemaining ?? 0;
}

export function sellerAvailable(
  state: AppState,
  sellerId: string,
  brand: Brand,
  type: ItemType,
): number {
  const allocated = state.allocations
    .filter(
      (a) =>
        a.sellerId === sellerId && a.brand === brand && a.type === type,
    )
    .reduce((s, a) => s + a.quantity, 0);
  const sold = state.sales
    .filter(
      (sale) =>
        sale.sellerId === sellerId &&
        sale.brand === brand &&
        sale.type === type,
    )
    .reduce((s, sale) => s + sale.quantity, 0);
  return allocated - sold;
}

function salesOfSeller(sales: Sale[], sellerId: string): Sale[] {
  return sales.filter((s) => s.sellerId === sellerId);
}

function commissionAmount(
  revenue: number,
  buyCost: number,
  ratePercent: number,
  base: Settings["commissionBase"],
): number {
  const baseAmount = base === "marge" ? Math.max(0, revenue - buyCost) : revenue;
  return (baseAmount * ratePercent) / 100;
}

export function computeSellerStats(state: AppState): SellerStats[] {
  return state.sellers.map((seller) => {
    const allocated = state.allocations
      .filter((a) => a.sellerId === seller.id)
      .reduce((s, a) => s + a.quantity, 0);

    const sellerSales = salesOfSeller(state.sales, seller.id);
    const sold = sellerSales.reduce((s, sale) => s + sale.quantity, 0);
    const remaining = allocated - sold;
    const revenue = sellerSales.reduce(
      (s, sale) => s + sale.quantity * sale.unitSalePrice,
      0,
    );
    const buyCost = sellerSales.reduce(
      (s, sale) => s + sale.quantity * sale.unitBuyPrice,
      0,
    );
    const commissionRate = getCommissionRate(
      sold,
      state.settings.commissionTiers,
    );
    const commission = commissionAmount(
      revenue,
      buyCost,
      commissionRate,
      state.settings.commissionBase,
    );
    const companyProfit = revenue - buyCost - commission;

    return {
      seller,
      allocated,
      sold,
      remaining,
      revenue,
      buyCost,
      commissionRate,
      commission,
      companyProfit,
    };
  });
}

export function computeDashboard(state: AppState): DashboardTotals {
  const purchaseTotal = state.purchases.reduce(
    (s, p) => s + p.quantity * p.unitBuyPrice,
    0,
  );
  const shippingTotal = state.purchases.reduce(
    (s, p) => s + p.shippingCost,
    0,
  );
  const revenueTotal = state.sales.reduce(
    (s, sale) => s + sale.quantity * sale.unitSalePrice,
    0,
  );
  const soldBuyCost = state.sales.reduce(
    (s, sale) => s + sale.quantity * sale.unitBuyPrice,
    0,
  );

  const sellerStats = computeSellerStats(state);
  const commissionTotal = sellerStats.reduce((s, st) => s + st.commission, 0);

  const ownRevenue = state.sales
    .filter((sale) => sale.sellerId === null)
    .reduce((s, sale) => s + sale.quantity * sale.unitSalePrice, 0);
  const sellerRevenue = revenueTotal - ownRevenue;

  const itemsBought = state.purchases.reduce((s, p) => s + p.quantity, 0);
  const itemsSold = state.sales.reduce((s, sale) => s + sale.quantity, 0);

  const stock = computeStock(state);
  const stockRemaining = stock.reduce((s, l) => s + l.totalRemaining, 0);
  const stockValue = stock.reduce((s, l) => s + l.valueRemaining, 0);

  // Bénéfice net = CA - coût des articles vendus - livraison - commissions
  // (le stock restant n'est pas une perte)
  const netProfit =
    revenueTotal - soldBuyCost - shippingTotal - commissionTotal;

  const marginPercent =
    revenueTotal > 0 ? (netProfit / revenueTotal) * 100 : 0;

  return {
    purchaseTotal,
    shippingTotal,
    revenueTotal,
    commissionTotal,
    netProfit,
    itemsBought,
    itemsSold,
    stockValue,
    stockRemaining,
    ownRevenue,
    sellerRevenue,
    marginPercent,
  };
}

export function partnerShares(
  netProfit: number,
  settings: Settings,
): { a: number; b: number } {
  const aPct = settings.partnerAPercent;
  const bPct = settings.partnerBPercent;
  const total = aPct + bPct || 100;
  return {
    a: (netProfit * aPct) / total,
    b: (netProfit * bPct) / total,
  };
}

export function suggestBuyPrice(settings: Settings, type: ItemType): number {
  return settings.defaultBuyPrices[type];
}

export function suggestSellPrice(settings: Settings, type: ItemType): number {
  return settings.defaultSellPrices[type];
}

export function validatePurchaseQuantity(qty: number): string | null {
  if (!Number.isFinite(qty) || qty < 1) {
    return "La quantité doit être au moins 1.";
  }
  if (qty < 5) {
    return "Le fournisseur exige un minimum de 5 articles par commande.";
  }
  return null;
}

export function allocationCostBasis(
  state: AppState,
  brand: Brand,
  type: ItemType,
): { unitBuyPrice: number; unitSellPrice: number } {
  const purchases = state.purchases.filter(
    (p) => p.brand === brand && p.type === type,
  );
  if (purchases.length === 0) {
    return {
      unitBuyPrice: state.settings.defaultBuyPrices[type],
      unitSellPrice: state.settings.defaultSellPrices[type],
    };
  }
  const last = purchases[purchases.length - 1];
  return {
    unitBuyPrice: avgBuyFromPurchases(state, brand, type),
    unitSellPrice: last.unitSellPrice,
  };
}

export function summarizeAllocationStock(
  allocations: Allocation[],
  sales: Sale[],
  sellerId: string,
): { brand: Brand; type: ItemType; remaining: number }[] {
  const map = new Map<string, { brand: Brand; type: ItemType; remaining: number }>();

  for (const a of allocations.filter((x) => x.sellerId === sellerId)) {
    const key = `${a.brand}|${a.type}`;
    const cur = map.get(key) ?? {
      brand: a.brand,
      type: a.type,
      remaining: 0,
    };
    cur.remaining += a.quantity;
    map.set(key, cur);
  }

  for (const sale of sales.filter((x) => x.sellerId === sellerId)) {
    const key = `${sale.brand}|${sale.type}`;
    const cur = map.get(key);
    if (cur) cur.remaining -= sale.quantity;
  }

  return [...map.values()].filter((x) => x.remaining !== 0);
}
