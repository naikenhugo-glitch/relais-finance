/** Répartition des bénéfices — logique pure (centimes, journal append-only). */

export type EnvelopeId = "epargne" | "reinvestissement" | "libre";

export interface EnvelopePercents {
  epargne: number;
  reinvestissement: number;
  libre: number;
}

export type LedgerEntryType =
  | "repartition"
  | "retrait_epargne"
  | "retrait_reinvestissement"
  | "retrait_libre"
  | "depense_reinvestissement"
  | "depense_libre"
  | "annulation";

export interface EnvelopeAmounts {
  epargne: number;
  reinvestissement: number;
  libre: number;
}

export interface LedgerEntry {
  id: string;
  createdAt: string;
  type: LedgerEntryType;
  amounts: EnvelopeAmounts;
  percents: EnvelopePercents | null;
  sourceAmount: number;
  balancesAfter: EnvelopeAmounts;
  note: string;
  sourceKey: string | null;
  cancelsEntryId: string | null;
}

export const DEFAULT_DISTRIBUTION: EnvelopePercents = {
  epargne: 20,
  reinvestissement: 50,
  libre: 30,
};

export const ZERO_ENVELOPES: EnvelopeAmounts = {
  epargne: 0,
  reinvestissement: 0,
  libre: 0,
};

export function toCents(euros: number): number {
  return Math.round((Number.isFinite(euros) ? euros : 0) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Arrondi : épargne et réinvestissement arrondis, libre = reliquat. */
export function splitByPercents(
  amountEuros: number,
  percents: EnvelopePercents,
): EnvelopeAmounts {
  const totalCents = toCents(amountEuros);
  const eCents = Math.round((totalCents * percents.epargne) / 100);
  const rCents = Math.round((totalCents * percents.reinvestissement) / 100);
  const lCents = totalCents - eCents - rCents;
  return {
    epargne: fromCents(eCents),
    reinvestissement: fromCents(rCents),
    libre: fromCents(lCents),
  };
}

export function percentSum(p: EnvelopePercents): number {
  return (
    (Number(p.epargne) || 0) +
    (Number(p.reinvestissement) || 0) +
    (Number(p.libre) || 0)
  );
}

export function percentsValid(p: EnvelopePercents): boolean {
  return Math.abs(percentSum(p) - 100) < 0.0001;
}

export function sumAmounts(ledger: LedgerEntry[]): EnvelopeAmounts {
  const sum = { ...ZERO_ENVELOPES };
  for (const e of ledger) {
    sum.epargne += e.amounts.epargne;
    sum.reinvestissement += e.amounts.reinvestissement;
    sum.libre += e.amounts.libre;
  }
  return {
    epargne: fromCents(toCents(sum.epargne)),
    reinvestissement: fromCents(toCents(sum.reinvestissement)),
    libre: fromCents(toCents(sum.libre)),
  };
}

export function balancesFromLedger(ledger: LedgerEntry[]): EnvelopeAmounts {
  if (!ledger.length) return { ...ZERO_ENVELOPES };
  const last = ledger[ledger.length - 1];
  const summed = sumAmounts(ledger);
  // Soldes = somme des lignes (source de vérité). balancesAfter doit coller.
  return summed;
}

export function assertLedgerIntegrity(ledger: LedgerEntry[]): string | null {
  let running = { ...ZERO_ENVELOPES };
  for (const e of ledger) {
    running = {
      epargne: fromCents(toCents(running.epargne + e.amounts.epargne)),
      reinvestissement: fromCents(
        toCents(running.reinvestissement + e.amounts.reinvestissement),
      ),
      libre: fromCents(toCents(running.libre + e.amounts.libre)),
    };
    if (
      toCents(running.epargne) !== toCents(e.balancesAfter.epargne) ||
      toCents(running.reinvestissement) !==
        toCents(e.balancesAfter.reinvestissement) ||
      toCents(running.libre) !== toCents(e.balancesAfter.libre)
    ) {
      return `Incohérence journal à l’entrée ${e.id}`;
    }
  }
  return null;
}

export function isCancelled(
  ledger: LedgerEntry[],
  entryId: string,
): boolean {
  return ledger.some(
    (e) => e.type === "annulation" && e.cancelsEntryId === entryId,
  );
}

export function activeSourceKeys(ledger: LedgerEntry[]): Set<string> {
  const keys = new Set<string>();
  for (const e of ledger) {
    if (
      e.type === "repartition" &&
      e.sourceKey &&
      !isCancelled(ledger, e.id)
    ) {
      keys.add(e.sourceKey);
    }
  }
  return keys;
}

export function savingsStats(ledger: LedgerEntry[]): {
  balance: number;
  totalIn: number;
  totalOut: number;
} {
  let totalIn = 0;
  let totalOut = 0;
  for (const e of ledger) {
    const a = e.amounts.epargne;
    if (a > 0) totalIn += a;
    if (a < 0) totalOut += -a;
  }
  return {
    balance: fromCents(toCents(totalIn - totalOut)),
    totalIn: fromCents(toCents(totalIn)),
    totalOut: fromCents(toCents(totalOut)),
  };
}

export function epargneSeries(
  ledger: LedgerEntry[],
): { at: string; balance: number }[] {
  const points: { at: string; balance: number }[] = [];
  let bal = 0;
  for (const e of ledger) {
    if (toCents(e.amounts.epargne) === 0) continue;
    bal = fromCents(toCents(bal + e.amounts.epargne));
    points.push({ at: e.createdAt, balance: bal });
  }
  return points;
}

export interface AppendResult {
  ok: true;
  entry: LedgerEntry;
  ledger: LedgerEntry[];
}

export interface AppendError {
  ok: false;
  error: string;
}

export function appendRepartition(args: {
  ledger: LedgerEntry[];
  amount: number;
  percents: EnvelopePercents;
  sourceKey: string;
  note?: string;
  id: string;
  createdAt: string;
}): AppendResult | AppendError {
  if (!percentsValid(args.percents)) {
    const sum = percentSum(args.percents);
    return {
      ok: false,
      error: `Les pourcentages doivent totaliser 100 % (actuellement ${sum} %, écart ${100 - sum}).`,
    };
  }
  if (!(args.amount > 0)) {
    return {
      ok: false,
      error: "Aucun bénéfice positif à répartir (montant ≤ 0).",
    };
  }
  if (activeSourceKeys(args.ledger).has(args.sourceKey)) {
    return {
      ok: false,
      error:
        "Ce bénéfice a déjà été réparti. Annulez d’abord la répartition existante.",
    };
  }
  const amounts = splitByPercents(args.amount, args.percents);
  const prev = balancesFromLedger(args.ledger);
  const balancesAfter: EnvelopeAmounts = {
    epargne: fromCents(toCents(prev.epargne + amounts.epargne)),
    reinvestissement: fromCents(
      toCents(prev.reinvestissement + amounts.reinvestissement),
    ),
    libre: fromCents(toCents(prev.libre + amounts.libre)),
  };
  const entry: LedgerEntry = {
    id: args.id,
    createdAt: args.createdAt,
    type: "repartition",
    amounts,
    percents: { ...args.percents },
    sourceAmount: fromCents(toCents(args.amount)),
    balancesAfter,
    note: args.note?.trim() || "",
    sourceKey: args.sourceKey,
    cancelsEntryId: null,
  };
  return { ok: true, entry, ledger: [...args.ledger, entry] };
}

export function appendWithdrawal(args: {
  ledger: LedgerEntry[];
  envelope: "epargne" | "reinvestissement" | "libre";
  amount: number;
  note: string;
  asExpense?: boolean;
  id: string;
  createdAt: string;
}): AppendResult | AppendError {
  const amount = fromCents(toCents(args.amount));
  if (!(amount > 0)) {
    return { ok: false, error: "Indiquez un montant positif." };
  }
  if (args.envelope === "epargne" && !args.note.trim()) {
    return {
      ok: false,
      error: "Un motif obligatoire est requis pour un retrait d’épargne.",
    };
  }
  if (
    (args.envelope === "reinvestissement" || args.envelope === "libre") &&
    args.asExpense &&
    !args.note.trim()
  ) {
    return { ok: false, error: "Indiquez un motif pour cette dépense." };
  }
  const prev = balancesFromLedger(args.ledger);
  if (toCents(prev[args.envelope]) < toCents(amount)) {
    return {
      ok: false,
      error: `Solde insuffisant sur « ${args.envelope} » (${prev[args.envelope]} € disponible).`,
    };
  }
  const amounts: EnvelopeAmounts = { ...ZERO_ENVELOPES };
  amounts[args.envelope] = -amount;
  const balancesAfter: EnvelopeAmounts = {
    epargne: fromCents(toCents(prev.epargne + amounts.epargne)),
    reinvestissement: fromCents(
      toCents(prev.reinvestissement + amounts.reinvestissement),
    ),
    libre: fromCents(toCents(prev.libre + amounts.libre)),
  };
  let type: LedgerEntryType;
  if (args.envelope === "epargne") type = "retrait_epargne";
  else if (args.asExpense) {
    type =
      args.envelope === "reinvestissement"
        ? "depense_reinvestissement"
        : "depense_libre";
  } else {
    type =
      args.envelope === "reinvestissement"
        ? "retrait_reinvestissement"
        : "retrait_libre";
  }
  const entry: LedgerEntry = {
    id: args.id,
    createdAt: args.createdAt,
    type,
    amounts,
    percents: null,
    sourceAmount: amount,
    balancesAfter,
    note: args.note.trim(),
    sourceKey: null,
    cancelsEntryId: null,
  };
  return { ok: true, entry, ledger: [...args.ledger, entry] };
}

export function appendCancellation(args: {
  ledger: LedgerEntry[];
  entryId: string;
  id: string;
  createdAt: string;
  note?: string;
}): AppendResult | AppendError {
  const target = args.ledger.find((e) => e.id === args.entryId);
  if (!target || target.type !== "repartition") {
    return { ok: false, error: "Répartition introuvable." };
  }
  if (isCancelled(args.ledger, args.entryId)) {
    return { ok: false, error: "Cette répartition est déjà annulée." };
  }
  const amounts: EnvelopeAmounts = {
    epargne: -target.amounts.epargne,
    reinvestissement: -target.amounts.reinvestissement,
    libre: -target.amounts.libre,
  };
  const prev = balancesFromLedger(args.ledger);
  const balancesAfter: EnvelopeAmounts = {
    epargne: fromCents(toCents(prev.epargne + amounts.epargne)),
    reinvestissement: fromCents(
      toCents(prev.reinvestissement + amounts.reinvestissement),
    ),
    libre: fromCents(toCents(prev.libre + amounts.libre)),
  };
  if (
    toCents(balancesAfter.epargne) < 0 ||
    toCents(balancesAfter.reinvestissement) < 0 ||
    toCents(balancesAfter.libre) < 0
  ) {
    return {
      ok: false,
      error:
        "Annulation impossible : des retraits ont déjà consommé une partie de ces enveloppes.",
    };
  }
  const entry: LedgerEntry = {
    id: args.id,
    createdAt: args.createdAt,
    type: "annulation",
    amounts,
    percents: target.percents ? { ...target.percents } : null,
    sourceAmount: target.sourceAmount,
    balancesAfter,
    note: args.note?.trim() || `Annulation de la répartition ${args.entryId}`,
    sourceKey: null,
    cancelsEntryId: args.entryId,
  };
  return { ok: true, entry, ledger: [...args.ledger, entry] };
}
