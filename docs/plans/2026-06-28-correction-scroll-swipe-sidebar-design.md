# Conception : Correction du défilement et ajout du Swipe sur la Sidebar

Ce document détaille la conception pour corriger le problème de défilement (scrolling) vertical sur mobile/tablette et ajouter un geste de glissement (swipe left) pour fermer le menu latéral.

## Objectifs et Besoins

1. **Défilement vertical fonctionnel** : Rendre le menu latéral scrollable de haut en bas sur mobile et sur petits écrans sans blocage.
2. **Geste de fermeture (Swipe)** : Permettre de fermer la barre latérale en effectuant un glissement vers la gauche sur toute sa surface.
3. **Robustesse et Performance** : Utiliser des solutions légères sans dépendances supplémentaires.

---

## Conception Détaillée

### 1. Résolution du défilement (Scroll)

Pour supprimer le conflit de défilement imbriqué (double scrollbar) qui bloque l'utilisation sur mobile, nous adoptons l'**Approche A** :
*   **Conteneur principal (`.sidebar`)** : Reste le conteneur principal de défilement avec `overflow-y: auto`. Nous lui ajoutons la propriété CSS `-webkit-overflow-scrolling: touch` pour assurer un défilement fluide (momentum scrolling) sur iOS.
*   **Liste des charges (`.charges-list`)** : Nous passons sa propriété `overflow-y` de `auto` à `visible` (ou `initial`), et nous retirons son comportement `flex-grow` limitant afin qu'elle s'étire naturellement selon le nombre de charges. Ainsi, il n'y a plus qu'une seule scrollbar pour l'ensemble du menu latéral.

### 2. Implémentation du Swipe-to-close

Nous implémentons la détection de geste de glissement via les événements tactiles natifs de React sur l'élément `<aside className="sidebar">`.

#### Logique de détection de swipe :
1. **`onTouchStart`** :
   Enregistre les coordonnées tactiles de départ (`clientX`, `clientY`) et l'horodatage.
2. **`onTouchMove`** :
   * Mesure l'écart horizontal ($\Delta X = X_{current} - X_{start}$) et vertical ($\Delta Y = Y_{current} - Y_{start}$).
   * Si le geste est principalement horizontal ($\text{abs}(\Delta X) > \text{abs}(\Delta Y)$) et orienté vers la gauche ($\Delta X < -50\text{px}$), nous fermons le menu latéral en appelant `setSidebarOpen(false)`.
   * Cette comparaison garantit que le défilement vertical vers le haut ou le bas n'est jamais interrompu par le swipe horizontal.
3. **`onTouchEnd`** :
   Nettoie l'état de détection de swipe.

---

## Changements Proposés

### Styles CSS (`src/index.css`)
* Modifier `.charges-list` pour désactiver son overflow indépendant et son scrollbar vertical.
* Assurer que le défilement du parent `.sidebar` est fluide sur les périphériques tactiles.

### Composant React (`src/components/Sidebar.jsx`)
* Importer les handlers de swipe et les associer aux props `onTouchStart`, `onTouchMove` et `onTouchEnd` de l'élément racine `<aside>`.
* Utiliser les fonctions du store Zustand pour fermer le menu.

---

## Plan de Vérification

### Tests Manuels
1. **Vérification du défilement** :
   * Redimensionner l'écran en mode responsive (hauteur < 600px).
   * Ajouter plusieurs charges pour provoquer un débordement.
   * Vérifier que l'ensemble du menu latéral défile correctement vers le haut et le bas avec la molette ou le doigt.
2. **Vérification du swipe** :
   * Sur un simulateur mobile (ou appareil physique), effectuer un glissement de droite à gauche sur la Sidebar.
   * Vérifier que la Sidebar se ferme de manière fluide.
   * Vérifier que le glissement vertical pour scroller ne ferme pas intempestivement le menu.
