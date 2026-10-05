# Plan d'Implémentation : Audit & Nettoyage de la Qualité de Code — ElectroSpace

Ce plan détaille la méthodologie d'audit réalisée, le document généré [`AUDIT_QUALITE_CODE.md`](file:///c:/wamp64/www/electrospace/AUDIT_QUALITE_CODE.md), ainsi que la feuille de route pas-à-pas pour corriger l'ensemble des 18 problèmes ESLint, éliminer le code mort et mettre l'application en conformité avec React 19 et les meilleures pratiques WebGL.

> [!NOTE]
> Conformément à votre consigne (*"En mode plan pas de code change sauf pour le fichier audit que tu vas créer"*), **aucun fichier de code source n'a été modifié**. Seul le rapport d'audit exhaustif [`AUDIT_QUALITE_CODE.md`](file:///c:/wamp64/www/electrospace/AUDIT_QUALITE_CODE.md) a été créé à la racine.

---

## 🛠️ Synthèse de l'Audit Réalisé

L'analyse de l'application (90/90 tests Vitest validés) a mis en évidence **18 problèmes linter (15 erreurs, 3 avertissements)** et plusieurs dettes techniques :

| Catégorie | Problèmes Identifiés | Fichiers Impactés |
| :--- | :--- | :--- |
| **Code Mort & Variables Inutilisées** | `E_FIELD_GRID_SIZE`, `titleColor`, `cylLambda`, `innerOuter`, `E_CHARGE`, `seededRef`, `cursorPosRef` | `constants.js`, `PotentialXGraph.jsx`, `utils.test.js`, `fieldWorker.js` |
| **Violations React 19 Hooks** | `setState` synchrone dans `useEffect` (cascading re-renders) | `GaussWizard.jsx`, `PotentialXGraph.jsx`, `ThroughMLine.jsx`, `VectorField.jsx` |
| **Ref Cleanup & Hoisting** | Capture de `ref.current` dans le cleanup / Hoisting de `scheduleWindowRaf` | `useFieldWorker.js`, `FieldGraph.jsx`, `ChargeTrajectory.jsx` |
| **Incohérence Physique $r_{\min}$** | Rayon d'arrêt divergent ($0.05$ pour $\vec{E}$ vs $0.5$ pour $V$) | `src/physics/coulomb.js` |

---

## 📋 Proposés / Plan d'Action par Composant

### 1. Documentation d'Audit [CRÉÉ]
#### [NEW] [AUDIT_QUALITE_CODE.md](file:///c:/wamp64/www/electrospace/AUDIT_QUALITE_CODE.md)
Document complet consignant le tableau récapitulatif du code mort, les violations React 19 et la feuille de route.

---

### 2. Phase 1 : Nettoyage du Code Mort (Plan Futur d'Exécution)
#### [MODIFY] [constants.js](file:///c:/wamp64/www/electrospace/src/physics/constants.js)
- Retirer la constante inutilisée `E_FIELD_GRID_SIZE`.

#### [MODIFY] [fieldWorker.js](file:///c:/wamp64/www/electrospace/src/workers/fieldWorker.js)
- Retirer la constante inutilisée `E_CHARGE`.

#### [MODIFY] [PotentialXGraph.jsx](file:///c:/wamp64/www/electrospace/src/components/PotentialXGraph.jsx)
- Supprimer l'import inutilisé `useMemo`.
- Supprimer la variable inutilisée `titleColor`.

#### [MODIFY] [utils.test.js](file:///c:/wamp64/www/electrospace/src/physics/utils.test.js)
- Nettoyer les variables inutilisées `cylLambda` et `innerOuter`.

#### [MODIFY] [plane-verify.test.js](file:///c:/wamp64/www/electrospace/src/physics/plane-verify.test.js)
- Nettoyer la variable `min` inutilisée.

---

### 3. Phase 2 : Conformité Hooks React 19 & Performance
#### [MODIFY] [GaussWizard.jsx](file:///c:/wamp64/www/electrospace/src/components/GaussWizard.jsx)
- Remplacer l'appel synchrone `setFluxGeos(...)` en tête d'effet par une dérivation d'état ou un handler d'événement.

#### [MODIFY] [ThroughMLine.jsx](file:///c:/wamp64/www/electrospace/src/components/ThroughMLine.jsx)
- Remplacer `setLineData(null)` synchrone dans l'effet par une valeur dérivée pendant le rendu.

#### [MODIFY] [VectorField.jsx](file:///c:/wamp64/www/electrospace/src/components/VectorField.jsx)
- Corriger `setVectors([])` synchrone dans `useEffect`.
- S'abonner réactivement à `ke` et `rMin` via `useStore((state) => state.ke)` au lieu de `useStore.getState()`.

#### [MODIFY] [useFieldWorker.js](file:///c:/wamp64/www/electrospace/src/hooks/useFieldWorker.js)
- Copier `pendingRef.current` dans une variable locale `const pending = pendingRef.current` au début de l'effet pour la fonction de nettoyage.

#### [MODIFY] [Equipotentials3D.jsx](file:///c:/wamp64/www/electrospace/src/components/Equipotentials3D.jsx)
- Remplacer `useStore.getState()` dans `useMemo` par les sélecteurs réactifs du store Zustand.

---

### 4. Phase 3 : Harmonisation Physico-Mathématique
#### [MODIFY] [coulomb.js](file:///c:/wamp64/www/electrospace/src/physics/coulomb.js)
- Harmoniser le rayon d'arrêt anti-singularité `rMin = 0.05` sur toutes les fonctions de potentiel $V$ et de champ $\vec{E}$.

---

## 🧪 Plan de Vérification

### Tests Automatisés
- Exécution de ESLint : `npm run lint` (Résultat attendu : 0 erreur, 0 avertissement).
- Exécution de la suite Vitest : `npm run test:run` (Résultat attendu : 90/90 tests validés).
- Test de build production : `npm run build`.

### Vérification Manuelle (UI & 3D)
- Tester le déplacement des charges dans la scène 3D pour vérifier la fluidité 60 FPS.
- Modifier la valeur de $k_e$ et $r_{\min}$ dans les paramètres pour vérifier le rafraîchissement réactif des équipotentielles 3D et du champ vectoriel.
