import { DEFAULT_DISTRIBUTION } from "./distribution";
import type {
  AppState,
  Brand,
  ItemType,
  LegacyAppState,
  LegacyPurchase,
  Order,
  OrderLine,
  PurchaseFlat,
  Settings,
} from "./types";
import { uid } from "./defaults";

export function flattenOrders(orders: Order[]): PurchaseFlat[] {
  return orders.flatMap((order) =>
    order.lines.map((line, index) => ({
      id: `${order.id}:${line.id}`,
      orderId: order.id,
      date: order.date,
      brand: line.brand,
      type: line.type,
      quantity: line.quantity,
      unitBuyPrice: line.unitBuyPrice,
      shippingCost: index === 0 ? order.shippingCost : 0,
      unitSellPrice: line.unitSellPrice,
    })),
  );
}

export function orderQuantity(order: Order): number {
  return order.lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
}

export function orderBuyTotal(order: Order): number {
  return order.lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitBuyPrice) || 0),
    0,
  );
}

export function orderGrandTotal(order: Order): number {
  return orderBuyTotal(order) + (Number(order.shippingCost) || 0);
}

export function createEmptyLine(
  settings: Settings,
  brand: Brand = "Essential",
  type: ItemType = "haut",
): OrderLine {
  return {
    id: uid(),
    brand,
    type,
    quantity: 1,
    unitBuyPrice: settings.defaultBuyPrices[type],
    unitSellPrice: settings.defaultSellPrices[type],
  };
}

export function migrateLegacyPurchases(purchases: LegacyPurchase[]): Order[] {
  return purchases.map((p) => ({
    id: p.id,
    date: p.date,
    shippingCost: p.shippingCost,
    lines: [
      {
        id: uid(),
        brand: p.brand,
        type: p.type,
        quantity: p.quantity,
        unitBuyPrice: p.unitBuyPrice,
        unitSellPrice: p.unitSellPrice,
      },
    ],
  }));
}

function mergeSettings(
  empty: Settings,
  partial?: Partial<Settings>,
): Settings {
  return {
    ...empty,
    ...partial,
    defaultBuyPrices: {
      ...empty.defaultBuyPrices,
      ...partial?.defaultBuyPrices,
    },
    defaultSellPrices: {
      ...empty.defaultSellPrices,
      ...partial?.defaultSellPrices,
    },
    commissionTiers:
      partial?.commissionTiers?.length
        ? partial.commissionTiers
        : empty.commissionTiers,
    distribution: {
      ...DEFAULT_DISTRIBUTION,
      ...empty.distribution,
      ...partial?.distribution,
    },
  };
}

export function normalizeState(raw: unknown, empty: AppState): AppState {
  if (!raw || typeof raw !== "object") return empty;
  const value = raw as Partial<AppState> &
    Partial<LegacyAppState> & { ledger?: AppState["ledger"] };

  if (
    (value.version === 2 || value.version === 3) &&
    Array.isArray(value.orders)
  ) {
    return {
      version: 3,
      orders: value.orders,
      sellers: value.sellers ?? [],
      allocations: value.allocations ?? [],
      sales: value.sales ?? [],
      ledger: Array.isArray(value.ledger) ? value.ledger : [],
      settings: mergeSettings(empty.settings, value.settings),
    };
  }

  if (value.version === 1 && Array.isArray(value.purchases)) {
    return {
      version: 3,
      orders: migrateLegacyPurchases(value.purchases),
      sellers: value.sellers ?? [],
      allocations: value.allocations ?? [],
      sales: value.sales ?? [],
      ledger: [],
      settings: mergeSettings(empty.settings, value.settings),
    };
  }

  return empty;
}

export function withPurchasesView(state: AppState): AppState & {
  purchases: PurchaseFlat[];
} {
  return {
    ...state,
    purchases: flattenOrders(state.orders),
  };
}
