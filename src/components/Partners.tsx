"use client";

import { computeDashboard, partnerShares } from "@/lib/calculations";
import { euro } from "@/lib/defaults";
import type { AppState, Settings } from "@/lib/types";

type Props = {
  state: AppState;
  onSettings: (patch: Partial<Settings>) => void;
};

export function Partners({ state, onSettings }: Props) {
  const totals = computeDashboard(state);
  const shares = partnerShares(totals.netProfit, state.settings);
  const sum =
    state.settings.partnerAPercent + state.settings.partnerBPercent;

  function setA(value: number) {
    const a = Math.max(0, Math.min(100, value));
    onSettings({
      partnerAPercent: a,
      partnerBPercent: 100 - a,
    });
  }

  function setB(value: number) {
    const b = Math.max(0, Math.min(100, value));
    onSettings({
      partnerBPercent: b,
      partnerAPercent: 100 - b,
    });
  }

  return (
    <div className="fade-in">
      <section className="panel">
        <h2 className="section-title">Répartition entre associés</h2>
        <p className="section-help">
          Par défaut 50/50. Ajustez les pourcentages : la somme est maintenue
          à 100 %. Le calcul part du bénéfice net (après achats vendus,
          livraisons et commissions vendeurs).
        </p>

        <div className="form-grid cols-2">
          <div className="field">
            <label htmlFor="pa-name">Nom associé 1</label>
            <input
              id="pa-name"
              value={state.settings.partnerAName}
              onChange={(e) => onSettings({ partnerAName: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="pb-name">Nom associé 2</label>
            <input
              id="pb-name"
              value={state.settings.partnerBName}
              onChange={(e) => onSettings({ partnerBName: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="pa-pct">Part associé 1 (%)</label>
            <input
              id="pa-pct"
              type="number"
              min={0}
              max={100}
              step={1}
              value={state.settings.partnerAPercent}
              onChange={(e) => setA(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="pb-pct">Part associé 2 (%)</label>
            <input
              id="pb-pct"
              type="number"
              min={0}
              max={100}
              step={1}
              value={state.settings.partnerBPercent}
              onChange={(e) => setB(Number(e.target.value))}
            />
          </div>
        </div>

        <p className="hint">
          Total des parts : <strong>{sum} %</strong>
          {sum !== 100 && " — les montants sont proportionnels à vos parts."}
        </p>

        <div className="kpi-grid" style={{ marginTop: 18 }}>
          <div className="kpi">
            <span className="kpi-label">Bénéfice net à partager</span>
            <div
              className={`kpi-value ${totals.netProfit >= 0 ? "positive" : "negative"}`}
            >
              {euro(totals.netProfit)}
            </div>
          </div>
          <div className="kpi">
            <span className="kpi-label">
              {state.settings.partnerAName} ({state.settings.partnerAPercent} %)
            </span>
            <div className="kpi-value">{euro(shares.a)}</div>
          </div>
          <div className="kpi">
            <span className="kpi-label">
              {state.settings.partnerBName} ({state.settings.partnerBPercent} %)
            </span>
            <div className="kpi-value">{euro(shares.b)}</div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Comment c’est calculé</h2>
        <p className="section-help" style={{ marginBottom: 0 }}>
          Bénéfice net = chiffre d’affaires − coût d’achat des articles vendus −
          frais de livraison − commissions vendeurs. Le stock non vendu reste
          une valeur d’actif (affiché au tableau de bord) et n’est pas compté
          comme une perte.
        </p>
      </section>
    </div>
  );
}
