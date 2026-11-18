"use client";

import { FormEvent, useMemo, useState } from "react";
import { validateOrderQuantity } from "@/lib/calculations";
import { euro, itemLabel, todayISO, uid } from "@/lib/defaults";
import {
  createEmptyLine,
  orderBuyTotal,
  orderGrandTotal,
  orderQuantity,
} from "@/lib/orders";
import type {
  AppState,
  Brand,
  ItemType,
  Order,
  OrderLine,
} from "@/lib/types";
import { BRANDS, ITEM_TYPES } from "@/lib/types";

type Props = {
  state: AppState;
  onChange: (updater: (prev: AppState) => AppState) => void;
};

function blankDraft(settings: AppState["settings"]): {
  date: string;
  shippingCost: number;
  lines: OrderLine[];
} {
  return {
    date: todayISO(),
    shippingCost: 0,
    lines: [
      createEmptyLine(settings, "Essential", "haut"),
      createEmptyLine(settings, "Ralph Lauren", "bas"),
    ],
  };
}

export function Purchases({ state, onChange }: Props) {
  const [draft, setDraft] = useState(() => blankDraft(state.settings));
  const [error, setError] = useState<string | null>(null);

  const draftOrder = useMemo<Order>(
    () => ({
      id: "draft",
      date: draft.date,
      shippingCost: draft.shippingCost,
      lines: draft.lines,
    }),
    [draft],
  );
  const totalQty = useMemo(() => orderQuantity(draftOrder), [draftOrder]);
  const buyTotal = useMemo(() => orderBuyTotal(draftOrder), [draftOrder]);

  function updateLine(id: string, patch: Partial<OrderLine>) {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => {
        if (line.id !== id) return line;
        const next = { ...line, ...patch };
        if (patch.type) {
          next.unitBuyPrice = state.settings.defaultBuyPrices[patch.type];
          next.unitSellPrice = state.settings.defaultSellPrices[patch.type];
        }
        return next;
      }),
    }));
  }

  function addLine() {
    setDraft((prev) => ({
      ...prev,
      lines: [...prev.lines, createEmptyLine(state.settings, "Alo", "haut")],
    }));
  }

  function removeLine(id: string) {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.length <= 1 ? prev.lines : prev.lines.filter((l) => l.id !== id),
    }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (draft.lines.length === 0) {
      setError("Ajoutez au moins une ligne d’article.");
      return;
    }
    for (const line of draft.lines) {
      if (!line.quantity || line.quantity < 1) {
        setError("Chaque ligne doit avoir une quantité d’au moins 1.");
        return;
      }
      if (line.unitBuyPrice < 0 || line.unitSellPrice < 0) {
        setError("Les prix ne peuvent pas être négatifs.");
        return;
      }
    }
    const qtyError = validateOrderQuantity(totalQty);
    if (qtyError) {
      setError(qtyError);
      return;
    }
    if (draft.shippingCost < 0) {
      setError("Les frais de livraison ne peuvent pas être négatifs.");
      return;
    }

    const order: Order = {
      id: uid(),
      date: draft.date,
      shippingCost: draft.shippingCost,
      lines: draft.lines.map((l) => ({ ...l, id: l.id || uid() })),
    };

    onChange((prev) => ({
      ...prev,
      orders: [order, ...prev.orders],
    }));
    setError(null);
    setDraft(blankDraft(state.settings));
  }

  function updateOrder(id: string, patch: Partial<Order>) {
    onChange((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  }

  function updateOrderLine(
    orderId: string,
    lineId: string,
    patch: Partial<OrderLine>,
  ) {
    onChange((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          lines: o.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
        };
      }),
    }));
  }

  function addOrderLine(orderId: string) {
    onChange((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              lines: [...o.lines, createEmptyLine(prev.settings, "Essential", "haut")],
            }
          : o,
      ),
    }));
  }

  function removeOrderLine(orderId: string, lineId: string) {
    onChange((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => {
        if (o.id !== orderId) return o;
        if (o.lines.length <= 1) return o;
        return { ...o, lines: o.lines.filter((l) => l.id !== lineId) };
      }),
    }));
  }

  function removeOrder(id: string) {
    if (!window.confirm("Supprimer toute cette commande fournisseur ?")) return;
    onChange((prev) => ({
      ...prev,
      orders: prev.orders.filter((o) => o.id !== id),
    }));
  }

  return (
    <div className="fade-in">
      <section className="panel">
        <p className="eyebrow">Étape 1 · Fournisseur</p>
        <h2 className="section-title">Nouvelle commande</h2>
        <p className="section-help">
          Une commande = un envoi fournisseur. Vous pouvez mélanger Essential,
          Ralph Lauren et Alo dans la même commande. Minimum 5 articles au
          total. Les frais de livraison sont saisis une seule fois.
        </p>

        <form onSubmit={onSubmit}>
          <div className="form-grid cols-2" style={{ marginBottom: 14 }}>
            <div className="field">
              <label htmlFor="o-date">Date de commande</label>
              <input
                id="o-date"
                type="date"
                value={draft.date}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, date: e.target.value }))
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="o-ship">Frais de livraison (€)</label>
              <input
                id="o-ship"
                type="number"
                min={0}
                step={0.01}
                value={draft.shippingCost}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    shippingCost: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="line-stack">
            {draft.lines.map((line, index) => (
              <div key={line.id} className="line-row">
                <div className="line-index">{index + 1}</div>
                <div className="form-grid cols-5 line-fields">
                  <div className="field">
                    <label>Marque</label>
                    <select
                      value={line.brand}
                      onChange={(e) =>
                        updateLine(line.id, {
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
                  </div>
                  <div className="field">
                    <label>Type</label>
                    <select
                      value={line.type}
                      onChange={(e) =>
                        updateLine(line.id, {
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
                  </div>
                  <div className="field">
                    <label>Quantité</label>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.id, {
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Achat / u. (€)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unitBuyPrice}
                      onChange={(e) =>
                        updateLine(line.id, {
                          unitBuyPrice: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Revente prévue (€)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unitSellPrice}
                      onChange={(e) =>
                        updateLine(line.id, {
                          unitSellPrice: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost line-remove"
                  onClick={() => removeLine(line.id)}
                  disabled={draft.lines.length <= 1}
                  aria-label="Retirer la ligne"
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>

          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={addLine}>
              + Ajouter une marque / un article
            </button>
          </div>

          <div className="order-summary">
            <div>
              <span className="kpi-label">Articles</span>
              <strong>{totalQty}</strong>
              {totalQty < 5 && (
                <span className="hint"> · encore {5 - totalQty} pour le minimum</span>
              )}
            </div>
            <div>
              <span className="kpi-label">Achat articles</span>
              <strong>{euro(buyTotal)}</strong>
            </div>
            <div>
              <span className="kpi-label">Total avec livraison</span>
              <strong>{euro(buyTotal + draft.shippingCost)}</strong>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="actions">
            <button type="submit" className="btn btn-primary">
              Enregistrer la commande
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="section-title">Commandes enregistrées</h2>
        <p className="section-help">
          Chaque carte = une commande complète. Vous pouvez encore modifier les
          lignes, ajouter une marque, ou corriger la livraison.
        </p>

        {state.orders.length === 0 ? (
          <div className="empty">
            Aucune commande pour l’instant. Commencez par en ajouter une
            ci-dessus.
          </div>
        ) : (
          <div className="order-list">
            {state.orders.map((order) => (
              <article key={order.id} className="order-card">
                <div className="order-card-head">
                  <div>
                    <p className="eyebrow">Commande</p>
                    <h3>
                      {new Date(order.date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </h3>
                  </div>
                  <div className="order-card-totals">
                    <span>{orderQuantity(order)} art.</span>
                    <strong>{euro(orderGrandTotal(order))}</strong>
                  </div>
                </div>

                <div className="form-grid cols-2" style={{ marginBottom: 12 }}>
                  <div className="field">
                    <label>Date</label>
                    <input
                      type="date"
                      value={order.date}
                      onChange={(e) =>
                        updateOrder(order.id, { date: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Livraison (€)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={order.shippingCost}
                      onChange={(e) =>
                        updateOrder(order.id, {
                          shippingCost: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="line-stack compact">
                  {order.lines.map((line) => (
                    <div key={line.id} className="line-row compact">
                      <div className="form-grid cols-5 line-fields">
                        <div className="field">
                          <label>Marque</label>
                          <select
                            value={line.brand}
                            onChange={(e) =>
                              updateOrderLine(order.id, line.id, {
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
                        </div>
                        <div className="field">
                          <label>Type</label>
                          <select
                            value={line.type}
                            onChange={(e) =>
                              updateOrderLine(order.id, line.id, {
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
                        </div>
                        <div className="field">
                          <label>Qté</label>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateOrderLine(order.id, line.id, {
                                quantity: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="field">
                          <label>Achat</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={line.unitBuyPrice}
                            onChange={(e) =>
                              updateOrderLine(order.id, line.id, {
                                unitBuyPrice: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="field">
                          <label>Revente</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={line.unitSellPrice}
                            onChange={(e) =>
                              updateOrderLine(order.id, line.id, {
                                unitSellPrice: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeOrderLine(order.id, line.id)}
                        disabled={order.lines.length <= 1}
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>

                <p className="hint">
                  Sous-total articles {euro(orderBuyTotal(order))} · Marques :{" "}
                  {[...new Set(order.lines.map((l) => l.brand))].join(", ")} ·{" "}
                  {order.lines
                    .map((l) => `${l.quantity} ${itemLabel(l.type)}`)
                    .join(" · ")}
                </p>

                <div className="actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => addOrderLine(order.id)}
                  >
                    + Ligne
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => removeOrder(order.id)}
                  >
                    Supprimer la commande
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
