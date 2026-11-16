# 🥕 Menus de la semaine

Application web pour planifier nos dîners et générer la liste de courses.
Pas de serveur : HTML, CSS et JavaScript, hébergés gratuitement sur GitHub Pages,
avec des données synchronisées entre le Mac et le téléphone via un dépôt GitHub privé.

## Structure

```
menus-semaine/          (dépôt public → GitHub Pages)
├── index.html          page unique (6 onglets)
├── css/style.css       styles mobile d'abord + mode sombre automatique
├── js/recipes.js       recettes de départ, rayons, catégories
├── js/storage.js       sauvegarde locale + fusion entre appareils
├── js/sync.js          synchronisation avec le dépôt privé (API GitHub)
└── js/app.js           logique de l'application

menus-donnees/          (dépôt privé → données)
├── menus.json          toutes les données (créé par l'application)
├── ajouter-recette.mjs script utilisé par Claude pour ajouter des recettes
└── CLAUDE.md           format des recettes et procédure
```

## Compatibilité

- **Mac** : Safari 15.4+ (macOS Monterey ou plus récent), Chrome, Firefox, Edge.
- **iPhone** : iOS 15.4+. **Android** : Chrome récent.

## Ouvrir l'application

Adresse (une fois GitHub Pages activé) : `https://bcottereau.github.io/menus-semaine/`

- **Mac** : ouvrir l'adresse dans Safari. Pour l'avoir dans le Dock : Safari → Fichier →
  « Ajouter au Dock ».
- **iPhone** : ouvrir l'adresse dans Safari → bouton Partager → « Sur l'écran d'accueil ».

Ouvrir directement `index.html` depuis le Finder fonctionne aussi, mais sans le
« lien de configuration » du téléphone (voir ci-dessous).

## Activer la synchronisation (une seule fois)

1. Sur github.com : avatar → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
   - Nom : `menus` ; expiration : 1 an (à renouveler) ;
   - *Repository access* : **Only select repositories** → `menus-donnees` ;
   - *Permissions* → *Repository permissions* → **Contents : Read and write**.
   - Copier la clé `github_pat_…`.
2. Sur le Mac, dans l'appli : bouton **☁️** en haut → renseigner le compte, le dépôt
   `menus-donnees` et la clé → **Enregistrer et synchroniser**.
3. Toujours dans ☁️ : **Copier le lien de configuration**, l'envoyer au téléphone
   (AirDrop ou Notes) et l'ouvrir dans Safari : le téléphone est configuré.

L'indicateur ☁️ montre l'état : ✓ synchronisé, … en attente, ⟳ en cours,
✕ hors ligne (envoi au retour du réseau), ⚠️ problème (toucher pour le détail).

La synchro est automatique : quelques secondes après chaque modification, à
l'ouverture de l'appli, au retour sur l'onglet, et toutes les 2 minutes.
Les modifications faites en même temps sur les deux appareils sont fusionnées
(jour par jour, case par case, recette par recette).

**Sécurité** : la clé reste uniquement dans le navigateur de chaque appareil. Elle ne
donne accès qu'au dépôt de données. Le lien de configuration contient la clé : ne le
partagez avec personne. En cas de doute, supprimez la clé sur GitHub et créez-en une
nouvelle.

## Ajouter des recettes trouvées ailleurs (Instagram, livre…)

- **Via Claude** : envoyez le lien, et idéalement le texte de la légende ou des
  captures d'écran. Claude met la recette au format de l'appli (3 portions, rayons,
  Cookeo…) et l'ajoute dans `menus-donnees`. Elle apparaît sur les deux appareils
  à la synchro suivante.
- **Sans accès GitHub** : Claude vous donne un bloc JSON → onglet Recettes →
  **📥 Coller une recette**.
- **À la main** : Recettes → **＋ Nouvelle recette** (champ « Source » pour le lien).

La catégorie **Bases & pâtes** (pâte brisée, pâte à crêpes…) sert aux préparations
de base : elles ne sont pas proposées comme dîner.

## Utilisation au fil de la semaine

- **Dimanche soir** (Semaine) : la semaine suivante s'affiche. Choisir un dîner par
  jour (filtres saison / catégorie / végé ou viande / Cookeo) ou « ✨ Compléter les jours vides ».
- **Lundi** (Courses) : liste par rayon avec cases à cocher ; copier / partager / .txt.
  « Ranger les articles cochés au garde-manger » après les courses.
- **Chaque soir** : « Marquer cuisiné » déduit les ingrédients du garde-manger
  (farine T45 1 kg → 800 g après une quiche).
- **Placard** : sans quantité = « en stock » ; avec quantité = décompté.
- **Idées** : recettes réalisables avec ce qu'il y a à la maison.
- **Historique** : semaines passées, recettes à refaire, sauvegarde JSON.
