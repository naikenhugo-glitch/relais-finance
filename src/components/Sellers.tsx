"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  allocationCostBasis,
  centralAvailable,
  computeSellerStats,
  getCommissionRate,
  summarizeAllocationStock,
} from "@/lib/calculations";
import { euro, itemLabel, todayISO, uid } from "@/lib/defaults";
import type { Allocation, AppState, Brand, ItemType, Seller } from "@/lib/types";
import { BRANDS, ITEM_TYPES } from "@/lib/types";

type Props = {
  state: AppState;
  onChange: (updater: (prev: AppState) => AppState) => void;
};

export function Sellers({ state, onChange }: Props) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [brand, setBrand] = useState<Brand>("Essential");
  const [type, setType] = useState<ItemType>("haut");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => computeSellerStats(state), [state]);
  const availableCentral = centralAvailable(state, brand, type);

  function addSeller(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !city.trim()) {
      setError("Indiquez le nom et la ville du vendeur.");
      return;
    }
    const seller: Seller = {
      id: uid(),
      name: name.trim(),
      city: city.trim(),
    };
    onChange((prev) => ({
      ...prev,
      sellers: [...prev.sellers, seller],
    }));
    setName("");
    setCity("");
    setError(null);
    setSellerId(seller.id);
  }

  function removeSeller(id: string) {
    if (
      !window.confirm(
        "Supprimer ce vendeur, ses attributions de stock et ses ventes liées ?",
      )
    ) {
      return;
    }
    onChange((prev) => ({
      ...prev,
      sellers: prev.sellers.filter((s) => s.id !== id),
      allocations: prev.allocations.filter((a) => a.sellerId !== id),
      sales: prev.sales.filter((s) => s.sellerId !== id),
    }));
  }

  function updateSeller(id: string, patch: Partial<Seller>) {
    onChange((prev) => ({
      ...prev,
      sellers: prev.sellers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }

  function allocate(e: FormEvent) {
    e.preventDefault();
    if (!sellerId) {
      setError("Choisissez un vendeur.");
      return;
    }
    if (quantity < 1) {
      setError("Quantité invalide.");
      return;
    }
    if (quantity > availableCentral) {
      setError(
        `Stock central insuffisant (${availableCentral} disponible pour ${brand} / ${itemLabel(type)}).`,
      );
      return;
    }

    const cost = allocationCostBasis(state, brand, type);
    const allocation: Allocation = {
      id: uid(),
      date: todayISO(),
      sellerId,
      brand,
      type,
      quantity,
      unitBuyPrice: cost.unitBuyPrice,
      unitSellPrice: cost.unitSellPrice,
    };

    onChange((prev) => ({
      ...prev,
      allocations: [allocation, ...prev.allocations],
    }));
    setQuantity(1);
    setError(null);
  }

  const sortedTiers = [...state.settings.commissionTiers].sort(
    (a, b) => a.minSold - b.minSold,
  );

  return (
    <div className="fade-in">
      <section className="panel">
        <p className="eyebrow">Étape 2 · Réseau</p>
        <h2 className="section-title">Vendeurs indépendants</h2>
        <p className="section-help">
          Ajoutez un vendeur (ville), donnez-lui une partie du stock, puis
          suivez ses ventes et sa commission automatique.
        </p>

        <div className="split-grid">
          <form onSubmit={addSeller}>
            <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>
              Nouveau vendeur
            </h3>
            <div className="form-grid cols-2">
              <div className="field">
                <label htmlFor="v-name">Prénom / nom</label>
                <input
                  id="v-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Léa"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="v-city">Ville</label>
                <input
                  id="v-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex. Lyon"
                  required
                />
              </div>
            </div>
            <div className="actions">
              <button type="submit" className="btn btn-primary">
                Ajouter le vendeur
              </button>
            </div>
          </form>

          <div>
            <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>
              Système de commission
            </h3>
            <p className="hint" style={{ marginTop: 0 }}>
              Plus un vendeur vend, plus son taux augmente. Base actuelle :{" "}
              <strong>
                {state.settings.commissionBase === "ca"
                  ? "% du chiffre d’affaires"
                  : "% de la marge (CA − coût d’achat)"}
              </strong>
              . Modifiable dans Réglages.
            </p>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Palier</th>
                    <th>À partir de</th>
                    <th>Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTiers.map((t) => (
                    <tr key={`${t.minSold}-${t.ratePercent}`}>
                      <td>{t.label}</td>
                      <td>{t.minSold} ventes</td>
                      <td>{t.ratePercent} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <h2 className="section-title">Attribuer du stock</h2>
        <p className="section-help">
          Transférez des articles de votre stock central vers un vendeur.
        </p>
        {state.sellers.length === 0 ? (
          <div className="empty">Ajoutez d’abord un vendeur.</div>
        ) : (
          <form onSubmit={allocate}>
            <div className="form-grid cols-4">
              <div className="field">
                <label htmlFor="a-seller">Vendeur</label>
                <select
                  id="a-seller"
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                  required
                >
                  <option value="">Choisir…</option>
                  {state.sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="a-brand">Marque</label>
                <select
                  id="a-brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value as Brand)}
                >
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="a-type">Type</label>
                <select
                  id="a-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as ItemType)}
                >
                  {ITEM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="a-qty">Quantité</label>
                <input
                  id="a-qty"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <p className="hint">
              Disponible en stock central pour cette référence :{" "}
              <strong>{availableCentral}</strong>
            </p>
            <div className="actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={availableCentral < 1}
              >
                Attribuer
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="panel">
        <h2 className="section-title">Fiches vendeurs</h2>
        {stats.length === 0 ? (
          <div className="empty">Aucun vendeur pour le moment.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            {stats.map((s) => {
              const stockLines = summarizeAllocationStock(
                state.allocations,
                state.sales,
                s.seller.id,
              );
              const nextTier = sortedTiers.find((t) => t.minSold > s.sold);
              const currentRate = getCommissionRate(
                s.sold,
                state.settings.commissionTiers,
              );

              return (
                <article key={s.seller.id} className="seller-card">
                  <div className="inline-edit" style={{ marginBottom: 8 }}>
                    <input
                      value={s.seller.name}
                      onChange={(e) =>
                        updateSeller(s.seller.id, { name: e.target.value })
                      }
                      aria-label="Nom du vendeur"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.2rem",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        padding: "6px 8px",
                        width: "100%",
                      }}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label>Ville</label>
                    <input
                      value={s.seller.city}
                      onChange={(e) =>
                        updateSeller(s.seller.id, { city: e.target.value })
                      }
                    />
                  </div>

                  <div className="stat-row">
                    <span>Stock attribué</span>
                    <strong>{s.allocated}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Articles vendus</span>
                    <strong>{s.sold}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Articles restants</span>
                    <strong>{s.remaining}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Chiffre d’affaires</span>
                    <strong>{euro(s.revenue)}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Taux actuel</span>
                    <strong>{currentRate} %</strong>
                  </div>
                  <div className="stat-row">
                    <span>Rémunération</span>
                    <strong>{euro(s.commission)}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Bénéfice pour vous</span>
                    <strong>{euro(s.companyProfit)}</strong>
                  </div>

                  {nextTier && (
                    <p className="hint">
                      Encore {nextTier.minSold - s.sold} vente(s) pour passer à{" "}
                      {nextTier.ratePercent} %.
                    </p>
                  )}

                  {stockLines.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <span className="badge">Stock détail</span>
                      <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                        {stockLines.map((line) => (
                          <li key={`${line.brand}-${line.type}`}>
                            {line.brand} · {itemLabel(line.type)} :{" "}
                            {line.remaining}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="actions">
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removeSeller(s.seller.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
