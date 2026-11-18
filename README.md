# Relais — gestion financière achat-revente

Outil simple pour suivre les achats, ventes, stock, vendeurs indépendants et la répartition des bénéfices (Essential, Ralph Lauren, Alo).

## Version en ligne

Après déploiement GitHub Pages :  
[https://naikenhugo-glitch.github.io/relais-finance/](https://naikenhugo-glitch.github.io/relais-finance/)

Les données restent dans **votre navigateur** (localStorage). Utilisez **Réglages → Exporter / Importer** pour sauvegarder ou partager avec votre associé.

## Utilisation en local

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Sections

1. **Vue d’ensemble** — CA, achats, livraisons, commissions, bénéfice net, stock
2. **Commandes** — achats fournisseur multi-marques (min. 5 articles au total)
3. **Ventes** — ventes propres ou via vendeurs
4. **Vendeurs** — stock attribué, commissions progressives
5. **Associés** — répartition des bénéfices (50/50 par défaut)
6. **Paramètres** — prix, paliers de commission, sauvegarde

Aucune donnée fictive n’est préchargée.
