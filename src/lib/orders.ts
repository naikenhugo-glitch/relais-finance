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
      // shipping attributed only once per order (first line) for totals
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
    quantity: type === "ensemble" ? 1 : 1,
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

export function normalizeState(raw: unknown, empty: AppState): AppState {
  if (!raw || typeof raw !== "object") return empty;
  const value = raw as Partial<AppState> & Partial<LegacyAppState>;

  if (value.version === 2 && Array.isArray(value.orders)) {
    return {
      version: 2,
      orders: value.orders,
      sellers: value.sellers ?? [],
      allocations: value.allocations ?? [],
      sales: value.sales ?? [],
      settings: {
        ...empty.settings,
        ...value.settings,
        defaultBuyPrices: {
          ...empty.settings.defaultBuyPrices,
          ...value.settings?.defaultBuyPrices,
        },
        defaultSellPrices: {
          ...empty.settings.defaultSellPrices,
          ...value.settings?.defaultSellPrices,
        },
        commissionTiers:
          value.settings?.commissionTiers?.length
            ? value.settings.commissionTiers
            : empty.settings.commissionTiers,
      },
    };
  }

  if (value.version === 1 && Array.isArray(value.purchases)) {
    return {
      version: 2,
      orders: migrateLegacyPurchases(value.purchases),
      sellers: value.sellers ?? [],
      allocations: value.allocations ?? [],
      sales: value.sales ?? [],
      settings: {
        ...empty.settings,
        ...value.settings,
        defaultBuyPrices: {
          ...empty.settings.defaultBuyPrices,
          ...value.settings?.defaultBuyPrices,
        },
        defaultSellPrices: {
          ...empty.settings.defaultSellPrices,
          ...value.settings?.defaultSellPrices,
        },
        commissionTiers:
          value.settings?.commissionTiers?.length
            ? value.settings.commissionTiers
            : empty.settings.commissionTiers,
      },
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
