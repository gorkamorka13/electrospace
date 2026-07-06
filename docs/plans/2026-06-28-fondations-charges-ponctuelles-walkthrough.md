# Walkthrough - Phase 1 : Les fondations

Nous avons implémenté avec succès la Phase 1 du projet **electro-web** ! Toutes les fonctionnalités de base du bac à sable des charges ponctuelles sont prêtes et l'application compile sans aucune erreur.

---

## 🛠️ Modifications effectuées

Voici les fichiers créés et configurés dans cette phase :

1. **Calcul Physique** :
   - [src/physics/coulomb.js](file:///c:/wamp64/www/electro-web/src/physics/coulomb.js) : Implémentation pure-JS avec Three.js de la loi de Coulomb et du principe de superposition pour calculer le champ électrique résultant.
2. **Gestion d'État** :
   - [src/store/useStore.js](file:///c:/wamp64/www/electro-web/src/store/useStore.js) : Store Zustand centralisant l'état des charges, de point M et du statut d'interaction drag.
3. **Composants 3D (R3F)** :
   - [src/components/ChargeSphere.jsx](file:///c:/wamp64/www/electro-web/src/components/ChargeSphere.jsx) : Sphères interactives représentant les charges (rouges pour $+q$, bleues pour $-q$) déplaçables à la souris avec `<DragControls>`. Glissement verrouillé sur le plan horizontal (Y = 0.5) pour un meilleur confort d'utilisation.
   - [src/components/TestPoint.jsx](file:///c:/wamp64/www/electro-web/src/components/TestPoint.jsx) : Sphère interactive jaune/blanche représentant le point de test M, également déplaçable avec `<DragControls>` (plan Y = 0.5).
   - [src/components/ElectricFieldArrow.jsx](file:///c:/wamp64/www/electro-web/src/components/ElectricFieldArrow.jsx) : Tracé vectoriel dynamique utilisant l'élément natif `<arrowHelper>` de Three.js. Mis à jour à chaque frame via le hook `useFrame` avec un bridage à `eMax` pour préserver le confort de lecture.
   - [src/components/PhysicsCanvas.jsx](file:///c:/wamp64/www/electro-web/src/components/PhysicsCanvas.jsx) : Intégration globale de la scène 3D (lumières directionnelles/ambiantes, grille, ombres, OrbitControls). Gère la désactivation temporaire de la rotation de caméra pendant le drag.
4. **Interface Utilisateur 2D & Esthétique** :
   - [src/components/Sidebar.jsx](file:///c:/wamp64/www/electro-web/src/components/Sidebar.jsx) : Panneau de contrôle latéral affichant les coordonnées de M, la valeur numérique du champ électrique $\vec{E}_{total}$ ($E_x$, $E_y$, $E_z$ et sa norme), les boutons d'ajout/suppression rapide, et des curseurs individuels pour ajuster les charges.
   - [src/index.css](file:///c:/wamp64/www/electro-web/src/index.css) : Styles globaux en mode sombre néon, typographies soignées (Inter / JetBrains Mono) et barre latérale effet verre dépoli (glassmorphism).
5. **Intégration** :
   - [src/App.jsx](file:///c:/wamp64/www/electro-web/src/App.jsx) : Liaison finale de la Sidebar 2D et du PhysicsCanvas 3D.

---

## 🔬 Validation de la compilation

Le projet a été validé avec succès en exécutant la commande de production :
```bash
npx vite build
```
La compilation a généré les bundles de production dans le dossier `dist/` sans aucune erreur :
- `dist/index.html` (0.46 kB)
- `dist/assets/index-CHcld0En.css` (4.42 kB)
- `dist/assets/index-CaydFu40.js` (1125.03 kB)

---

## 🚀 Comment exécuter le projet localement

Pour démarrer le serveur de développement en local :
1. Ouvrez votre terminal dans le répertoire du projet `c:\wamp64\www\electro-web`.
2. Lancez la commande :
   ```bash
   npm run dev
   ```
3. Ouvrez votre navigateur sur l'adresse locale affichée (généralement `http://localhost:5173`).

---

## 🎨 Guide d'interaction de l'interface

- **Rotation de la caméra** : Cliquez et glissez sur le fond noir de la scène 3D.
- **Déplacement des charges/du point M** : Cliquez sur une sphère et déplacez-la. La caméra est automatiquement verrouillée pour éviter les mouvements intempestifs.
- **Ajustement de la charge** : Utilisez les curseurs de la barre latérale pour ajuster la valeur $q$ d'une charge de $-5$ à $+5$. Vous verrez sa couleur changer dynamiquement en passant par $0$.
- **Calcul en direct** : Regardez la boîte verte du champ électrique $\vec{E}$ dans la barre latérale se mettre à jour au centième près pendant vos déplacements.
