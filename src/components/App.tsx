"use client";

import { useState } from "react";
import { useAppState } from "@/lib/storage";
import { Dashboard } from "./Dashboard";
import { Distribution } from "./Distribution";
import { Partners } from "./Partners";
import { Purchases } from "./Purchases";
import { Sales } from "./Sales";
import { Sellers } from "./Sellers";
import { SettingsPanel } from "./SettingsPanel";

const TABS = [
  {
    id: "dashboard",
    label: "Vue d’ensemble",
    hint: "Résultats",
    group: "Suivi",
  },
  {
    id: "purchases",
    label: "Commandes",
    hint: "Achats fournisseur",
    group: "Activité",
  },
  {
    id: "sales",
    label: "Ventes",
    hint: "Sorties de stock",
    group: "Activité",
  },
  {
    id: "sellers",
    label: "Vendeurs",
    hint: "Stock & commissions",
    group: "Activité",
  },
  {
    id: "distribution",
    label: "Épargne",
    hint: "Répartition bénéfices",
    group: "Suivi",
  },
  {
    id: "partners",
    label: "Associés",
    hint: "Partage des bénéfices",
    group: "Réglages",
  },
  {
    id: "settings",
    label: "Paramètres",
    hint: "Prix & sauvegarde",
    group: "Réglages",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function App() {
  const {
    state,
    ready,
    update,
    updateSettings,
    exportJson,
    importJson,
    resetAll,
  } = useAppState();
  const [tab, setTab] = useState<TabId>("dashboard");

  return (
    <div className="app-shell">
      <header className="site-hero">
        <div className="hero-copy">
          <p className="brand-kicker">Achat-revente · Essential · Ralph Lauren · Alo</p>
          <h1 className="brand-mark">
            Relais<span>.</span>
          </h1>
          <p className="lead">
            Votre tableau de bord financier : commandes fournisseur, stock,
            vendeurs et bénéfices — calculés automatiquement.
          </p>
        </div>
        <ol className="flow-steps" aria-label="Comment utiliser Relais">
          <li>
            <strong>1. Commandes</strong>
            <span>Enregistrez un achat (plusieurs marques possibles).</span>
          </li>
          <li>
            <strong>2. Ventes / Vendeurs</strong>
            <span>Vendez vous-même ou attribuez du stock.</span>
          </li>
          <li>
            <strong>3. Vue d’ensemble</strong>
            <span>Suivez CA, bénéfice et parts associés.</span>
          </li>
        </ol>
      </header>

      {!ready ? (
        <p className="lead">Chargement de vos données…</p>
      ) : (
        <>
          <nav className="nav-rail" aria-label="Sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`nav-item ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span className="nav-item-label">{t.label}</span>
                <span className="nav-item-hint">{t.hint}</span>
              </button>
            ))}
          </nav>

          {tab === "dashboard" && (
            <Dashboard state={state} onNavigate={(id) => setTab(id)} />
          )}
          {tab === "purchases" && <Purchases state={state} onChange={update} />}
          {tab === "sales" && <Sales state={state} onChange={update} />}
          {tab === "sellers" && <Sellers state={state} onChange={update} />}
          {tab === "distribution" && (
            <Distribution
              state={state}
              onChange={update}
              onSettings={updateSettings}
            />
          )}
          {tab === "partners" && (
            <Partners state={state} onSettings={updateSettings} />
          )}
          {tab === "settings" && (
            <SettingsPanel
              state={state}
              onSettings={updateSettings}
              onExport={exportJson}
              onImport={importJson}
              onReset={resetAll}
            />
          )}
        </>
      )}
    </div>
  );
}
