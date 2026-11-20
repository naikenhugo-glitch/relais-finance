"use client";

import { FormEvent, useMemo, useState } from "react";
import { computeDashboard } from "@/lib/calculations";
import { euro, percent, uid } from "@/lib/defaults";
import {
  activeSourceKeys,
  appendCancellation,
  appendRepartition,
  appendWithdrawal,
  balancesFromLedger,
  epargneSeries,
  percentsValid,
  percentSum,
  savingsStats,
  splitByPercents,
  type EnvelopePercents,
  type LedgerEntry,
} from "@/lib/distribution";
import type { AppState, Settings } from "@/lib/types";

type Props = {
  state: AppState;
  onChange: (updater: (prev: AppState) => AppState) => void;
  onSettings: (patch: Partial<Settings>) => void;
};

type Filter = "all" | "repartition" | "retrait" | "annulation";

function typeLabel(t: string): string {
  const map: Record<string, string> = {
    repartition: "Répartition",
    retrait_epargne: "Retrait épargne",
    retrait_reinvestissement: "Retrait réinvestissement",
    retrait_libre: "Retrait argent libre",
    depense_reinvestissement: "Dépense réinvestissement",
    depense_libre: "Dépense argent libre",
    annulation: "Annulation",
  };
  return map[t] || t;
}

function formatDt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function SavingsChart({ points }: { points: { at: string; balance: number }[] }) {
  if (!points.length) {
    return (
      <div className="empty">
        Pas encore d’évolution : aucune opération sur l’épargne.
      </div>
    );
  }
  const w = 680;
  const h = 160;
  const pad = 28;
  const vals = points.map((p) => p.balance);
  const minV = Math.min(0, ...vals);
  const maxV = Math.max(...vals, 1);
  const x = (i: number) =>
    points.length === 1
      ? pad + (w - 2 * pad) / 2
      : pad + (i / (points.length - 1)) * (w - 2 * pad);
  const y = (v: number) =>
    h - pad - ((v - minV) / (maxV - minV)) * (h - 2 * pad);
  const d = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.balance).toFixed(1)}`,
    )
    .join(" ");
  const last = points[points.length - 1];
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Évolution épargne">
        <line
          x1={pad}
          y1={y(0)}
          x2={w - pad}
          y2={y(0)}
          stroke="#d5dee6"
        />
        <path d={d} fill="none" stroke="#0f766e" strokeWidth="2.5" />
        {points.map((p, i) => (
          <circle
            key={p.at + i}
            cx={x(i)}
            cy={y(p.balance)}
            r={3.5}
            fill="#0f766e"
          />
        ))}
        <text
          x={w - pad}
          y={y(last.balance) - 8}
          textAnchor="end"
          fontSize="11"
          fill="#6b7785"
        >
          {euro(last.balance)}
        </text>
      </svg>
    </div>
  );
}

export function Distribution({ state, onChange, onSettings }: Props) {
  const ledger = state.ledger ?? [];
  const percents = state.settings.distribution;
  const balances = useMemo(() => balancesFromLedger(ledger), [ledger]);
  const stats = useMemo(() => savingsStats(ledger), [ledger]);
  const series = useMemo(() => epargneSeries(ledger), [ledger]);
  const netProfit = computeDashboard(state).netProfit;
  const activeKeys = useMemo(() => activeSourceKeys(ledger), [ledger]);

  const [pctDraft, setPctDraft] = useState<EnvelopePercents>(percents);
  const [sourceMode, setSourceMode] = useState<"net" | "manual">("net");
  const [amount, setAmount] = useState(
    netProfit > 0 ? Math.round(netProfit * 100) / 100 : 0,
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [withdrawEnv, setWithdrawEnv] = useState<
    "epargne" | "reinvestissement" | "libre"
  >("epargne");
  const [withdrawKind, setWithdrawKind] = useState<"retrait" | "depense">(
    "retrait",
  );
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [withdrawNote, setWithdrawNote] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const pctSum = percentSum(pctDraft);
  const preview =
    amount > 0 && percentsValid(percents)
      ? splitByPercents(amount, percents)
      : null;

  function savePercents(e: FormEvent) {
    e.preventDefault();
    if (!percentsValid(pctDraft)) {
      setError(
        `Enregistrement bloqué. Total = ${pctSum} % (écart ${100 - pctSum} %).`,
      );
      return;
    }
    onSettings({ distribution: { ...pctDraft } });
    setError(null);
  }

  function distribute(e: FormEvent) {
    e.preventDefault();
    const sourceKey =
      sourceMode === "net" ? "net-profit-global" : `manual-${uid()}`;
    const result = appendRepartition({
      ledger,
      amount,
      percents,
      sourceKey,
      note,
      id: uid(),
      createdAt: new Date().toISOString(),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange((prev) => ({ ...prev, ledger: result.ledger }));
    setError(null);
    setNote("");
  }

  function withdraw(e: FormEvent) {
    e.preventDefault();
    if (
      withdrawEnv === "epargne" &&
      !window.confirm(
        `Confirmer le retrait exceptionnel de ${euro(withdrawAmount)} sur l’épargne ?\nMotif : ${withdrawNote}`,
      )
    ) {
      return;
    }
    const result = appendWithdrawal({
      ledger,
      envelope: withdrawEnv,
      amount: withdrawAmount,
      note: withdrawNote,
      asExpense: withdrawKind === "depense",
      id: uid(),
      createdAt: new Date().toISOString(),
    });
    if (!result.ok) {
      setWithdrawError(result.error);
      return;
    }
    onChange((prev) => ({ ...prev, ledger: result.ledger }));
    setWithdrawError(null);
    setWithdrawAmount(0);
    setWithdrawNote("");
  }

  function cancelEntry(id: string) {
    if (
      !window.confirm(
        "Annuler cette répartition ? Une ligne inverse sera ajoutée au journal.",
      )
    ) {
      return;
    }
    const result = appendCancellation({
      ledger,
      entryId: id,
      id: uid(),
      createdAt: new Date().toISOString(),
    });
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    onChange((prev) => ({ ...prev, ledger: result.ledger }));
  }

  const filtered = ledger
    .slice()
    .reverse()
    .filter((e) => {
      if (filter === "all") return true;
      if (filter === "repartition") return e.type === "repartition";
      if (filter === "annulation") return e.type === "annulation";
      return (
        e.type.startsWith("retrait") || e.type.startsWith("depense")
      );
    });

  function isCancelled(entry: LedgerEntry): boolean {
    return ledger.some(
      (e) => e.type === "annulation" && e.cancelsEntryId === entry.id,
    );
  }

  return (
    <div className="fade-in">
      <section className="panel">
        <p className="eyebrow">Épargne & enveloppes</p>
        <h2 className="section-title">Répartition des bénéfices</h2>
        <p className="section-help">
          Trois enveloppes séparées à 0&nbsp;€ au départ. L’épargne est bloquée
          (jamais pour les achats). Réinvestissement et argent libre sont hors
          épargne.
        </p>
        <div className="kpi-grid">
          <div className="kpi">
            <span className="kpi-label">Épargne (bloquée)</span>
            <div className="kpi-value">{euro(balances.epargne)}</div>
          </div>
          <div className="kpi">
            <span className="kpi-label">Réinvestissement · hors épargne</span>
            <div className="kpi-value">{euro(balances.reinvestissement)}</div>
          </div>
          <div className="kpi">
            <span className="kpi-label">Argent libre · hors épargne</span>
            <div className="kpi-value">{euro(balances.libre)}</div>
          </div>
          <div className="kpi accent">
            <span className="kpi-label">Total hors épargne</span>
            <div className="kpi-value">
              {euro(balances.reinvestissement + balances.libre)}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Pourcentages</h2>
        <p className="section-help">
          Défaut 20 / 50 / 30. Un changement ne s’applique qu’aux répartitions
          futures. Somme exacte = 100&nbsp;%.
        </p>
        <form onSubmit={savePercents}>
          <div className="form-grid cols-3">
            {(
              [
                ["epargne", "Épargne %"],
                ["reinvestissement", "Réinvestissement %"],
                ["libre", "Argent libre %"],
              ] as const
            ).map(([key, label]) => (
              <div className="field" key={key}>
                <label>{label}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={pctDraft[key]}
                  onChange={(e) =>
                    setPctDraft((p) => ({
                      ...p,
                      [key]: Number(e.target.value),
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <p className={`hint ${percentsValid(pctDraft) ? "" : "error"}`}>
            Total : {pctSum} %{!percentsValid(pctDraft) && ` — écart ${100 - pctSum} %`}
          </p>
          {error && <p className="error">{error}</p>}
          <div className="actions">
            <button type="submit" className="btn btn-primary">
              Enregistrer les pourcentages
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="section-title">Répartir un bénéfice</h2>
        <p className="section-help">
          Action explicite. Chaque bénéfice ne peut être réparti qu’une fois.
          Calcul en centimes (reliquat sur l’argent libre).
        </p>
        <form onSubmit={distribute}>
          <div className="form-grid cols-3">
            <div className="field">
              <label>Source</label>
              <select
                value={sourceMode}
                onChange={(e) => {
                  const mode = e.target.value as "net" | "manual";
                  setSourceMode(mode);
                  if (mode === "net") {
                    setAmount(
                      netProfit > 0 ? Math.round(netProfit * 100) / 100 : 0,
                    );
                  }
                }}
              >
                <option value="net">Bénéfice net actuel</option>
                <option value="manual">Montant manuel</option>
              </select>
            </div>
            <div className="field">
              <label>Montant (€)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={amount}
                readOnly={sourceMode === "net"}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Note</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Facultatif"
              />
            </div>
          </div>
          {sourceMode === "net" && activeKeys.has("net-profit-global") && (
            <p className="error">
              Le bénéfice net global a déjà été réparti. Annulez-le ou saisissez
              un montant manuel.
            </p>
          )}
          {sourceMode === "net" && !(netProfit > 0) && (
            <p className="error">
              Bénéfice net ≤ 0 : aucune répartition possible.
            </p>
          )}
          {preview && (
            <p className="hint">
              Aperçu : Épargne {euro(preview.epargne)} · Réinvest.{" "}
              {euro(preview.reinvestissement)} · Libre {euro(preview.libre)}
            </p>
          )}
          <div className="actions">
            <button type="submit" className="btn btn-primary">
              Répartir un bénéfice
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="section-title">Tableau de bord épargne</h2>
        <div className="kpi-grid">
          <div className="kpi">
            <span className="kpi-label">Total épargné actuel</span>
            <div className="kpi-value positive">{euro(stats.balance)}</div>
          </div>
          <div className="kpi">
            <span className="kpi-label">Total versé</span>
            <div className="kpi-value">{euro(stats.totalIn)}</div>
          </div>
          <div className="kpi">
            <span className="kpi-label">Total retiré</span>
            <div className="kpi-value">{euro(stats.totalOut)}</div>
          </div>
          <div className="kpi">
            <span className="kpi-label">% épargne (prochaines)</span>
            <div className="kpi-value">{percent(percents.epargne)}</div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <SavingsChart points={series} />
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Retrait ou dépense</h2>
        <form onSubmit={withdraw}>
          <div className="form-grid cols-4">
            <div className="field">
              <label>Enveloppe</label>
              <select
                value={withdrawEnv}
                onChange={(e) => {
                  const v = e.target.value as typeof withdrawEnv;
                  setWithdrawEnv(v);
                  if (v === "epargne") setWithdrawKind("retrait");
                }}
              >
                <option value="epargne">Épargne</option>
                <option value="reinvestissement">Réinvestissement</option>
                <option value="libre">Argent libre</option>
              </select>
            </div>
            <div className="field">
              <label>Type</label>
              <select
                value={withdrawKind}
                disabled={withdrawEnv === "epargne"}
                onChange={(e) =>
                  setWithdrawKind(e.target.value as "retrait" | "depense")
                }
              >
                <option value="retrait">Retrait</option>
                <option value="depense">Dépense</option>
              </select>
            </div>
            <div className="field">
              <label>Montant (€)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Motif</label>
              <input
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                placeholder={
                  withdrawEnv === "epargne" ? "Obligatoire" : "Recommandé"
                }
              />
            </div>
          </div>
          {withdrawError && <p className="error">{withdrawError}</p>}
          <div className="actions">
            <button type="submit" className="btn btn-danger">
              Enregistrer
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="section-title">Historique</h2>
        <p className="section-help">
          Journal en ajout seul. Les soldes se déduisent des lignes.
        </p>
        <div className="actions" style={{ marginTop: 0 }}>
          {(
            [
              ["all", "Tout"],
              ["repartition", "Répartitions"],
              ["retrait", "Retraits / dépenses"],
              ["annulation", "Annulations"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn btn-secondary ${filter === id ? "btn-primary" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="empty">Aucune opération pour l’instant.</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Épargne</th>
                  <th>Réinvest.</th>
                  <th>Libre</th>
                  <th>%</th>
                  <th>Soldes après</th>
                  <th>Note</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const cancelled = isCancelled(e);
                  return (
                    <tr key={e.id}>
                      <td>{formatDt(e.createdAt)}</td>
                      <td>
                        {typeLabel(e.type)}
                        {cancelled ? " (annulée)" : ""}
                      </td>
                      <td>{euro(e.amounts.epargne)}</td>
                      <td>{euro(e.amounts.reinvestissement)}</td>
                      <td>{euro(e.amounts.libre)}</td>
                      <td>
                        {e.percents
                          ? `${e.percents.epargne}/${e.percents.reinvestissement}/${e.percents.libre}`
                          : "—"}
                      </td>
                      <td>
                        {euro(e.balancesAfter.epargne)} /{" "}
                        {euro(e.balancesAfter.reinvestissement)} /{" "}
                        {euro(e.balancesAfter.libre)}
                      </td>
                      <td>{e.note || "—"}</td>
                      <td>
                        {e.type === "repartition" && !cancelled && (
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => cancelEntry(e.id)}
                          >
                            Annuler
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
