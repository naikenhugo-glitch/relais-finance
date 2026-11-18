"use client";

import {
  computeDashboard,
  computeSellerStats,
  computeStock,
  partnerShares,
} from "@/lib/calculations";
import { euro, itemLabel, percent } from "@/lib/defaults";
import type { AppState } from "@/lib/types";

type NavId =
  | "dashboard"
  | "purchases"
  | "sales"
  | "sellers"
  | "partners"
  | "settings";

export function Dashboard({
  state,
  onNavigate,
}: {
  state: AppState;
  onNavigate?: (id: NavId) => void;
}) {
  const totals = computeDashboard(state);
  const stock = computeStock(state);
  const sellers = computeSellerStats(state);
  const shares = partnerShares(totals.netProfit, state.settings);
  const empty =
    state.orders.length === 0 &&
    state.sales.length === 0 &&
    state.sellers.length === 0;

  return (
    <div className="fade-in">
      <section className="panel hero-panel">
        <p className="eyebrow">Suivi</p>
        <h2 className="section-title">Vue d’ensemble</h2>
        <p className="section-help">
          Ici, tout se calcule tout seul à partir de vos commandes, ventes et
          commissions. Aucun chiffre n’est inventé.
        </p>

        {empty ? (
          <div className="empty start-empty">
            <p>
              Relais est vide pour l’instant — c’est normal. Commencez par votre
              première commande fournisseur.
            </p>
            {onNavigate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigate("purchases")}
              >
                Enregistrer une commande
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="kpi-grid">
              <div className="kpi accent">
                <span className="kpi-label">Chiffre d’affaires</span>
                <div className="kpi-value">{euro(totals.revenueTotal)}</div>
              </div>
              <div className="kpi">
                <span className="kpi-label">Total des achats</span>
                <div className="kpi-value">{euro(totals.purchaseTotal)}</div>
              </div>
              <div className="kpi">
                <span className="kpi-label">Frais de livraison</span>
                <div className="kpi-value">{euro(totals.shippingTotal)}</div>
              </div>
              <div className="kpi">
                <span className="kpi-label">Commissions vendeurs</span>
                <div className="kpi-value">{euro(totals.commissionTotal)}</div>
              </div>
              <div className="kpi">
                <span className="kpi-label">Bénéfice net estimé</span>
                <div
                  className={`kpi-value ${totals.netProfit >= 0 ? "positive" : "negative"}`}
                >
                  {euro(totals.netProfit)}
                </div>
              </div>
              <div className="kpi">
                <span className="kpi-label">Marge nette</span>
                <div className="kpi-value">{percent(totals.marginPercent)}</div>
              </div>
              <div className="kpi">
                <span className="kpi-label">Articles achetés</span>
                <div className="kpi-value">{totals.itemsBought}</div>
              </div>
              <div className="kpi">
                <span className="kpi-label">Articles vendus</span>
                <div className="kpi-value">{totals.itemsSold}</div>
              </div>
            </div>

            <div className="kpi-grid" style={{ marginTop: 12 }}>
              <div className="kpi">
                <span className="kpi-label">Stock restant</span>
                <div className="kpi-value">{totals.stockRemaining} art.</div>
              </div>
              <div className="kpi">
                <span className="kpi-label">Valeur du stock</span>
                <div className="kpi-value">{euro(totals.stockValue)}</div>
              </div>
              <div className="kpi">
                <span className="kpi-label">CA ventes propres</span>
                <div className="kpi-value">{euro(totals.ownRevenue)}</div>
              </div>
              <div className="kpi">
                <span className="kpi-label">CA via vendeurs</span>
                <div className="kpi-value">{euro(totals.sellerRevenue)}</div>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h2 className="section-title">Parts des associés</h2>
        <p className="section-help">
          Après dépenses et commissions : répartition{" "}
          {state.settings.partnerAPercent}/{state.settings.partnerBPercent}.
        </p>
        <div className="kpi-grid">
          <div className="kpi">
            <span className="kpi-label">{state.settings.partnerAName}</span>
            <div className="kpi-value">{euro(shares.a)}</div>
          </div>
          <div className="kpi">
            <span className="kpi-label">{state.settings.partnerBName}</span>
            <div className="kpi-value">{euro(shares.b)}</div>
          </div>
        </div>
        {onNavigate && (
          <div className="actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate("partners")}
            >
              Modifier la répartition
            </button>
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="section-title">Stock disponible</h2>
        <p className="section-help">
          Chez vous + chez les vendeurs, valorisé au prix d’achat moyen.
        </p>
        {stock.length === 0 ? (
          <div className="empty">Aucun mouvement de stock.</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Marque</th>
                  <th>Type</th>
                  <th>Acheté</th>
                  <th>Chez vous</th>
                  <th>Chez vendeurs</th>
                  <th>Total restant</th>
                  <th>Valeur</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((line) => (
                  <tr key={`${line.brand}-${line.type}`}>
                    <td>{line.brand}</td>
                    <td>{itemLabel(line.type)}</td>
                    <td>{line.bought}</td>
                    <td>{line.centralRemaining}</td>
                    <td>{line.sellerRemaining}</td>
                    <td>
                      <strong>{line.totalRemaining}</strong>
                    </td>
                    <td>{euro(line.valueRemaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="section-title">Performance des vendeurs</h2>
        <p className="section-help">
          CA, rémunération et bénéfice restant pour votre business.
        </p>
        {sellers.length === 0 ? (
          <div className="empty">
            Aucun vendeur pour le moment.
            {onNavigate && (
              <>
                {" "}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: 12 }}
                  onClick={() => onNavigate("sellers")}
                >
                  Ajouter un vendeur
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Vendeur</th>
                  <th>Ville</th>
                  <th>Vendus</th>
                  <th>Restants</th>
                  <th>CA</th>
                  <th>Taux</th>
                  <th>Rémunération</th>
                  <th>Bénéfice société</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => (
                  <tr key={s.seller.id}>
                    <td>{s.seller.name}</td>
                    <td>{s.seller.city}</td>
                    <td>{s.sold}</td>
                    <td>{s.remaining}</td>
                    <td>{euro(s.revenue)}</td>
                    <td>{s.commissionRate} %</td>
                    <td>{euro(s.commission)}</td>
                    <td>{euro(s.companyProfit)}</td>
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
