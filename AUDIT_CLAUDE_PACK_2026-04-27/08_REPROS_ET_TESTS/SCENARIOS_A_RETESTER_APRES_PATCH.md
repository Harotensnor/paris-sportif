# Scenarios a retester apres patch

Ce fichier sert de mini check-list de non-regression.

## Recos et cotes

- Une reco user avec cote Winamax exacte reste visible.
- Une reco user sans cote Winamax exacte est masquee ou marquee selon decision produit.
- L'agent autonome ne mise pas sur un event sans cote exacte si cette regle est retenue.
- La page Sante affiche un warning si une reco actionnable utilise un fallback externe.

## Navigation

- `#dashboard`, `#top`, `#locks`, `#tous`, `#calendrier`, `#bilan`, `#profil`, `#sante` ouvrent la bonne vue.
- Cliquer dans la navigation met a jour l'URL.
- Refresh conserve la bonne page.
- Back/forward navigateur fonctionnent.

## Modal detail

- Ouvrir detail depuis dashboard.
- Ouvrir detail depuis `Tous`.
- Ouvrir detail depuis `Top`.
- Fermer avec `Esc`.
- Fermer avec bouton.
- Focus clavier logique.
- Onglets accessibles si la refonte est faite.
- Cote affichee avec source claire.

## Mobile

- Dashboard 390 px sans scroll horizontal.
- Drawer hamburger au-dessus de la bottom nav, ou bottom nav masquee.
- Pilule live ne cache pas les CTA.
- Bottom nav fonctionne apres ouverture/fermeture drawer.

## Donnees speciales

- `RETIRED` ne fausse pas le bilan.
- `WALKOVER` ne fausse pas le bilan.
- Event sans competitors n'affiche pas `undefined`.
- Score null affiche un etat propre.

## PWA/cache

- Premier chargement OK.
- Hard refresh OK.
- Service worker installe sans erreur console.
- `data.js` / `data_today.json` pas charges en double inutilement.
- Version cache bumpee si assets UI modifies.

