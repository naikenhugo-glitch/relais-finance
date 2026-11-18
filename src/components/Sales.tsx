"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  allocationCostBasis,
  centralAvailable,
  sellerAvailable,
  suggestSellPrice,
} from "@/lib/calculations";
import { euro, todayISO, uid } from "@/lib/defaults";
import type { AppState, Brand, ItemType, Sale } from "@/lib/types";
import { BRANDS, ITEM_TYPES } from "@/lib/types";

type Props = {
  state: AppState;
  onChange: (updater: (prev: AppState) => AppState) => void;
};

export function Sales({ state, onChange }: Props) {
  const [date, setDate] = useState(todayISO());
  const [brand, setBrand] = useState<Brand>("Essential");
  const [type, setType] = useState<ItemType>("haut");
  const [quantity, setQuantity] = useState(1);
  const [unitSalePrice, setUnitSalePrice] = useState(
    state.settings.defaultSellPrices.haut,
  );
  const [sellerId, setSellerId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const available = useMemo(() => {
    if (sellerId) {
      return sellerAvailable(state, sellerId, brand, type);
    }
    return centralAvailable(state, brand, type);
  }, [state, sellerId, brand, type]);

  const cost = useMemo(
    () => allocationCostBasis(state, brand, type),
    [state, brand, type],
  );

  function onTypeChange(next: ItemType) {
    setType(next);
    setUnitSalePrice(suggestSellPrice(state.settings, next));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (quantity < 1) {
      setError("Indiquez au moins 1 article.");
      return;
    }
    if (quantity > available) {
      setError(
        sellerId
          ? `Ce vendeur n’a que ${available} article(s) de ce type en stock.`
          : `Stock central insuffisant (${available} disponible).`,
      );
      return;
    }

    const sale: Sale = {
      id: uid(),
      date,
      brand,
      type,
      quantity,
      unitSalePrice,
      unitBuyPrice: cost.unitBuyPrice,
      sellerId: sellerId || null,
    };

    onChange((prev) => ({
      ...prev,
      sales: [sale, ...prev.sales],
    }));
    setError(null);
    setQuantity(1);
  }

  function updateSale(id: string, patch: Partial<Sale>) {
    onChange((prev) => ({
      ...prev,
      sales: prev.sales.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }

  function removeSale(id: string) {
    if (!window.confirm("Supprimer cette vente ?")) return;
    onChange((prev) => ({
      ...prev,
      sales: prev.sales.filter((s) => s.id !== id),
    }));
  }

  function sellerName(id: string | null) {
    if (!id) return "Vente propre";
    return state.sellers.find((s) => s.id === id)?.name ?? "Vendeur";
  }

  return (
    <div className="fade-in">
      <section className="panel">
        <p className="eyebrow">Étape 2 · Sorties</p>
        <h2 className="section-title">Enregistrer une vente</h2>
        <p className="section-help">
          Vendez depuis votre stock (après une commande), ou notez une vente
          faite par un vendeur — après lui avoir attribué du stock.
        </p>

        <form onSubmit={onSubmit}>
          <div className="form-grid cols-3">
            <div className="field">
              <label htmlFor="s-date">Date</label>
              <input
                id="s-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="s-who">Qui vend ?</label>
              <select
                id="s-who"
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
              >
                <option value="">Nous (vente propre)</option>
                {state.sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.city}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-brand">Marque</label>
              <select
                id="s-brand"
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
              <label htmlFor="s-type">Type</label>
              <select
                id="s-type"
                value={type}
                onChange={(e) => onTypeChange(e.target.value as ItemType)}
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-qty">Quantité</label>
              <input
                id="s-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="s-price">Prix de vente unitaire (€)</label>
              <input
                id="s-price"
                type="number"
                min={0}
                step={0.01}
                value={unitSalePrice}
                onChange={(e) => setUnitSalePrice(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <p className="hint">
            Stock disponible : <strong>{available}</strong> · Coût d’achat
            estimé : <strong>{euro(cost.unitBuyPrice)}</strong> · CA de cette
            vente : <strong>{euro(quantity * unitSalePrice)}</strong>
          </p>
          {error && <p className="error">{error}</p>}

          <div className="actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={available < 1}
            >
              Enregistrer la vente
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="section-title">Historique des ventes</h2>
        <p className="section-help">
          Toutes les ventes — propres ou via vendeurs. Modifiables à tout
          moment.
        </p>
        {state.sales.length === 0 ? (
          <div className="empty">Aucune vente enregistrée.</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Canal</th>
                  <th>Marque</th>
                  <th>Type</th>
                  <th>Qté</th>
                  <th>Prix vente</th>
                  <th>Coût achat</th>
                  <th>CA</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <input
                        type="date"
                        value={sale.date}
                        onChange={(e) =>
                          updateSale(sale.id, { date: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <select
                        value={sale.sellerId ?? ""}
                        onChange={(e) =>
                          updateSale(sale.id, {
                            sellerId: e.target.value || null,
                          })
                        }
                      >
                        <option value="">Vente propre</option>
                        {state.sellers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={sale.brand}
                        onChange={(e) =>
                          updateSale(sale.id, {
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
                        value={sale.type}
                        onChange={(e) =>
                          updateSale(sale.id, {
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
                        value={sale.quantity}
                        onChange={(e) =>
                          updateSale(sale.id, {
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
                        value={sale.unitSalePrice}
                        onChange={(e) =>
                          updateSale(sale.id, {
                            unitSalePrice: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={sale.unitBuyPrice}
                        onChange={(e) =>
                          updateSale(sale.id, {
                            unitBuyPrice: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      {euro(sale.quantity * sale.unitSalePrice)}
                      <div className="hint" style={{ margin: 0 }}>
                        {sellerName(sale.sellerId)}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => removeSale(sale.id)}
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
      </section>
    </div>
  );
}
