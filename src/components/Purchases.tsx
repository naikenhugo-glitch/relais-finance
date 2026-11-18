"use client";

import { FormEvent, useState } from "react";
import {
  suggestBuyPrice,
  suggestSellPrice,
  validatePurchaseQuantity,
} from "@/lib/calculations";
import { euro, itemLabel, todayISO, uid } from "@/lib/defaults";
import type { AppState, Brand, ItemType, Purchase } from "@/lib/types";
import { BRANDS, ITEM_TYPES } from "@/lib/types";

type Props = {
  state: AppState;
  onChange: (updater: (prev: AppState) => AppState) => void;
};

export function Purchases({ state, onChange }: Props) {
  const [brand, setBrand] = useState<Brand>("Essential");
  const [type, setType] = useState<ItemType>("haut");
  const [quantity, setQuantity] = useState(5);
  const [unitBuyPrice, setUnitBuyPrice] = useState(
    state.settings.defaultBuyPrices.haut,
  );
  const [shippingCost, setShippingCost] = useState(0);
  const [unitSellPrice, setUnitSellPrice] = useState(
    state.settings.defaultSellPrices.haut,
  );
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  function applyTypeDefaults(next: ItemType) {
    setType(next);
    setUnitBuyPrice(suggestBuyPrice(state.settings, next));
    setUnitSellPrice(suggestSellPrice(state.settings, next));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const qtyError = validatePurchaseQuantity(quantity);
    if (qtyError) {
      setError(qtyError);
      return;
    }
    if (unitBuyPrice < 0 || unitSellPrice < 0 || shippingCost < 0) {
      setError("Les montants ne peuvent pas être négatifs.");
      return;
    }

    const purchase: Purchase = {
      id: uid(),
      date,
      brand,
      type,
      quantity,
      unitBuyPrice,
      shippingCost,
      unitSellPrice,
    };

    onChange((prev) => ({
      ...prev,
      purchases: [purchase, ...prev.purchases],
    }));
    setError(null);
    setQuantity(5);
    setShippingCost(0);
  }

  function updatePurchase(id: string, patch: Partial<Purchase>) {
    onChange((prev) => ({
      ...prev,
      purchases: prev.purchases.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    }));
  }

  function removePurchase(id: string) {
    if (!window.confirm("Supprimer cette commande d’achat ?")) return;
    onChange((prev) => ({
      ...prev,
      purchases: prev.purchases.filter((p) => p.id !== id),
    }));
  }

  return (
    <div className="fade-in">
      <section className="panel">
        <h2 className="section-title">Nouvelle commande fournisseur</h2>
        <p className="section-help">
          Enregistrez un achat Essential, Ralph Lauren ou Alo. Minimum 5
          articles. Les prix d’achat par défaut sont 35 € (haut), 30 € (bas),
          65 € (ensemble) — tout est modifiable.
        </p>

        <form onSubmit={onSubmit}>
          <div className="form-grid cols-3">
            <div className="field">
              <label htmlFor="p-date">Date</label>
              <input
                id="p-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="p-brand">Marque</label>
              <select
                id="p-brand"
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
              <label htmlFor="p-type">Type d’article</label>
              <select
                id="p-type"
                value={type}
                onChange={(e) => applyTypeDefaults(e.target.value as ItemType)}
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="p-qty">Quantité</label>
              <input
                id="p-qty"
                type="number"
                min={5}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="p-buy">Prix d’achat unitaire (€)</label>
              <input
                id="p-buy"
                type="number"
                min={0}
                step={0.01}
                value={unitBuyPrice}
                onChange={(e) => setUnitBuyPrice(Number(e.target.value))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="p-sell">Prix de revente prévu (€)</label>
              <input
                id="p-sell"
                type="number"
                min={0}
                step={0.01}
                value={unitSellPrice}
                onChange={(e) => setUnitSellPrice(Number(e.target.value))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="p-ship">Frais de livraison (€)</label>
              <input
                id="p-ship"
                type="number"
                min={0}
                step={0.01}
                value={shippingCost}
                onChange={(e) => setShippingCost(Number(e.target.value))}
              />
            </div>
          </div>

          <p className="hint">
            Total articles :{" "}
            <strong>{euro(quantity * unitBuyPrice + shippingCost)}</strong>{" "}
            (achat {euro(quantity * unitBuyPrice)} + livraison{" "}
            {euro(shippingCost)})
          </p>

          {error && <p className="error">{error}</p>}

          <div className="actions">
            <button type="submit" className="btn btn-primary">
              Ajouter la commande
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="section-title">Historique des achats</h2>
        <p className="section-help">
          Modifiez n’importe quel montant ou quantité — les totaux du tableau
          de bord se recalculent tout seuls.
        </p>

        {state.purchases.length === 0 ? (
          <div className="empty">Aucune commande enregistrée.</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Marque</th>
                  <th>Type</th>
                  <th>Qté</th>
                  <th>Achat / u.</th>
                  <th>Revente / u.</th>
                  <th>Livraison</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.purchases.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input
                        type="date"
                        value={p.date}
                        onChange={(e) =>
                          updatePurchase(p.id, { date: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <select
                        value={p.brand}
                        onChange={(e) =>
                          updatePurchase(p.id, {
                            brand: e.target.value as Brand,
                          })
                        }
                      >
                        {BRANDS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={p.type}
                        onChange={(e) =>
                          updatePurchase(p.id, {
                            type: e.target.value as ItemType,
                          })
                        }
                      >
                        {ITEM_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        value={p.quantity}
                        onChange={(e) =>
                          updatePurchase(p.id, {
                            quantity: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={p.unitBuyPrice}
                        onChange={(e) =>
                          updatePurchase(p.id, {
                            unitBuyPrice: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={p.unitSellPrice}
                        onChange={(e) =>
                          updatePurchase(p.id, {
                            unitSellPrice: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={p.shippingCost}
                        onChange={(e) =>
                          updatePurchase(p.id, {
                            shippingCost: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      {euro(p.quantity * p.unitBuyPrice + p.shippingCost)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => removePurchase(p.id)}
                      >
                        Suppr.
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {state.purchases.some((p) => p.quantity < 5) && (
          <p className="hint">
            Astuce : une ligne ci-dessous a moins de 5 articles. Le fournisseur
            exige normalement un minimum de 5 — vous pouvez corriger la
            quantité.
          </p>
        )}
        {state.purchases.length > 0 && (
          <p className="hint" style={{ marginTop: 12 }}>
            Libellés : {ITEM_TYPES.map((t) => itemLabel(t.value)).join(" · ")}
          </p>
        )}
      </section>
    </div>
  );
}
