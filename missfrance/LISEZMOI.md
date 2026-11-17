# 👑 Miss France 2027 PickEm

Mini app de pronostics entre amis pour l'élection du samedi 12 décembre 2026 (TF1).
Statique (HTML/CSS/JS), sans serveur ni compte : servie par GitHub Pages avec le reste du dépôt.

Adresse : `https://bcottereau.github.io/menus-semaine/missfrance/`

## Structure

```
missfrance/
├── index.html
├── css/style.css
├── js/app.js          toute la logique (barème en haut du fichier : SCORING)
├── results.json       à remplir le soir de l'élection
├── photos/            portraits à déposer vous-même (alsace.jpg…)
└── data/
    ├── candidates_2027.json
    ├── winners_1920_2026.json
    ├── recent_placements_2022_2026.json
    └── region_stats.json   (référence, non lu par l'app)
```

## Utilisation

1. **Mon pronostic** : saisir un pseudo, puis remplir Miss France, les 4 dauphines et les
   7 autres du Top 12. Toucher une candidate la place dans la prochaine case libre ;
   toucher d'abord une case permet de choisir où ; toucher deux cases les échange.
   Glisser-déposer à la souris, ou après un appui long sur mobile. Déposer une case dans la
   liste des candidates la retire.
2. **Copier le lien** : le Top 12 et le pseudo sont encodés dans l'URL (`#p=…&n=…`).
   Si quelqu'un change d'avis, il renvoie simplement son nouveau lien : celui-ci remplace
   l'ancien pour le même pseudo.
3. **Classement** : ouvrir le lien d'un ami ajoute son pronostic, ou bien coller un ou
   plusieurs liens dans « Ajouter des amis ». Tout est stocké dans le navigateur
   (localStorage).
4. **Candidates** : fiche de chaque candidate (âge, taille, ville, palmarès de la région
   avec les années et les noms, placements de la région sur les 5 dernières éditions).

## Barème

| | Points |
|---|---|
| Bonne Miss France | 10 |
| Dauphine au bon rang | 5 par dauphine |
| Candidate choisie en 6e-12e, qualifiée dans le Top 12 hors Top 5 | 2 |
| Candidate qualifiée dans le Top 12, mais pas au bon rang | 1 |

Maximum 44 pts. Égalité départagée par le nombre de pronostics exacts.
Pendant la soirée, les scores encore incertains sont suivis d'un « ? ».

## Le soir de l'élection

Deux façons de saisir les résultats (l'app accepte une saisie partielle : Top 12 d'abord,
puis les dauphines et la Miss) :

- **Dans l'app** : Classement → « Saisir les résultats (organisateur) ». La saisie reste
  sur l'appareil ; le bouton « Lien des résultats » (`#r=…`) permet de l'envoyer aux amis.
- **Dans `results.json`** : chaque candidate s'écrit par son id (1-31), sa région
  (`"Normandie"`, `"Tahiti"`) ou son nom. L'app relit le fichier toutes les 90 s.
  Une saisie locale prend le pas sur `results.json` (bouton « Revenir à results.json »).

```json
{
  "top12": ["Alsace", "Corse", "Martinique", "Picardie", "Provence", "Lorraine", "Bourgogne"],
  "miss_france": "Normandie",
  "dauphines": ["Guadeloupe", "Tahiti", null, null]
}
```

## Photos

`photo_url` est vide : l'app affiche des initiales. Pour ajouter les portraits officiels
(publiés sur l'Instagram de Miss France environ un mois avant l'élection), déposer les
images dans `photos/` et renseigner par exemple `"photo_url": "photos/alsace.jpg"` dans
`data/candidates_2027.json`. Le champ `instagram` (pseudo) ajoute un lien dans la fiche.

## Données à vérifier

- Mandy Goudal (37 ou 38 ans) et Juliette Gauthier (22 ou 23 ans) : les sources divergent.
- Languedoc : 3 titres = Languedoc-Roussillon 1929 et 1971 + Languedoc 2006
  (la fiche le précise). Tahiti reprend l'historique de la Polynésie française.

## Tester en local

```bash
cd missfrance && python3 -m http.server 8000
```
puis ouvrir http://localhost:8000 (ouvrir le fichier directement ne permet pas de lire les JSON).
