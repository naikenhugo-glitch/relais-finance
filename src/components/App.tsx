"use client";

import { useState } from "react";
import { useAppState } from "@/lib/storage";
import { Dashboard } from "./Dashboard";
import { Partners } from "./Partners";
import { Purchases } from "./Purchases";
import { Sales } from "./Sales";
import { Sellers } from "./Sellers";
import { SettingsPanel } from "./SettingsPanel";

const TABS = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "purchases", label: "Achats" },
  { id: "sales", label: "Ventes" },
  { id: "sellers", label: "Vendeurs" },
  { id: "partners", label: "Associés" },
  { id: "settings", label: "Réglages" },
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
      <header className="hero-row">
        <div>
          <div className="brand-mark">
            Relais<span>.</span>
          </div>
          <p className="lead" style={{ marginTop: 12, marginBottom: 0 }}>
            Gestion financière pour votre activité d’achat-revente —
            Essential, Ralph Lauren, Alo. Achats, stock, vendeurs et bénéfices
            au même endroit.
          </p>
        </div>
        <aside className="mini-note">
          Tout démarre vide. Ajoutez vos commandes et ventes au fil de l’eau —
          les calculs se mettent à jour seuls.
        </aside>
      </header>

      {!ready ? (
        <p className="lead">Chargement de vos données…</p>
      ) : (
        <>
          <nav className="nav-tabs" aria-label="Sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`nav-tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab === "dashboard" && <Dashboard state={state} />}
          {tab === "purchases" && <Purchases state={state} onChange={update} />}
          {tab === "sales" && <Sales state={state} onChange={update} />}
          {tab === "sellers" && <Sellers state={state} onChange={update} />}
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
