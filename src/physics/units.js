/**
 * Échelle de distance de la scène : nombre de mètres représentés par une unité de scène.
 * Les coordonnées et dimensions stockées restent en unités de scène ; seule leur
 * interprétation physique change.
 */
export const LENGTH_UNITS = { m: 1, cm: 1e-2, mm: 1e-3 }

export const LENGTH_UNIT_NAMES = { m: 'mètre', cm: 'centimètre', mm: 'millimètre' }

export function lengthFactor(lengthUnit) {
  return LENGTH_UNITS[lengthUnit] ?? 1
}

/** Exposant de longueur de la densité : λ (C/m) → 1, σ (C/m²) → 2, ρ (C/m³) → 3 */
export function densityDimension(dist) {
  switch (dist.type) {
    case 'line':
    case 'circle':
    case 'frame':
      return 1
    case 'plane':
    case 'disk':
      return 2
    default:
      // cylinder / sphere / box : charge surfacique si creux, volumique sinon
      return dist.hollow ? 2 : 3
  }
}

/**
 * Adapte les sources aux fonctions calculate*, qui raisonnent en unités de scène.
 * Les densités (toujours saisies en SI) sont ramenées à l'unité de scène, et k_e est
 * corrigé du facteur 1/r² (champ, force) ou 1/r (potentiel), de sorte que les résultats
 * sortent directement en V/m, N et V.
 */
export function scaleForLength(distributions, ke, lengthUnit) {
  const L = lengthFactor(lengthUnit)
  if (L === 1) return { distributions, keField: ke, kePotential: ke }
  return {
    distributions: distributions.map((d) => ({ ...d, density: d.density * L ** densityDimension(d) })),
    keField: ke / (L * L),
    kePotential: ke / L,
  }
}

/**
 * Facteur d'affichage des flèches de champ : compense l'échelle de distance pour que la
 * longueur des flèches ne dépende que de la géométrie de la scène. Avec plusieurs
 * distributions de dimensions différentes, la plus basse (dominante aux petites échelles)
 * sert de référence.
 */
export function fieldArrowFactor(distributions, lengthUnit) {
  const L = lengthFactor(lengthUnit)
  const dim = distributions.length > 0 ? Math.min(...distributions.map(densityDimension)) : 0
  return L ** (2 - dim)
}
