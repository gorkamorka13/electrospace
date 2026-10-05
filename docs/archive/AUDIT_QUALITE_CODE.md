# 🔍 Audit de Qualité de Code & Préconisations d'Améliorations — ElectroSpace

> **Application** : ElectroSpace (Simulateur 3D d'Électrostatique Pédagogique)  
> **Date de l'audit** : 2 Août 2026  
> **Statut** : Rapport d'Audit & Plan d'Action (Aucune modification de code source effectuée)  
> **Fichier généré** : `AUDIT_QUALITE_CODE.md`

> ## ⚠️ MISE À JOUR (10 Août 2026) — ce rapport est historique et dépassé
> Ce rapport a été rédigé en **mode plan** et décrit l'état initial du codebase. Depuis, les préconisations ont été **appliquées et validées** :
> - **Linter** : désormais **0 erreur / 0 avertissement** (`npm run lint` → exit 0) — les 46 alertes d'origine ont été corrigées.
> - **Tests** : **117/117** passent (`npx vitest run`).
> - **Code mort supprimé** : `sample3DGrid` (marchingCubes, dupliqué dans le worker), états de store zombies `showPotentialGraph` / `potentialGraphAxis`, assets inutilisés (`hero.png`, `react.svg`, `vite.svg`) et journaux (`texput.log`, `dev.log`).
> - **Harmonisation physique (§4.1)** : `rMin` **centralisé** via `constants.R_MIN = 0.05`, appliqué dans le store (`physicsSlice`), `coulomb.js` (champ & potentiel, y compris `traceFieldLine` qui était à 0.5) et `fieldWorker.js`. La divergence champ/potentiel est résolue.
> Les chapitres 2 à 5 ci-dessous correspondent à l'état d'origine (avant correction) et sont conservés à titre historique.


---

## 📋 Sommaire

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Code Mort & Symboles Inutilisés](#2-code-mort--symboles-inutilisés)
3. [Bugs Critiques & Violations des Règles React 19 / Hooks](#3-bugs-critiques--violations-des-règles-react-19--hooks)
4. [Incohérences Physiques, Mathématiques & Architecture](#4-incohérences-physiques-mathématiques--architecture)
5. [Plan d'Améliorations Structuré & Feuille de Route](#5-plan-daméliorations-structuré--feuille-de-route)

---

## 1. 📌 Résumé Exécutif

Cet audit examine la santé globale du codebase de l'application **ElectroSpace** sur les plans du linter, de la propreté du code (dead code), du respect des règles des Hooks React 19, des performances WebGL/Web Worker et des cohérences physiques.

### Indicateurs de Qualité Actuels

| Domaine | État | Constat / Détails |
| :--- | :---: | :--- |
| **Tests Unitaires (Vitest)** | ✅ **PASSING** | **117/117 tests validés** (`gauss.test.js`, `plane-verify.test.js`, `utils.test.js`). |
| **Build Production (Vite)** | ✅ **OK** | Compilation fonctionnelle sans erreur bloquante de bundling. |
| **Linter ESLint** | ✅ **PASS** | **0 erreur / 0 avertissement** (constantes ET variables inutilisées nettoyées, règles Hooks conformes). |
| **Règles des Hooks React 19** | ⚠️ **RISQUES** | Invocations synchrones de `setState` dans les effets, mutations de refs dans `useFrame`, hoisting incorrect. |
| **Gestion des Singularités Physiques** | 🟠 **INCOHÉRENT** | Rayon d'arrêt anti-singularité ($r_{\min}$) divergent entre le champ $\vec{E}$ ($0.05$) et le potentiel $V$ ($0.5$). |

---

## 2. 🧹 Code Mort & Symboles Inutilisés

L'analyse statique du code révèle **30+ symboles dead code** (imports non utilisés, variables locales non lues, paramètres ignorés, refs obsolètes).

### Tableau Récapitulatif du Code Mort Identifié

| Fichier | Symbole / Variable | Type | Emplacement | Impact & Recommandation |
| :--- | :--- | :--- | :---: | :--- |
| [physics/constants.js](file:///c:/wamp64/www/electrospace/src/physics/constants.js#L14) | `E_FIELD_GRID_SIZE` | Constante exportée | L14 | Exportée mais jamais importée. À supprimer ou intégrer aux réglages visuels. |
| [physics/coulomb.js](file:///c:/wamp64/www/electrospace/src/physics/coulomb.js#L901) | `len` | Variable locale | L901 | Assignée dans la boucle de la distribution rectangulaire sans être lue. À supprimer. |
| [store/useStore.js](file:///c:/wamp64/www/electrospace/src/store/useStore.js#L261) | `_id` | Paramètre | L261 | Variable déstructurée lors de l'export de scène sans être utilisée. |
| [store/useStore.js](file:///c:/wamp64/www/electrospace/src/store/useStore.js#L418) | `_` | Variable rest | L418 | Variable d'omission rest inutilisée. |
| [store/useStore.js](file:///c:/wamp64/www/electrospace/src/store/useStore.js#L462) | `state` | Paramètre de callback | L462 | Callback `set((state) => ...)` ignorera `state`. |
| [components/Sidebar.jsx](file:///c:/wamp64/www/electrospace/src/components/Sidebar.jsx#L1) | `__GIT_VERSION__` | Constante / Import | L1 | Importée sans être affichée dans l'UI. |
| [components/Sidebar.jsx](file:///c:/wamp64/www/electrospace/src/components/Sidebar.jsx#L5) | `TextWithMath` | Composant | L5 | Importé depuis `math.jsx` mais non utilisé dans la Sidebar. |
| [components/Sidebar.jsx](file:///c:/wamp64/www/electrospace/src/components/Sidebar.jsx#L399) | `charges` | Variable locale | L399 | Assignée sans lecture ultérieure. |
| [components/ChargeTrajectory.jsx](file:///c:/wamp64/www/electrospace/src/components/ChargeTrajectory.jsx#L13) | `seededRef` | React Ref | L13 | Instanciée avec `useRef()` mais jamais référencée. |
| [components/FieldGraph.jsx](file:///c:/wamp64/www/electrospace/src/components/FieldGraph.jsx#L170) | `cursorPosRef` | React Ref | L170 | Variable ref inutilisée. |
| [components/FieldGraph.jsx](file:///c:/wamp64/www/electrospace/src/components/FieldGraph.jsx#L383) | `err` (catch) | Paramètre catch | L383, 407, 426 | Bloc catch n'exploitant pas l'objet d'erreur. |
| [components/GaussWizard.jsx](file:///c:/wamp64/www/electrospace/src/components/GaussWizard.jsx#L126) | `gaussSurfaceRadius` | État Store | L126, 129, 132-136 | Propriétés extraites du store sans être lues. |
| [components/GaussWizard.jsx](file:///c:/wamp64/www/electrospace/src/components/GaussWizard.jsx#L175) | `charges` | État Store | L175 | Extraite du store mais non utilisée dans ce composant. |
| [components/PhysicsCanvas.jsx](file:///c:/wamp64/www/electrospace/src/components/PhysicsCanvas.jsx#L54) | `_rootRef` | Prop | L54 | Reçue en prop mais ignorée dans la fonction. |
| [components/PotentialXGraph.jsx](file:///c:/wamp64/www/electrospace/src/components/PotentialXGraph.jsx#L1) | `useMemo` | Import React | L1 | Importé dans le header du fichier mais inutilisé. |

---

## 3. 🚨 Bugs Critiques & Violations des Règles React 19 / Hooks

### 3.1 Appel de Fonction non Initialisée (`scheduleWindowRaf`)
- **Fichiers** : [FieldGraph.jsx](file:///c:/wamp64/www/electrospace/src/components/FieldGraph.jsx#L341) et [PotentialXGraph.jsx](file:///c:/wamp64/www/electrospace/src/components/PotentialXGraph.jsx#L329)
- **Problème** : `scheduleWindowRaf` est appelée dans un `useEffect` au sommet du composant, alors que sa définition `const scheduleWindowRaf = useCallback(...)` se situe plus bas. Cela provoque un risque d'erreur au runtime sous strict mode.
- **Solution** : Déplacer la définition de `scheduleWindowRaf` au-dessus des `useEffect` dépendants.

### 3.2 Mutation Directe de Ref pendant le Rendu / `useFrame`
- **Fichier** : [PhysicsCanvas.jsx](file:///c:/wamp64/www/electrospace/src/components/PhysicsCanvas.jsx#L45)
- **Problème** : Assignation directe `animationTarget.current = null` dans la boucle de rendu `useFrame`. En React 19, cela viole l’immutabilité des hooks de rendu.
- **Solution** : Utiliser un callback d'effet ou un handler d'événement pour réinitialiser la cible d'animation.

### 3.3 Mise à jour Synchrone d'État dans les Effets (`cascading re-renders`)
- **Fichiers** : [FieldGraph.jsx](file:///c:/wamp64/www/electrospace/src/components/FieldGraph.jsx#L173), [PotentialXGraph.jsx](file:///c:/wamp64/www/electrospace/src/components/PotentialXGraph.jsx#L161), [GaussWizard.jsx](file:///c:/wamp64/www/electrospace/src/components/GaussWizard.jsx#L167)
- **Problème** : Des appels synchrone à `setData(null)` sont exécutés directement en tête de `useEffect`, déclenchant des rendus en cascade destructeurs pour la fluidité 60 FPS.
- **Solution** : Dériver les données directement pendant le rendu ou encapsuler la mise à jour dans la logique métier.

### 3.4 Lecture Impérative du Store hors Réactivité dans `useMemo`
- **Fichier** : [Equipotentials3D.jsx](file:///c:/wamp64/www/electrospace/src/components/Equipotentials3D.jsx#L31)
- **Problème** : `const { ke, rMin } = useStore.getState()` est lu de manière impérative dans le bloc `useMemo`. Si l'utilisateur ajuste $k_e$ ou $r_{\min}$ dans la sidebar, l'isosurface 3D ne se recalculera pas.
- **Solution** : Utiliser le hook réactif `useStore((state) => state.ke)` et déclarer ces valeurs dans le tableau de dépendances de `useMemo`.

### 3.5 Capture Invalide de Ref dans le Cleanup de `useEffect`
- **Fichier** : [ChargeTrajectory.jsx](file:///c:/wamp64/www/electrospace/src/components/ChargeTrajectory.jsx#L17)
- **Problème** : Accès direct à `groupRef.current` dans la fonction de nettoyage. La valeur de la ref peut être `null` au démontage.
- **Solution** : Stocker `const group = groupRef.current` dans une variable locale au début du `useEffect` puis l'utiliser dans la fonction de cleanup.

---

## 4. ⚖️ Incohérences Physiques, Mathématiques & Architecture

### 4.1 Divergence de $r_{\min}$ (Cut-off de Singularité en $1/r^2$)
- **Constat** : 
  - `calculateTotalField` dans `coulomb.js` fixe $r_{\min} = 0.05\text{ m}$.
  - `calculateTotalPotential` dans `coulomb.js` fixe $r_{\min} = 0.5\text{ m}$ (10 fois supérieur !).
- **Impact Pédagogique** : À proximité des charges ($r < 0.5\text{ m}$), le potentiel calculé s'aplatit artificiellement alors que le champ vectoriel continue de croître, créant une contradiction physique directe pour l'étudiant.
- **Recommandation** : Harmoniser $r_{\min} = 0.05\text{ m}$ ou utiliser la constante issue du Store Zustand (`state.rMin`).

### 4.2 Problème Vite Fast Refresh avec `math.jsx`
- **Fichier** : [utils/math.jsx](file:///c:/wamp64/www/electrospace/src/utils/math.jsx#L2)
- **Problème** : Ce fichier `.jsx` exporte à la fois un composant React et des fonctions utilitaires pures (ex: `renderKaTeX`).
- **Impact** : Vite émet un avertissement `react-refresh/only-export-components` et désactive le remplacement à chaud (HMR).
- **Recommandation** : Séparer les fonctions utilitaires dans `src/utils/math.js` et conserver uniquement les composants React dans `math.jsx`.

### 4.3 Saturation de l'Historique (Undo / Redo)
- **Fichier** : [store/useStore.js](file:///c:/wamp64/www/electrospace/src/store/useStore.js#L235)
- **Problème** : L'action `pushHistory()` est déclenchée sur chaque événement `onChange` des curseurs de réglage.
- **Impact** : Déplacer un slider pendant 1 seconde empile 50 états dans la pile Undo, rendant le raccourci `Ctrl+Z` inopérant.
- **Recommandation** : Pousser dans l'historique uniquement sur `onPointerDown` ou `onChangeCommitted`.

---

## 5. 🎯 Plan d'Améliorations Structuré & Feuille de Route

Le plan d'action recommandé pour assainir le codebase est découpé en 3 étapes :

```
Phase 1 : Assainissement du Code Mort & Correctifs React 19 (Priorité Haute)
├── Nettoyage des 30+ symboles inutilisés répertoriés au chapitre 2
├── Correction du hoisting de scheduleWindowRaf et des mutations de ref
└── Harmonisation de rMin = 0.05 dans coulomb.js

Phase 2 : Refactorisation Architecture & WebGL (Priorité Moyenne)
├── Migration des flèches vectorielles 3D vers THREE.InstancedMesh
├── Déportation des calculs Marching Cubes 3D dans fieldWorker.js
└── Séparation des utilities math.js pour restaurer Fast Refresh HMR

Phase 3 : Typage & Évolutions Pédagogiques (Priorité Long Terme)
├── Migration progressive vers TypeScript (.ts / .tsx)
└── Découpage du composant monolithique Sidebar.jsx
```

---

> **Note finale** : Cet audit constitue un état des lieux exhaustif. Conformément au mode plan demandé, aucune modification n'a été apportée aux fichiers source Javascript de la scène ou du store.
