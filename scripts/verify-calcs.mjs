/** Quick sanity checks for financial formulas (no test runner required). */

function getCommissionRate(unitsSold, tiers) {
  const sorted = [...tiers].sort((a, b) => a.minSold - b.minSold);
  let rate = sorted[0]?.ratePercent ?? 0;
  for (const tier of sorted) {
    if (unitsSold >= tier.minSold) rate = tier.ratePercent;
  }
  return rate;
}

const tiers = [
  { minSold: 0, ratePercent: 12 },
  { minSold: 10, ratePercent: 15 },
  { minSold: 25, ratePercent: 18 },
];

const asserts = [];
function assert(cond, msg) {
  asserts.push({ ok: !!cond, msg });
}

assert(getCommissionRate(0, tiers) === 12, "0 ventes → 12%");
assert(getCommissionRate(9, tiers) === 12, "9 ventes → 12%");
assert(getCommissionRate(10, tiers) === 15, "10 ventes → 15%");
assert(getCommissionRate(25, tiers) === 18, "25 ventes → 18%");

// Sample business flow
const buy = 5 * 35; // 175
const ship = 20;
const revenue = 3 * 70; // 210 own sales
const soldCost = 3 * 35; // 105
const sellerRevenue = 2 * 70; // 140
const sellerCost = 2 * 35; // 70
const sellerSold = 2;
const rate = getCommissionRate(sellerSold, tiers);
const commission = (sellerRevenue * rate) / 100; // 16.8
const net =
  revenue + sellerRevenue - soldCost - sellerCost - ship - commission;
// 210+140-105-70-20-16.8 = 138.2

assert(Math.abs(net - 138.2) < 0.001, `bénéfice net attendu 138.2, obtenu ${net}`);
assert(rate === 12, "vendeur 2 ventes → 12%");

const failed = asserts.filter((a) => !a.ok);
for (const a of asserts) {
  console.log(`${a.ok ? "OK" : "FAIL"} — ${a.msg}`);
}
if (failed.length) {
  process.exit(1);
}
console.log("All calculation checks passed.");
