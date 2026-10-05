# ElectroSpace ⚡

> **Simulateur 3D interactif et pédagogique d'Électrostatique**  
> ElectroSpace est une application web conçue pour l'enseignement et la visualisation interactive des concepts d'électrostatique : champs électriques vectoriels $\vec{E}$, potentiels électrostatiques $V(\mathbf{r})$, surfaces équipotentielles en 2D/3D, distributions de charges complexes et assistant pas-à-pas du Théorème de Gauss.

---

## 📋 Sommaire

1. [Présentation & Fonctionnalités Clés](#-présentation--fonctionnalités-clés)
2. [Stack Technique](#-stack-technique)
3. [Prérequis](#-prérequis)
4. [Guide de Démarrage (Développement Local)](#-guide-de-démarrage-développement-local)
5. [Architecture du Projet](#-architecture-du-projet)
6. [Tests & Qualité de Code](#-tests--qualité-de-code)
7. [Déploiement](#-déploiement)
8. [Préconisations d'Améliorations (Audit & Roadmap)](#-préconisations-daméliorations-audit--roadmap)
9. [Dépannage (Troubleshooting)](#-dépannage-troubleshooting)

---

## 🌟 Présentation & Fonctionnalités Clés

- **Bac à sable 3D de charges ponctuelles** : Placement, manipulation interactive à la souris et mesure du champ électrique $\vec{E}$ au point de test $M$.
- **Distributions de charges continues** : Modélisation 1D/2D/3D (fils, anneaux, disques, plaques, sphères) avec calcul d'intégrales numériques.
- **Visualisations avancées du Champ $\vec{E}$ & Potentiel $V$** :
  - Champ vectoriel 3D (grille de flèches orientées et colorées selon l'intensité).
  - Lignes de champ animées et équipotentielles 2D / surfaces équipotentielles 3D (Marching Cubes).
  - Trajectoire animée d'une charge de test soumise aux forces électrostatiques de Coulomb.
- **Assistant Pédagogique du Théorème de Gauss (`GaussWizard`)** :
  - Guidage étape par étape (Analyse des symétries, choix de la surface gaussienne, calcul de $Q_{\text{int}}$ et du flux $\Phi_E$).
  - Visualisation 3D de la surface de Gauss (sphère, cylindre, pilulier) avec détection et surbrillance automatique des charges intérieures.
- **Graphes interactifs 2D** : Courbes de champ $E(x)$ et de potentiel $V(x)$ le long d'axes de coupe sur mesure.
- **Performances & Calculs déportés** : Traitement vectoriel lourd exécuté dans un Web Worker en arrière-plan (`fieldWorker.js`) pour conserver un rendu fluide à 60 FPS sur le thread UI.

---

## 🛠️ Stack Technique

- **Interface Utilisateur & Application** : [React 19](https://react.dev/), HTML5 Canvas, CSS custom.
- **Moteur 3D & WebGL** : [Three.js](https://threejs.org/), [@react-three/fiber](https://r3f.docs.pmnd.rs/) (R3F v9), [@react-three/drei](https://drei.docs.pmnd.rs/) (v10).
- **Gestion d'État** : [Zustand](https://zustand-demo.pmnd.rs/) (v5) structuré en Slices (`sceneSlice`, `physicsSlice`, `visualsSlice`, `uiSlice`).
- **Calculs Physiques & Concurrence** : Web Workers (`fieldWorker.js`), Algorithme de Marching Cubes pour le rendu de surfaces 3D.
- **Outils de Build & Qualité** : [Vite 8](https://vitejs.dev/), [Vitest 4](https://vitest.dev/), [ESLint 10](https://eslint.org/).
- **Déploiement & Cloud** : [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/) / Cloudflare Pages.

---

## 📋 Prérequis

- **Node.js** : v18.0.0 ou supérieure (v20+ recommandée).
- **npm** : v9.0.0 ou supérieure.
- Navigateur web moderne supportant WebGL 2.0 et Web Workers (Chrome, Firefox, Edge, Safari).

---

## 🚀 Guide de Démarrage (Développement Local)

### 1. Clonage du dépôt
```bash
git clone https://github.com/gorkamorka13/electrospace.git
cd electrospace
```

### 2. Installation des dépendances
```bash
npm install
```

### 3. Lancement du serveur de développement
```bash
npm run dev
```
Ouvrez votre navigateur à l'adresse indiquée par Vite (par défaut : `http://localhost:5173`).

### 4. Visualisation du build de production en local
```bash
npm run build
npm run preview
```

---

## 📁 Architecture du Projet

```
electrospace/
├── public/                # Assets statiques
├── src/
│   ├── components/        # Composants UI 2D et éléments de scène 3D (R3F)
│   │   ├── PhysicsCanvas.jsx        # Scène principale Three.js / R3F avec contrôles caméra
│   │   ├── Sidebar.jsx              # Panneau de contrôle latéral et configuration de scène
│   │   ├── GaussWizard.jsx          # Assistant pas-à-pas du Théorème de Gauss
│   │   ├── GaussianSurfaceVis.jsx   # Rendu 3D semi-transparent des surfaces de Gauss
│   │   ├── FieldGraph.jsx           # Graphique 2D du champ électrique E(x)
│   │   ├── PotentialXGraph.jsx      # Graphique 2D du potentiel électrique V(x)
│   │   ├── Equipotentials3D.jsx     # Rendu 3D d'Isosurfaces via Marching Cubes
│   │   ├── ChargeTrajectory.jsx     # Animation dynamique de particule dans le champ
│   │   └── ...
│   ├── physics/           # Moteur physique pur et fonctions mathématiques
│   │   ├── coulomb.js               # Loi de Coulomb, calculs E/V pour ponctuelles & continues
│   │   ├── gauss.js                 # Théorème de Gauss, calculs de flux et symétries
│   │   ├── marchingCubes.js         # Algorithme d'isosurface pour équipotentielles 3D
│   │   ├── constants.js             # Constantes physiques (ke, epsilon0, rMin)
│   │   └── utils.js                 # Helpers mathématiques et vectoriels (THREE.Vector3)
│   ├── store/             # Store d'état global Zustand
│   │   ├── slices/                  # Slices thématiques
│   │   │   ├── sceneSlice.js        # Gestion des charges, distributions et objets 3D
│   │   │   ├── physicsSlice.js      # Constantes physiques (k_e, rMin, etc.)
│   │   │   ├── visualsSlice.js      # Options d'affichage (vecteurs, lignes, équipotentielles)
│   │   │   └── uiSlice.js           # Onglets, modales et état de sélection
│   │   └── useStore.js              # Agrégation du Store Zustand central
│   ├── workers/           # Web Workers
│   │   └── fieldWorker.js           # Calcul déporté de la grille 3D de champ & potentiel
│   ├── App.jsx            # Composant racine de l'application
│   └── main.jsx           # Point d'entrée React 19
├── ROADMAP.md              # Statut du projet et pointeur vers le plan d'amélioration courant
├── package.json           # Dépendances npm et scripts de build/test
└── vite.config.js         # Configuration du bundler Vite
```

---

## 🧪 Tests & Qualité de Code

Le projet inclut des tests unitaires automatisés via **Vitest** pour valider la rigueur des algorithmes physiques.

### Commandes de test & linter
```bash
# Lancer les tests en mode interactif (watch mode)
npm run test

# Exécuter l'ensemble des tests (CI/CD)
npm run test:run

# Lancer la vérification du code avec ESLint
npm run lint
```

Actuellement, **117/117 tests unitaires sont validés avec succès** (couvrant `gauss.test.js`, `plane-verify.test.js` et `utils.test.js`).

---

## 🌐 Déploiement

Le projet est configuré pour un déploiement simplifié sur **Cloudflare Pages / Workers** avec `Wrangler`.

```bash
# Compiler le projet pour la production et déployer sur Cloudflare
npm run deploy
```

---

## 💡 Préconisations d'Améliorations (Audit & Roadmap)

Le statut du projet et le plan d'amélioration courant sont maintenant centralisés dans **[ROADMAP.md](ROADMAP.md)** (statut vérifié : lint, tests, build) et **[docs/evolution-plan.md](docs/evolution-plan.md)** (plan détaillé : architecture, performance, qualité/process, feuille de route fonctionnelle). Les anciens rapports d'audit (`AUDIT_QUALITE_CODE.md`, `implementation_plan.md`, `walkthrough.md`, `docs/fix-plan.md`, `docs/improvements-recommendations.md`) sont archivés dans [docs/archive/](docs/archive/) — leurs préconisations ont déjà été appliquées et vérifiées, voir ROADMAP.md pour le détail.

---

## ❓ Dépannage (Troubleshooting)

| Problème | Cause Probable | Solution Préconisée |
| :--- | :--- | :--- |
| **Chute de FPS en 3D** | Densité de la grille de champ trop élevée ou surfaces 3D actives | Réduire la résolution de la grille dans les paramètres visuels ou masquer les surfaces 3D |
| **Échec du déploiement Wrangler** | Absence de session Cloudflare active | Exécuter `npx wrangler login` puis relancer `npm run deploy` |
| **Graphes 2D $E(x)$ / $V(x)$ absents** | Scène vide sans charge ou segment de coupe mal positionné | Ajouter une charge dans la scène et vérifier le point d'origine du segment de mesure |

---

## 📜 Licence

Projet sous licence **ISC**. Voir le fichier [package.json](file:///c:/wamp64/www/electrospace/package.json) pour plus de détails.
