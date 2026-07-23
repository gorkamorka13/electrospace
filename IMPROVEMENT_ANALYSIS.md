# ElectroSpace — Analyse d'Amélioration Technique & Fonctionnelle

> **Auteur** : Antigravity (AI Software Engineering Review)  
> **Date** : 2026-07-23  
> **Version analysée** : v1.3 (stack Vite + React + Three.js + Zustand + KaTeX)

---

## Vue d'ensemble de l'application

ElectroSpace est une plateforme pédagogique interactive dédiée à l'électrostatique (niveau CPGE/Licence). Elle repose sur :

- **3D temps réel** via `@react-three/fiber` (Three.js)
- **Physique analytique** : loi de Coulomb, théorème de Gauss, distributions continues (sphère, cylindre, plan, disque, anneau, boîte)
- **Compagnon de Gauss** en 5 étapes avec rendu LaTeX via KaTeX CDN
- **État global** Zustand avec historique undo/redo
- **Graphiques 2D** Canvas natif (E(x), V(x))

---

## 🔴 PRIORITÉ 1 — Bugs & Problèmes Critiques

### 1.1 Géométries Three.js recréées à chaque render

**Fichier** : `GaussianSurfaceVis.jsx` (ligne ~136)

```jsx
// Problème actuel : new THREE.SphereGeometry() instancié dans le JSX sans useMemo
<edgesGeometry args={[new THREE.SphereGeometry(gaussSurfaceRadius, 16, 16)]} />
```

Chaque re-render recrée des objets WebGL coûteux. Sur une interaction continue (déplacement du point M), cela provoque des fuites mémoire et des ralentissements.

**Solution** : Utiliser `useMemo` ou `useRef` pour mémoïser les géométries dérivées, ou supprimer l'argument `new THREE.*` en faveur du pattern `args={[...]}` natif de R3F.

---

### 1.2 `updateChargePosition` pousse dans l'historique à chaque frame de drag

**Fichier** : `useStore.js` (ligne ~371)

```js
updateChargePosition: (id, position) => {
  get().pushHistory() // Déclenché à 60fps pendant le drag !
  ...
}
```

Un drag de 2 secondes peut pousser **120 snapshots** dans l'historique (MAX_HISTORY = 50), saturant immédiatement le buffer et rendant `undo` inutilisable.

**Solution** : Ne pousher dans l'historique qu'au `pointerup` (fin de drag), pas à chaque frame de mouvement.

---

### 1.3 `GaussianSurfaceVis` ignoré silencieusement quand des charges ponctuelles sont présentes

**Fichier** : `GaussianSurfaceVis.jsx` (ligne ~21)

```jsx
if (!showGaussCompanion || charges.length > 0) return null
```

Si l'utilisateur a une charge ponctuelle + active le Compagnon Gauss, **la visualisation 3D disparaît sans aucun message d'explication**. Très confusant.

**Solution** : Afficher un bandeau d'avertissement plutôt que masquer silencieusement.

---

### 1.4 Calcul sur le thread principal (boucle de 300 samples dans `FieldGraph`)

**Fichier** : `FieldGraph.jsx` (ligne ~142)

```js
for (let i = 0; i < SAMPLES; i++) {
  const E = calculateTotalField(...) // 300 appels synchrones
}
```

Pour des distributions complexes, cette boucle s'exécute dans le thread UI et peut bloquer le rendu 3D.

**Solution** : Déporter le calcul dans un **Web Worker** dédié ou throttler avec `requestIdleCallback`.

---

## 🟠 PRIORITÉ 2 — Améliorations Fonctionnelles Majeures

### 2.1 Manque d'un mode "Quiz / Auto-évaluation"

Le Compagnon de Gauss est purement passif : il affiche les formules mais ne demande jamais à l'étudiant de répondre.

**Amélioration proposée** :
- À chaque étape du Wizard, proposer une **question à choix multiples** ou un **champ de saisie libre** (ex : "Quelle est la valeur de Q_int ?")
- Comparer avec la valeur calculée et fournir un feedback visuel (✅ / ❌ avec explication KaTeX)
- Ajouter un **score de session** affiché dans la sidebar

---

### 2.2 Pas de visualisation de la densité de flux sur la surface de Gauss

Actuellement, la surface de Gauss (étape 3) est un maillage semi-transparent statique uniforme.

**Amélioration proposée** :
- Colorier dynamiquement chaque patch de la surface selon la valeur de **E · dS** (rouge = flux sortant, bleu = flux entrant, gris = nul)
- Technique : `ShaderMaterial` avec texture calculée selon la position du point M
- Impact pédagogique massif : rend le théorème de Gauss visuellement immédiat

---

### 2.3 Graphiques 2D non exportables

Les graphiques `FieldGraph` et `PotentialXGraph` sont des Canvas HTML non exportables.

**Amélioration proposée** :
- Bouton **"Exporter PNG"** (`canvas.toDataURL('image/png')`)
- Bouton **"Copier CSV"** des points `{t, val}` pour usage dans un tableur

---

### 2.4 Absence de comparaison entre distributions

L'état global ne supporte qu'une seule distribution active à la fois (`distributions[0]`).

**Amélioration proposée** :
- Permettre d'afficher **deux distributions simultanément** (ex : sphère pleine vs sphère creuse)
- Superposer leurs graphiques E(r) avec des couleurs différentes
- Cas pédagogique fort : visualiser la discontinuité de E à l'interface d'un conducteur

---

### 2.5 Aucun intégrateur numérique réel pour les trajectoires

L'état `freeCharges` existe mais le comportement dynamique est limité (pas de RK4).

**Amélioration proposée** :
- Implémenter un intégrateur **Runge-Kutta 4** pour la trajectoire d'une charge test sous E
- Contrôles : masse de la charge test, vitesse initiale, pas de temps dt
- Visualisation des trajectoires avec trails colorés selon la vitesse (heatmap)

---

### 2.6 Manque d'un panneau "Mesures comparatives"

Le point M donne E et V instantanément, mais il est impossible de **comparer plusieurs points**.

**Amélioration proposée** :
- Mode "Multi-points" : placer jusqu'à 5 points de mesure M1...M5
- Tableau comparatif dans la sidebar : position, ||E||, V, direction de E

---

## 🟡 PRIORITÉ 3 — Améliorations UX / Interface

### 3.1 La sidebar est trop chargée et non hiérarchisée

**Fichier** : `Sidebar.jsx` (731 lignes monolithiques)

La sidebar mélange gestion des charges, distributions, visualisation, export/import, Gauss, graphiques sans navigation structurée.

**Amélioration proposée** : Diviser en **onglets thématiques** avec icônes :
- 🔵 **Scène** (charges, distributions, presets)
- 📊 **Analyse** (E, V, forces, graphiques)
- 🎓 **Pédagogie** (Compagnon Gauss, Quiz)
- ⚙️ **Paramètres** (thème, snap, unités, caméra)

---

### 3.2 Aucune indication visuelle de l'unité active dans la scène 3D

Quand l'unité change (nC, µC, e), les valeurs changent d'ordre de grandeur sans indication dans le canvas.

**Amélioration proposée** :
- **Légende flottante** dans le coin du canvas : "Unité : nC | Échelle : 1 = 1 mètre"
- Couleur des charges en gradient selon l'intensité relative

---

### 3.3 L'aide clavier est trop minimale

**Fichier** : `HelpModal.jsx` (8 raccourcis dans un tableau basique, pas de visite guidée)

**Amélioration proposée** :
- **Onboarding Tour** au premier lancement (overlay séquentiel sur les éléments clés)
- Panneau restructuré : Navigation 3D | Objets | Analyse | Raccourcis
- Stocker `hasSeenOnboarding` en localStorage

---

### 3.4 Absence d'étiquettes de coordonnées en temps réel lors du drag

Quand on déplace une charge à la souris, on ne connaît sa position exacte qu'en regardant la sidebar.

**Amélioration proposée** :
- **Tooltip 3D** (Billboard R3F) avec coordonnées [x, y, z] au-dessus de la charge lors du drag
- Disparaît automatiquement 1 seconde après le `pointerup`

---

### 3.5 Pas de gestion des erreurs d'import de scène

**Fichier** : `useStore.js` (fonction `importScene`)

```js
} catch { return false } // L'erreur est avalée silencieusement
```

L'utilisateur ne sait pas pourquoi l'import a échoué.

**Solution** : Retourner `{ success: boolean, error: string }` et afficher un toast descriptif.

---

## 🟢 PRIORITÉ 4 — Nouvelles Fonctionnalités Pédagogiques

### 4.1 Solveur Laplace / Poisson (Phase 6 du roadmap original)

Non encore implémenté.

**Proposition** :
- Grille 2D NxN configurable (50×50 à 200×200)
- Conditions aux limites : électrodes à potentiel fixe placées par l'utilisateur
- Algorithme de relaxation Gauss-Seidel dans un **Web Worker**
- Visualisation : heatmap du potentiel + lignes de champ par gradient numérique

---

### 4.2 Conducteur dessiné à la main (Phase 5 du roadmap original)

Non encore implémenté.

**Proposition** :
- Mode "Dessin" : canvas HTML superposé à la scène 3D
- Analyse du contour tracé : calcul du rayon de courbure local (dérivées 1ère et 2ème)
- Heatmap de σ(x) sur le bord (pouvoir des pointes : fort σ là où le rayon est petit)
- Extrusion 3D optionnelle de la forme

---

### 4.3 Module "Condensateur Réaliste"

Actuellement, le preset `capacitor` est une simple rangée de charges ponctuelles.

**Amélioration proposée** :
- Distribution plane positive + négative face-à-face
- Calcul analytique du champ uniforme E = σ/ε₀ entre les plaques
- Lignes de champ confinées entre les plaques + champ de frange aux bords
- Curseur distance inter-plaques → observation directe de l'effet sur E et C

---

### 4.4 Isosurfaces d'équipotentielles via Marching Cubes

**Fichier** : `marchingCubes.js` existe déjà dans `src/physics/`

**Amélioration proposée** :
- Utiliser Marching Cubes pour générer des **isosurfaces** de potentiel en 3D temps réel
- Slider pour choisir la valeur V₀ de l'équipotentielle à afficher
- Coloration des surfaces selon V (gradient HSL)

---

### 4.5 Extension Magnétisme — Loi de Biot-Savart

**Proposition** :
- Ajouter un type de source "fil infini portant un courant I"
- Afficher le champ magnétique B via Biot-Savart (cercles de champ autour du fil)
- Visualiser la force de Lorentz sur une charge en mouvement
- Extension naturelle du module "trajectoire" existant

---

## ⚙️ PRIORITÉ 5 — Qualité du Code & Architecture

### 5.1 `Sidebar.jsx` est un monolithe de 731 lignes

**Refactoring proposé** :
```
src/components/sidebar/
  ├── SidebarNav.jsx
  └── panels/
      ├── ScenePanel.jsx
      ├── AnalysisPanel.jsx
      ├── PedagogyPanel.jsx
      └── SettingsPanel.jsx
```

---

### 5.2 Duplication du code KaTeX dans `GaussWizard.jsx`

Les fonctions `renderKaTeX`, `InlineMath`, `BlockMath`, `TextWithMath` sont définies localement. À extraire :

```
src/utils/math.jsx  ← helpers KaTeX partagés
```

---

### 5.3 Pas de tests unitaires sur `gauss.js`

**Fichier** : `utils.test.js` existe mais ne couvre pas `gauss.js`.

**Ajouts recommandés** :
- Tests pour `calculateGaussParameters` : cas creux, plein, r < R, r >= R
- Tests de régression pour les singularités (r = 0, charges superposées)
- CI/CD : `vitest` dans le pipeline

---

### 5.4 Manque d'un système de notifications Toast

**Solution** :
- Store `notifications` dans Zustand : `{ id, type, message, duration }`
- Composant `Toast.jsx` avec animation slide + fade
- Utiliser dans : `importScene`, `undo` (history vide), `addCharge` (> 10 charges)

---

### 5.5 `addDistribution` limite à une seule distribution sans documentation

```js
return { distributions: [dist], ... } // Écrase les distributions existantes
```

Comportement intentionnel mais non documenté, source de confusion.

**Solution** : Ajouter un commentaire JSDoc explicite ou refactoriser avec un flag `isPrimary`.

---

## 📊 Récapitulatif Priorisé

| # | Catégorie | Amélioration | Impact | Effort |
|---|-----------|-------------|--------|--------|
| 1.1 | 🔴 Bug | Géométries Three.js recréées sans `useMemo` | Perf | Faible |
| 1.2 | 🔴 Bug | `pushHistory` à chaque frame de drag | UX/Perf | Faible |
| 1.3 | 🔴 Bug | GaussVis masqué silencieusement | UX | Faible |
| 1.4 | 🔴 Bug | Calcul 300 samples sur thread UI | Perf | Moyen |
| 2.1 | 🟠 Feature | Mode Quiz / Auto-évaluation | Pédagogie | Élevé |
| 2.2 | 🟠 Feature | Colormap flux dΦ sur surface de Gauss | Pédagogie | Élevé |
| 2.3 | 🟠 Feature | Export PNG/CSV des graphiques | UX | Faible |
| 2.4 | 🟠 Feature | Comparaison de deux distributions | Pédagogie | Moyen |
| 2.5 | 🟠 Feature | Intégration RK4 trajectoire réelle | Physique | Élevé |
| 2.6 | 🟠 Feature | Tableau multi-points de mesure | UX | Moyen |
| 3.1 | 🟡 UX | Sidebar avec onglets thématiques | UX | Moyen |
| 3.2 | 🟡 UX | Légende unités dans le canvas 3D | UX | Faible |
| 3.3 | 🟡 UX | Onboarding Tour interactif | UX | Moyen |
| 3.4 | 🟡 UX | Tooltip coordonnées pendant drag | UX | Faible |
| 3.5 | 🟡 UX | Messages d'erreur import | UX | Faible |
| 4.1 | 🟢 Feature | Solveur Laplace/Poisson + Web Worker | Physique | Très élevé |
| 4.2 | 🟢 Feature | Conducteur dessiné à la main | Physique | Très élevé |
| 4.3 | 🟢 Feature | Module Condensateur réaliste | Pédagogie | Moyen |
| 4.4 | 🟢 Feature | Isosurfaces équipotentielles (Marching Cubes) | Visualisation | Élevé |
| 4.5 | 🟢 Feature | Extension magnétisme (Biot-Savart) | Physique | Très élevé |
| 5.1 | ⚙️ Archi | Refactoring Sidebar en panneaux | Code | Moyen |
| 5.2 | ⚙️ Archi | Extraction helpers KaTeX | Code | Faible |
| 5.3 | ⚙️ Archi | Tests unitaires physique (gauss.js) | Qualité | Moyen |
| 5.4 | ⚙️ Archi | Système de notifications Toast | UX | Faible |
| 5.5 | ⚙️ Archi | Documentation limite 1 distribution | Code | Faible |

---

## 🎯 Plan d'Action Recommandé (4 Sprints)

### Sprint 1 — Stabilisation (1-2 jours)
- [ ] Fix `useMemo` sur les géométries Three.js dans `GaussianSurfaceVis`
- [ ] Fix `pushHistory` uniquement sur `pointerup`
- [ ] Message d'avertissement quand Gauss + charges ponctuelles
- [ ] Système Toast (Zustand + composant `Toast.jsx`)
- [ ] Extraction helpers KaTeX → `src/utils/math.jsx`

### Sprint 2 — UX Core (3-5 jours)
- [ ] Sidebar en onglets avec navigation persistante
- [ ] Tooltip coordonnées pendant drag (Billboard R3F)
- [ ] Légende unités dans le canvas 3D
- [ ] Export PNG/CSV des graphiques
- [ ] Onboarding tour (flag localStorage)

### Sprint 3 — Pédagogie (1-2 semaines)
- [ ] Mode Quiz dans le Compagnon Gauss
- [ ] Colormap flux dΦ sur la surface de Gauss (ShaderMaterial)
- [ ] Tableau multi-points de mesure (M1…M5)
- [ ] Module Condensateur réaliste (distributions planes face-à-face)

### Sprint 4 — Physique Avancée (2-4 semaines)
- [ ] Intégrateur RK4 trajectoire + heatmap vitesse
- [ ] Isosurfaces équipotentielles via Marching Cubes (fichier existant !)
- [ ] Solveur Laplace/Poisson dans Web Worker
- [ ] Extension magnétisme (Biot-Savart + force de Lorentz)

---

*Document généré par analyse statique du code source et inspection de l'architecture le 2026-07-23.*
