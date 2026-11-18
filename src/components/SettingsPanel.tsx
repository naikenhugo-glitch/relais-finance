"use client";

import type { AppState, CommissionTier, ItemType, Settings } from "@/lib/types";

type Props = {
  state: AppState;
  onSettings: (patch: Partial<Settings>) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
};

export function SettingsPanel({
  state,
  onSettings,
  onExport,
  onImport,
  onReset,
}: Props) {
  const { settings } = state;

  function setBuy(type: ItemType, value: number) {
    onSettings({
      defaultBuyPrices: {
        ...settings.defaultBuyPrices,
        [type]: value,
      },
    });
  }

  function setSell(type: ItemType, value: number) {
    onSettings({
      defaultSellPrices: {
        ...settings.defaultSellPrices,
        [type]: value,
      },
    });
  }

  function updateTier(index: number, patch: Partial<CommissionTier>) {
    const commissionTiers = settings.commissionTiers.map((t, i) =>
      i === index ? { ...t, ...patch } : t,
    );
    onSettings({ commissionTiers });
  }

  function addTier() {
    const last = settings.commissionTiers[settings.commissionTiers.length - 1];
    onSettings({
      commissionTiers: [
        ...settings.commissionTiers,
        {
          minSold: (last?.minSold ?? 0) + 10,
          ratePercent: (last?.ratePercent ?? 10) + 2,
          label: "Nouveau palier",
        },
      ],
    });
  }

  function removeTier(index: number) {
    if (settings.commissionTiers.length <= 1) return;
    onSettings({
      commissionTiers: settings.commissionTiers.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="fade-in">
      <section className="panel">
        <h2 className="section-title">Prix par défaut</h2>
        <p className="section-help">
          Ces valeurs préremplissent les formulaires d’achat et de vente. Vous
          pouvez toujours les modifier ligne par ligne.
        </p>
        <div className="form-grid cols-3">
          {(["haut", "bas", "ensemble"] as ItemType[]).map((type) => (
            <div key={type} className="field">
              <label>
                Achat {type} (€)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={settings.defaultBuyPrices[type]}
                onChange={(e) => setBuy(type, Number(e.target.value))}
              />
            </div>
          ))}
          {(["haut", "bas", "ensemble"] as ItemType[]).map((type) => (
            <div key={`sell-${type}`} className="field">
              <label>
                Revente {type} (€)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={settings.defaultSellPrices[type]}
                onChange={(e) => setSell(type, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Commissions vendeurs</h2>
        <p className="section-help">
          Système progressif : le taux appliqué dépend du nombre total
          d’articles vendus par le vendeur. Choisissez si le pourcentage porte
          sur le chiffre d’affaires ou sur la marge.
        </p>

        <div className="field" style={{ maxWidth: 360, marginBottom: 14 }}>
          <label htmlFor="comm-base">Base de calcul</label>
          <select
            id="comm-base"
            value={settings.commissionBase}
            onChange={(e) =>
              onSettings({
                commissionBase: e.target.value as Settings["commissionBase"],
              })
            }
          >
            <option value="ca">% du chiffre d’affaires</option>
            <option value="marge">% de la marge (CA − coût d’achat)</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Seuil (ventes)</th>
                <th>Taux %</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {settings.commissionTiers.map((tier, index) => (
                <tr key={index}>
                  <td>
                    <input
                      value={tier.label}
                      onChange={(e) =>
                        updateTier(index, { label: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={tier.minSold}
                      onChange={(e) =>
                        updateTier(index, {
                          minSold: Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={tier.ratePercent}
                      onChange={(e) =>
                        updateTier(index, {
                          ratePercent: Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removeTier(index)}
                      disabled={settings.commissionTiers.length <= 1}
                    >
                      Suppr.
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={addTier}>
            Ajouter un palier
          </button>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Données & sauvegarde</h2>
        <p className="section-help">
          Vos données restent dans ce navigateur. Exportez un fichier JSON pour
          sauvegarder ou partager avec votre associé, puis réimportez-le ici.
        </p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={onExport}>
            Exporter la sauvegarde
          </button>
          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
            Importer une sauvegarde
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.target.value = "";
              }}
            />
          </label>
          <button type="button" className="btn btn-danger" onClick={onReset}>
            Tout effacer
          </button>
        </div>
      </section>
    </div>
  );
}
