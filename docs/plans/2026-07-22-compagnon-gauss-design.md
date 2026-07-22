# Document de Conception : Refonte Pédagogique du Compagnon du Théorème de Gauss

## 1. Objectif
Améliorer le **Compagnon du Théorème de Gauss** (`GaussWizard`) dans l'application ElectroSpace afin d'offrir un déroulement pédagogique rigoureux et structuré conforme aux standards d'enseignement de la physique électrostatique (Classes Préparatoires / Licence Universitaire).

---

## 2. Chaîne Pédagogique en 4 Étapes

Le Compagnon suivra strictement l'enchaînement méthodique suivant :

### Étape 1 : Analyse de la Direction de $\vec{E}$ (Symétries & Anti-symétries)
- **Principe physique** : 
  - Si un plan $\Pi_S$ est un plan de **symétrie** de la distribution de charge, alors $\vec{E}(M) \in \Pi_S$.
  - Si un plan $\Pi_A$ est un plan d'**anti-symétrie**, alors $\vec{E}(M) \perp \Pi_A$.
- **Déduction** : La direction du champ $\vec{E}(M)$ est située à l’**intersection des plans de symétrie** de la distribution (ou normale aux plans d'antisymétrie).
- **Représentation des bases** :
  - **Sphérique** : $(\vec{e}_r, \vec{e}_\theta, \vec{e}_\phi)$ $\implies$ tout plan contenant l'axe de symétrie et le centre est plan de symétrie $\implies \vec{E}(M) = E(M) \vec{e}_r$.
  - **Cylindrique** : $(\vec{e}_r, \vec{e}_\theta, \vec{e}_z)$ $\implies$ tout plan contenant l'axe $z$ et le plan perpendiculaire à l'axe sont plans de symétrie $\implies \vec{E}(M) = E(M) \vec{e}_r$.
  - **Plane / Cartésienne** : $(\vec{e}_x, \vec{e}_y, \vec{e}_z)$ $\implies$ plans de symétrie parallèles $\implies \vec{E}(M) = E(M) \vec{e}_z$.
- **Rendu Visuel 2D & 3D** :
  - Schéma 2D SVG des vecteurs de la base locale $(\vec{e}_r, \vec{e}_\theta, \vec{e}_\phi / \vec{e}_z)$ directement dans la carte pédagogique.
  - Affichage interactif des plans de symétrie et du trièdre de la base locale 3D autour d'un point d'évaluation $M$ dans le canevas Three.js.

---

### Étape 2 : Invariances & Dépendance des Coordonnées
- **Principe physique** :
  - **Invariance par rotation** autour d'un axe / centre $\implies$ le champ ne dépend pas de la variable angulaire ($\theta, \phi$).
  - **Invariance par translation** le long d'une direction $\implies$ le champ ne dépend pas de la position axiale ($z$).
- **Déduction des variables** :
  - **Sphère** : Invariance par toutes les rotations $(\theta, \phi) \implies E(r, \theta, \phi) = E(r)$.
  - **Cylindre infini** : Invariance par rotation $\theta$ et translation $z \implies E(r, \theta, z) = E(r)$.
  - **Plan infini** : Invariance par translations $x, y \implies E(x, y, z) = E(z)$.

---

### Étape 3 : Choix de la Surface de Gauss ($\Sigma$) & Analyse du Flux Local
- **Principe du choix** : Sélection d'une surface fermée imaginaire $\Sigma$ sur laquelle :
  1. La norme $E$ est constante sur les parties où $\vec{E} \not= 0$.
  2. $\vec{E}$ est soit colinéaire à la normale $d\vec{S}$ ($\vec{E} \parallel d\vec{S}$), soit orthogonal ($\vec{E} \perp d\vec{S}$).
- **Décomposition des surfaces** :
  - **Sphère** : $\Sigma = \text{Sphère}(r)$. $\vec{E} \cdot d\vec{S} = E(r) dS$.
  - **Cylindre** : $\Sigma = \Sigma_{\text{lat}} \cup \Sigma_{\text{base1}} \cup \Sigma_{\text{base2}}$. 
    - Sur $\Sigma_{\text{lat}}$ : $\vec{E} \parallel d\vec{S} \implies \vec{E} \cdot d\vec{S} = E(r) dS$.
    - Sur les bases : $\vec{E} \perp d\vec{S} \implies \vec{E} \cdot d\vec{S} = 0$.
  - **Boîte / Pilulier** : $\Sigma = \Sigma_{\text{haut}} \cup \Sigma_{\text{bas}} \cup \Sigma_{\text{lat}}$.

---

### Étape 4 : Calcul Intégral du Flux, Charge Enfermée $Q_{\text{int}}$ & Déduction de $\vec{E}$
- **Calcul du flux total** :
  $$\Phi = \iint_{\Sigma} \vec{E} \cdot d\vec{S} = E(r) \iint_{\Sigma_{\text{active}}} dS = E(r) \cdot A_{\text{active}}$$
- **Calcul de la charge enfermée $Q_{\text{int}}$** :
  - Distinction claire selon que la surface de Gauss est interne ($r < R$) ou externe ($r > R$).
  - Prise en compte du caractère creux ou plein de la distribution.
- **Application du Théorème de Gauss** :
  $$\Phi = \frac{Q_{\text{int}}}{\varepsilon_0} \implies E(r) = \frac{Q_{\text{int}}}{\varepsilon_0 \cdot A_{\text{active}}}$$
- **Expression Vectorielle finale** : $\vec{E}(M) = E(r) \vec{e}_r$ (ou $\vec{e}_z$).

---

## 3. Composants et Fichiers à Modifier

1. **`src/components/GaussWizard.jsx`** :
   - Mise à jour des 4 étapes pour refléter rigoureusement cet enchaînement.
   - Ajout des schémas 2D SVG pour la base $(\vec{e}_r, \vec{e}_\theta, \vec{e}_\phi / \vec{e}_z)$ et les plans de symétrie.
   - Explications détaillées des invariances et des calculs d'intégrales de flux.

2. **`src/components/GaussianSurfaceVis.jsx`** & **`src/components/PhysicsCanvas.jsx`** :
   - Rendu 3D du trièdre de la base locale au point $M$ d'évaluation.
   - Option visuelle des plans de symétrie transparents.

3. **`src/physics/gauss.js`** :
   - Enrichissement du modèle de calcul pour fournir l'analyse formelle des invariances et la déduction vectorielle de $\vec{E}$.

---

## 4. Contrainte d'Intégrité
Aucun autre composant de l'application (Coulomb, Trajectoires, Potentiel, Dipôles, Thèmes, etc.) ne sera modifié.
