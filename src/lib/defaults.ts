import type { AppState, Settings } from "./types";

export const STORAGE_KEY = "relais-finance-v1";

export const DEFAULT_SETTINGS: Settings = {
  partnerAName: "Associé 1",
  partnerBName: "Associé 2",
  partnerAPercent: 50,
  partnerBPercent: 50,
  defaultBuyPrices: {
    haut: 35,
    bas: 30,
    ensemble: 65,
  },
  defaultSellPrices: {
    haut: 70,
    bas: 60,
    ensemble: 120,
  },
  commissionBase: "ca",
  commissionTiers: [
    {
      minSold: 0,
      ratePercent: 12,
      label: "Débutant (0–9 ventes)",
    },
    {
      minSold: 10,
      ratePercent: 15,
      label: "Confirmé (10–24 ventes)",
    },
    {
      minSold: 25,
      ratePercent: 18,
      label: "Expert (25+ ventes)",
    },
  ],
};

export function createEmptyState(): AppState {
  return {
    version: 1,
    purchases: [],
    sellers: [],
    allocations: [],
    sales: [],
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function euro(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function percent(value: number): string {
  return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"} %`;
}

export function itemLabel(type: string): string {
  if (type === "haut") return "Haut";
  if (type === "bas") return "Bas";
  if (type === "ensemble") return "Ensemble";
  return type;
}
