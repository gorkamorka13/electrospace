# Plan d'implémentation Physique Réelle (Coulombs, Mètres, V/m) & Échelle de Visualisation

**Objectif :** Intégrer les constantes physiques réelles et les unités SI (Loi de Coulomb) pour le calcul exact du champ électrique $\vec{E}$ (en $\text{V/m}$) et du potentiel électrostatique $V$ (en Volts), tout en maintenant un affichage 3D élégant et réglable, avec prise en charge des charges élémentaires (électrons et protons).
**Architecture :** Centralisation des calculs physiques dans `coulomb.js` avec la constante de Coulomb $k_e = 8.9875517923 \times 10^9$. Le store Zustand stockera l'unité globale de charge (`chargeUnit`) et un multiplicateur d'échelle visuelle (`vectorScale`). Des getters physiques seront ajoutés au store pour calculer en temps réel les valeurs réelles SI. L'UI (flèche 3D et Sidebar) utilisera des fonctions de formatage dynamique pour afficher les unités et la notation scientifique, avec gestion des ordres de grandeur atomiques (nano, micro, pico, etc.).
**Tech Stack :** React, Three.js, React Three Fiber, Zustand.
---

### Tâche 1 : Physique Électrostatique et Formatage

**Fichiers :**
- Modifier : `src/physics/coulomb.js`

**Étape 1 : Définir la logique physique**
Nous allons définir `KE_REAL`, `E_CHARGE` (charge élémentaire de l'électron/proton), et implémenter `calculatePotentialFromCharge`, `calculateTotalPotential`, ainsi que `formatElectricField` et `formatPotential` (incluant les préfixes micro, nano, pico, etc.).

**Étape 2 : Implémentation minimale**
Dans [coulomb.js](file:///c:/wamp64/www/electro-web/src/physics/coulomb.js) :
```javascript
export const KE_REAL = 8.9875517923e9
export const E_CHARGE = 1.602176634e-19 // Charge élémentaire en Coulombs

export function calculatePotentialFromCharge(charge, targetPos, ke = KE_REAL, rMin = 0.5) {
  const q = charge.q
  const chargePos = new THREE.Vector3(...charge.position)
  const M = new THREE.Vector3(...targetPos)
  
  let r = M.distanceTo(chargePos)
  if (r < rMin) {
    r = rMin
  }
  
  return (ke * q) / r
}

export function calculateTotalPotential(charges, targetPos, ke = KE_REAL, rMin = 0.5) {
  let totalPotential = 0
  charges.forEach(charge => {
    totalPotential += calculatePotentialFromCharge(charge, targetPos, ke, rMin)
  })
  return totalPotential
}

export function formatPotential(val) {
  const absVal = Math.abs(val)
  if (absVal === 0) return '0 V'
  if (absVal < 1e-9) {
    return `${val.toExponential(2).replace('e-', ' × 10^-')} V`
  } else if (absVal < 1e-6) {
    return `${(val * 1e9).toFixed(2)} nV`
  } else if (absVal < 1e-3) {
    return `${(val * 1e6).toFixed(2)} µV`
  } else if (absVal < 1) {
    return `${(val * 1e3).toFixed(2)} mV`
  } else if (absVal < 1000) {
    return `${val.toFixed(2)} V`
  } else if (absVal < 1e6) {
    return `${(val / 1e3).toFixed(2)} kV`
  } else if (absVal < 1e9) {
    return `${(val / 1e6).toFixed(2)} MV`
  } else {
    return `${val.toExponential(2).replace('e+', ' × 10^')} V`
  }
}

export function formatElectricField(val) {
  const absVal = Math.abs(val)
  if (absVal === 0) return '0 V/m'
  if (absVal < 1e-9) {
    return `${val.toExponential(2).replace('e-', ' × 10^-')} V/m`
  } else if (absVal < 1e-6) {
    return `${(val * 1e9).toFixed(2)} nV/m`
  } else if (absVal < 1e-3) {
    return `${(val * 1e6).toFixed(2)} µV/m`
  } else if (absVal < 1) {
    return `${(val * 1e3).toFixed(2)} mV/m`
  } else if (absVal < 1000) {
    return `${val.toFixed(2)} V/m`
  } else if (absVal < 1e6) {
    return `${(val / 1e3).toFixed(2)} kV/m`
  } else if (absVal < 1e9) {
    return `${(val / 1e6).toFixed(2)} MV/m`
  } else {
    return `${val.toExponential(2).replace('e+', ' × 10^')} V/m`
  }
}
```

---

### Tâche 2 : Gestion de l'État Global

**Fichiers :**
- Modifier : `src/store/useStore.js`

**Étape 1 : Implémentation minimale**
Dans [useStore.js](file:///c:/wamp64/www/electro-web/src/store/useStore.js) :
- Remplacer `ke: 10` par `ke: 8.9875517923e9`
- Ajouter les états `chargeUnit: 'uC'` et `vectorScale: 1.0`
- Ajouter les setters et les méthodes d'accès physique `getElectricField` et `getPotential`.
  - Multiplicateur d'unité de charge dans les getters :
    - `'uC'` $\rightarrow 10^{-6}$
    - `'nC'` $\rightarrow 10^{-9}$
    - `'C'` $\rightarrow 1$
    - `'e'` $\rightarrow 1.602176634 \times 10^{-19}$ (proton/électron)

---

### Tâche 3 : Ajustement de la Flèche Graphique 3D

**Fichiers :**
- Modifier : `src/components/ElectricFieldArrow.jsx`

**Étape 1 : Implémentation minimale**
Dans [ElectricFieldArrow.jsx](file:///c:/wamp64/www/electro-web/src/components/ElectricFieldArrow.jsx) :
- Utiliser `getElectricField` du store pour calculer `E`.
- Appliquer l'échelle de base et `vectorScale` pour obtenir `renderLength`.
  - Si `'e'`, `baseScale = 2e9`
  - Si `'nC'`, `baseScale = 0.5`
  - Si `'uC'`, `baseScale = 0.0005`
  - Si `'C'`, `baseScale = 5e-10`
- Utiliser `formatElectricField(length)` pour afficher le texte dans le `Billboard`.

---

### Tâche 4 : UI et Configuration Physique

**Fichiers :**
- Modifier : `src/components/Sidebar.jsx`

**Étape 1 : Implémentation minimale**
Dans [Sidebar.jsx](file:///c:/wamp64/www/electro-web/src/components/Sidebar.jsx) :
- Ajouter une section pour sélectionner l'unité globale de charge et régler le slider d'échelle visuelle (inclure l'option $e$).
- Mettre à jour l'affichage du champ électrique et du potentiel.
- Afficher les unités à côté des valeurs de charges dans la liste des charges.
