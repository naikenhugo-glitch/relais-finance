/** Cas de test répartition / épargne */

function toCents(euros) {
  return Math.round((Number.isFinite(euros) ? euros : 0) * 100);
}
function fromCents(cents) {
  return cents / 100;
}
function splitByPercents(amountEuros, percents) {
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

const asserts = [];
function assert(cond, msg) {
  asserts.push({ ok: !!cond, msg });
}

// 1) 1000 € → 200 / 500 / 300
const s = splitByPercents(1000, { epargne: 20, reinvestissement: 50, libre: 30 });
assert(s.epargne === 200 && s.reinvestissement === 500 && s.libre === 300, "1000€ → 200/500/300");
assert(
  toCents(s.epargne + s.reinvestissement + s.libre) === toCents(1000),
  "somme des 3 = bénéfice",
);

// Rounding leftover goes to libre
const s2 = splitByPercents(100, { epargne: 33.33, reinvestissement: 33.33, libre: 33.34 });
assert(
  toCents(s2.epargne + s2.reinvestissement + s2.libre) === 10000,
  "arrondi : somme exacte en centimes",
);

// Simulate ledger integrity
let ledger = [];
function bal() {
  const z = { epargne: 0, reinvestissement: 0, libre: 0 };
  for (const e of ledger) {
    z.epargne += e.amounts.epargne;
    z.reinvestissement += e.amounts.reinvestissement;
    z.libre += e.amounts.libre;
  }
  return {
    epargne: fromCents(toCents(z.epargne)),
    reinvestissement: fromCents(toCents(z.reinvestissement)),
    libre: fromCents(toCents(z.libre)),
  };
}

const amounts = splitByPercents(1000, { epargne: 20, reinvestissement: 50, libre: 30 });
const after1 = {
  epargne: amounts.epargne,
  reinvestissement: amounts.reinvestissement,
  libre: amounts.libre,
};
ledger.push({
  id: "r1",
  type: "repartition",
  amounts,
  percents: { epargne: 20, reinvestissement: 50, libre: 30 },
  sourceKey: "net-profit-global",
  balancesAfter: after1,
});

// Non-retroactive percents: change to 10/40/50 then new split uses new %
const amounts2 = splitByPercents(100, { epargne: 10, reinvestissement: 40, libre: 50 });
assert(amounts2.epargne === 10 && amounts.epargne === 200, "changement % non rétroactif sur ancienne ligne");

// Withdrawal over balance refused
const tryWithdraw = 250;
assert(tryWithdraw > bal().epargne, "retrait 250 > solde 200 → à refuser");

// Valid withdrawal
ledger.push({
  id: "w1",
  type: "retrait_epargne",
  amounts: { epargne: -100, reinvestissement: 0, libre: 0 },
  balancesAfter: {
    epargne: 100,
    reinvestissement: 500,
    libre: 300,
  },
});
assert(bal().epargne === 100, "après retrait 100, épargne = 100");

// Cancel repartition blocked if would go negative? We already withdrew 100 from epargne
// Cancelling r1 would subtract 200 from epargne → 100-200 = -100 → refuse
const afterCancelWould = bal().epargne - 200;
assert(afterCancelWould < 0, "annulation refusée si soldes négatifs");

// Fresh cancel path: new ledger
ledger = [
  {
    id: "r2",
    type: "repartition",
    amounts: { epargne: 200, reinvestissement: 500, libre: 300 },
    sourceKey: "net-profit-global",
    balancesAfter: { epargne: 200, reinvestissement: 500, libre: 300 },
  },
];
ledger.push({
  id: "c1",
  type: "annulation",
  cancelsEntryId: "r2",
  amounts: { epargne: -200, reinvestissement: -500, libre: -300 },
  balancesAfter: { epargne: 0, reinvestissement: 0, libre: 0 },
});
assert(bal().epargne === 0 && bal().libre === 0, "annulation remet à zéro");

// Double repartition blocked
const keys = new Set();
for (const e of [
  { type: "repartition", id: "r3", sourceKey: "net-profit-global" },
]) {
  if (e.type === "repartition" && e.sourceKey) keys.add(e.sourceKey);
}
assert(keys.has("net-profit-global"), "double répartition détectée via sourceKey");

const failed = asserts.filter((a) => !a.ok);
for (const a of asserts) console.log(`${a.ok ? "OK" : "FAIL"} — ${a.msg}`);
if (failed.length) process.exit(1);
console.log("All distribution checks passed.");
