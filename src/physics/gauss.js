import * as THREE from 'three'
import { KE_REAL } from './coulomb'

export function calculateGaussParameters(state) {
  const { distributions, charges, gaussSurfaceType, gaussSurfaceRadius, gaussSurfaceHeight, gaussSurfaceWidth, gaussSurfaceDepth, gaussCenter, chargeUnit, ke, rMin } = state

  const activeDist = distributions[0] || null
  const configName = activeDist ? activeDist.type : 'charges'
  const R = activeDist?.radius || 1
  const hollow = activeDist?.hollow || false
  const sigma = activeDist?.density || 0
  const lambda = activeDist?.density || 0
  const volumeCharge = activeDist?.density || 0

  const r_g = gaussSurfaceRadius
  const h_g = gaussSurfaceHeight
  const w_g = gaussSurfaceWidth

  let qInt = 0
  let area = 0
  let Q = 0

  if (configName === 'sphere' && activeDist) {
    const { hollow, innerRadius = 0, e_ext = 0, e_int = 0 } = activeDist
    const a = innerRadius || 0
    const b = R
    if (hollow) {
      Q = sigma * (4 * Math.PI * b * b)
      qInt = r_g < b ? 0 : Q
    } else if (e_ext > 0 || (a > 0 && e_int > 0)) {
      const innerOuter = b - e_ext
      const innerInner = a - e_int
      let volUpToRg = 0
      if (e_ext > 0 && r_g > innerOuter) {
        const top = Math.min(r_g, b)
        if (top > innerOuter) volUpToRg += 4 / 3 * Math.PI * (top * top * top - Math.max(innerOuter, 0) * Math.max(innerOuter, 0) * Math.max(innerOuter, 0))
      }
      if (a > 0 && e_int > 0 && r_g > innerInner) {
        const top = Math.min(r_g, a)
        if (top > innerInner) volUpToRg += 4 / 3 * Math.PI * (top * top * top - Math.max(innerInner, 0) * Math.max(innerInner, 0) * Math.max(innerInner, 0))
      }
      const Vouter = e_ext > 0 ? 4 / 3 * Math.PI * (b * b * b - Math.max(innerOuter, 0) * Math.max(innerOuter, 0) * Math.max(innerOuter, 0)) : 0
      const Vinner = (a > 0 && e_int > 0) ? 4 / 3 * Math.PI * (a * a * a - Math.max(innerInner, 0) * Math.max(innerInner, 0) * Math.max(innerInner, 0)) : 0
      Q = sigma * (Vouter + Vinner)
      qInt = sigma * volUpToRg
    } else {
      const Vshell = 4 / 3 * Math.PI * (b * b * b - a * a * a)
      Q = sigma * Vshell
      if (r_g <= a) {
        qInt = 0
      } else if (r_g >= b) {
        qInt = Q
      } else {
        qInt = sigma * 4 / 3 * Math.PI * (r_g * r_g * r_g - a * a * a)
      }
    }
    area = 4 * Math.PI * r_g * r_g
  } else if (configName === 'cylinder' && activeDist) {
    const { axis, radius, innerRadius = 0, e_ext = 0, e_int = 0 } = activeDist
    const a = innerRadius || 0
    const b = radius
    if (hollow) {
      const lambdaTotal = sigma * (2 * Math.PI * b)
      Q = lambdaTotal * h_g
      qInt = r_g < b ? 0 : lambdaTotal * h_g
    } else if (e_ext > 0 || (a > 0 && e_int > 0)) {
      const innerOuter = b - e_ext
      const innerInner = a - e_int
      let areaUpToRg = 0
      if (e_ext > 0 && r_g > innerOuter) {
        const top = Math.min(r_g, b)
        if (top > innerOuter) areaUpToRg += Math.PI * (top * top - Math.max(innerOuter, 0) * Math.max(innerOuter, 0))
      }
      if (a > 0 && e_int > 0 && r_g > innerInner) {
        const top = Math.min(r_g, a)
        if (top > innerInner) areaUpToRg += Math.PI * (top * top - Math.max(innerInner, 0) * Math.max(innerInner, 0))
      }
      const Aouter = e_ext > 0 ? Math.PI * (b * b - Math.max(innerOuter, 0) * Math.max(innerOuter, 0)) : 0
      const Ainner = (a > 0 && e_int > 0) ? Math.PI * (a * a - Math.max(innerInner, 0) * Math.max(innerInner, 0)) : 0
      Q = sigma * (Aouter + Ainner) * h_g
      qInt = sigma * areaUpToRg * h_g
    } else if (a > 0) {
      const lambdaTotal = sigma * Math.PI * (b * b - a * a)
      Q = lambdaTotal * h_g
      if (r_g <= a) {
        qInt = 0
      } else if (r_g >= b) {
        qInt = Q
      } else {
        qInt = sigma * Math.PI * (r_g * r_g - a * a) * h_g
      }
    } else {
      const lambdaTotal = sigma * Math.PI * b * b
      Q = lambdaTotal * h_g
      qInt = r_g < b ? sigma * Math.PI * r_g * r_g * h_g : lambdaTotal * h_g
    }
    area = 2 * Math.PI * r_g * h_g
  } else if (configName === 'plane' && activeDist) {
    const S = gaussSurfaceWidth * gaussSurfaceDepth
    Q = sigma * S
    qInt = sigma * S
    area = 2 * S
  } else if (configName === 'line' && activeDist) {
    const lambdaLine = sigma
    Q = lambdaLine * h_g
    area = 2 * Math.PI * r_g * h_g
    qInt = lambdaLine * h_g
  } else if (configName === 'charges') {
    const multiplier = chargeUnit === 'uC' ? 1e-6 : chargeUnit === 'nC' ? 1e-9 : chargeUnit === 'C' ? 1 : 1.602176634e-19
    const gaussPos = new THREE.Vector3(...gaussCenter)
    for (const c of charges) {
      const d = new THREE.Vector3(...c.position).distanceTo(gaussPos)
      if (d < r_g) qInt += c.q * multiplier
    }
    Q = charges.reduce((s, c) => s + c.q, 0)
    area = gaussSurfaceType === 'sphere' ? 4 * Math.PI * r_g * r_g
      : gaussSurfaceType === 'cylinder' ? 2 * Math.PI * r_g * h_g
      : 2 * (gaussSurfaceWidth * gaussSurfaceDepth + gaussSurfaceWidth * gaussSurfaceHeight + gaussSurfaceHeight * gaussSurfaceDepth)
  }

  const flux = qInt > 0 ? qInt / (1 / (4 * Math.PI * KE_REAL)) : 0
  const eps0 = 1 / (4 * Math.PI * KE_REAL)
  const eField = area > 1e-30 ? Math.abs(qInt) / (eps0 * area) : 0

  // Pedagogical Metadata for Gauss Steps
  let symmetryDetails = {
    basisType: 'spherical',
    basisVectors: ['e_r', 'e_θ', 'e_φ'],
    planes: ["Tout plan contenant le centre et le point M est un plan de symétrie (Π_S)."],
    antiPlanes: ["Aucun plan d'anti-symétrie nécessaire."],
    directionText: "Le champ E est purement radial : E(M) = E(M) e_r",
    directionVec: "e_r"
  }

  let invariances = {
    list: ["Invariance par rotation autour de l'angle polaire θ", "Invariance par rotation autour de l'angle azimutal φ"],
    deduction: "La norme E ne dépend ni de θ ni de φ : E(r, θ, φ) = E(r)"
  }

  let surfaceAnalysis = {
    surfaceType: gaussSurfaceType,
    fluxDecomposition: [
      { face: "Surface Sphérique S(r)", dotProduct: "E ∥ dS", eConst: "Oui (E = E(r))", fluxTerm: "E(r) · (4π r²)" }
    ]
  }

  let gaussStep4Detail = {
    qIntFormula: "Q_int = " + (qInt * 1e9).toFixed(3) + " nC",
    eFieldFormula: "E(r) = Q_int / (ε₀ · 4π r²)",
    vectorResult: `E(M) = ${eField > 0 ? eField.toExponential(2) : '0'} e_r (V/m)`
  }

  if (configName === 'sphere') {
    symmetryDetails = {
      basisType: 'spherical',
      basisVectors: ['e_r', 'e_θ', 'e_φ'],
      planes: [
        "Tout plan Π_S contenant le centre O de la sphère est un plan de symétrie de la distribution.",
        "Le champ E(M) appartient à tous les plans de symétrie passant par M.",
        "L'intersection de tous ces plans Π_S définit la droite radiale (O, e_r)."
      ],
      antiPlanes: ["Distribution à symétrie de sphère chargée positivement ou négativement."],
      directionText: "Le champ électrique est strictement radial : E(M) = E(r) · e_r",
      directionVec: "e_r"
    }

    invariances = {
      list: [
        "Invariance par rotation autour de n'importe quel axe passant par O (angle θ).",
        "Invariance par rotation azimutale (angle φ)."
      ],
      deduction: "La norme E est identique sur toute la sphère de rayon r : E(r, θ, φ) = E(r)"
    }

    surfaceAnalysis = {
      surfaceType: 'sphere',
      fluxDecomposition: [
        { face: "Sphère de Gauss de rayon r", dotProduct: "E ∥ dS (E · dS = E · dS)", eConst: "E(r) est uniforme sur la sphère", fluxTerm: "Φ = E(r) ∮ dS = E(r) · (4π r²)" }
      ]
    }

    let vFieldFormula = ""
    let vValue = 0

    if (r_g < R) {
      if (hollow) {
        vFieldFormula = "V(r) = (k_e · Q) / R (Constant à l'intérieur)"
        vValue = R > 0 ? (KE_REAL * Q) / R : 0
      } else {
        vFieldFormula = "V(r) = (k_e · Q / 2R) · [3 - (r/R)²]"
        vValue = R > 0 ? (KE_REAL * Q / (2 * R)) * (3 - Math.pow(r_g / R, 2)) : 0
      }
    } else {
      vFieldFormula = "V(r) = (k_e · Q) / r (avec V(∞) = 0)"
      vValue = r_g > 0 ? (KE_REAL * Q) / r_g : 0
    }

    gaussStep4Detail = {
      qIntFormula: r_g < R 
        ? (hollow ? "Q_int = 0 (sphère creuse à l'intérieur)" : `Q_int = Q · (r/R)³ = ${(qInt * 1e9).toFixed(3)} nC`) 
        : `Q_int = Q_total = ${(qInt * 1e9).toFixed(3)} nC`,
      eFieldFormula: r_g < R 
        ? (hollow ? "E(r) = 0 V/m" : "E(r) = (k_e · Q · r) / R³") 
        : "E(r) = (k_e · Q) / r²",
      vectorResult: `E(M) = ${eField.toExponential(2)} e_r V/m`,
      vFieldFormula,
      vValueStr: `V(M) = ${Math.abs(vValue) >= 1000 ? (vValue / 1000).toFixed(2) + ' kV' : vValue.toFixed(2) + ' V'}`
    }

    let gaussStep5Detail = {
      relation: "E(r) = -dV/dr  ⇒  V(r) = -∫ E(r) dr + C",
      extIntegration: "Pour r ≥ R : V_ext(r) = -∫ (k_e Q / r²) dr = (k_e Q / r) + C_ext",
      extBoundary: "Condition à l'infini : lim(r → ∞) V_ext(r) = 0  ⇒  C_ext = 0",
      intIntegration: hollow 
        ? "Pour r < R : E_int(r) = 0  ⇒  V_int(r) = C_int"
        : "Pour r < R : E_int(r) = (k_e Q r)/R³  ⇒  V_int(r) = -(k_e Q r²)/(2 R³) + C_int",
      continuity: "Raccordement par Continuité du Potentiel en r = R : V_int(R) = V_ext(R)",
      constantResolution: hollow
        ? "C_int = V_ext(R) = (k_e Q) / R"
        : "-(k_e Q)/(2 R) + C_int = (k_e Q)/R  ⇒  C_int = (3 k_e Q) / (2 R)",
      finalFormula: vFieldFormula,
      finalValueStr: `V(M) = ${Math.abs(vValue) >= 1000 ? (vValue / 1000).toFixed(2) + ' kV' : vValue.toFixed(2) + ' V'}`
    }

    return { 
      qInt, flux, area, eField, configName, R, hollow, r_g, h_g, w_g, sigma, lambda, Q,
      symmetryDetails, invariances, surfaceAnalysis, gaussStep4Detail, gaussStep5Detail
    }
  } else if (configName === 'cylinder' || configName === 'line') {
    symmetryDetails = {
      basisType: 'cylindrical',
      basisVectors: ['e_r', 'e_θ', 'e_z'],
      planes: [
        "Tout plan Π_S1 passant par l'axe z du cylindre est un plan de symétrie.",
        "Le plan Π_S2 orthogonal à l'axe z et passant par M est aussi un plan de symétrie.",
        "L'intersection Π_S1 ∩ Π_S2 donne le vecteur radial e_r."
      ],
      antiPlanes: ["Symétrie axiale cylindrique uniforme."],
      directionText: "Le champ électrique est radial et perpendiculaire à l'axe z : E(M) = E(r) · e_r",
      directionVec: "e_r"
    }

    invariances = {
      list: [
        "Invariance par translation le long de l'axe z (cylindre ou fil infini).",
        "Invariance par rotation autour de l'axe z (angle θ)."
      ],
      deduction: "La norme du champ E ne dépend que de la distance radiale r à l'axe : E(r, θ, z) = E(r)"
    }

    surfaceAnalysis = {
      surfaceType: 'cylinder',
      fluxDecomposition: [
        { face: "Paroi Latérale Σ_lat (rayon r, haut h)", dotProduct: "E ∥ dS (E · dS = E · dS)", eConst: "E(r) est uniforme sur la paroi", fluxTerm: "Φ_lat = E(r) · (2π r h)" },
        { face: "Base supérieure & inférieure Σ_base", dotProduct: "E ⊥ dS (E · dS = 0)", eConst: "-", fluxTerm: "Φ_bases = 0" }
      ]
    }

    let vFieldFormula = ""
    let vValue = 0

    if (r_g < R) {
      if (hollow) {
        vFieldFormula = "V(r) = 0 V (Référence V(R) = 0)"
        vValue = 0
      } else {
        vFieldFormula = "V(r) = (k_e · λ / R²) · (R² - r²) (Référence V(R) = 0)"
        vValue = R > 0 ? (KE_REAL * lambda / (R * R)) * (R * R - r_g * r_g) : 0
      }
    } else {
      vFieldFormula = "V(r) = -2 · k_e · λ · ln(r / R) (Référence V(R) = 0)"
      vValue = (R > 0 && r_g > 0) ? -2 * KE_REAL * lambda * Math.log(r_g / R) : 0
    }

    gaussStep4Detail = {
      qIntFormula: r_g < R 
        ? (hollow ? "Q_int = 0 (creux)" : `Q_int = λ_eff · h · (r/R)² = ${(qInt * 1e9).toFixed(3)} nC`) 
        : `Q_int = λ · h = ${(qInt * 1e9).toFixed(3)} nC`,
      eFieldFormula: r_g < R 
        ? (hollow ? "E(r) = 0 V/m" : "E(r) = (2 k_e λ r) / R²") 
        : "E(r) = (2 k_e λ) / r",
      vectorResult: `E(M) = ${eField.toExponential(2)} e_r V/m`,
      vFieldFormula,
      vValueStr: `V(M) = ${Math.abs(vValue) >= 1000 ? (vValue / 1000).toFixed(2) + ' kV' : vValue.toFixed(2) + ' V'}`
    }

    let gaussStep5Detail = {
      relation: "E(r) = -dV/dr  ⇒  V(r) = -∫ E(r) dr + C",
      extIntegration: "Pour r ≥ R : V_ext(r) = -∫ (2 k_e λ / r) dr = -2 k_e λ ln(r) + C_ext",
      extBoundary: "Référence de potentiel fixée à la surface r = R : V(R) = 0  ⇒  C_ext = 2 k_e λ ln(R)",
      intIntegration: hollow 
        ? "Pour r < R : E_int(r) = 0  ⇒  V_int(r) = C_int"
        : "Pour r < R : E_int(r) = (2 k_e λ r)/R²  ⇒  V_int(r) = -(k_e λ r²)/R² + C_int",
      continuity: "Raccordement par Continuité du Potentiel en r = R : V_int(R) = V_ext(R) = 0",
      constantResolution: hollow
        ? "C_int = 0  ⇒  V_int(r) = 0"
        : "-k_e λ + C_int = 0  ⇒  C_int = k_e λ",
      finalFormula: vFieldFormula,
      finalValueStr: `V(M) = ${Math.abs(vValue) >= 1000 ? (vValue / 1000).toFixed(2) + ' kV' : vValue.toFixed(2) + ' V'}`
    }

    return { 
      qInt, flux, area, eField, configName, R, hollow, r_g, h_g, w_g, sigma, lambda, Q,
      symmetryDetails, invariances, surfaceAnalysis, gaussStep4Detail, gaussStep5Detail
    }
  } else if (configName === 'plane') {
    symmetryDetails = {
      basisType: 'cartesian',
      basisVectors: ['e_x', 'e_y', 'e_z'],
      planes: [
        "Tout plan perpendiculaire au plan chargé est un plan de symétrie (Π_S).",
        "L'intersection de deux de ces plans perpendiculaires donne la normale e_z (ou e_n) au plan chargé.",
        "Le plan chargé lui-même est un plan de symétrie, imposant l'antisymétrie du champ de chaque côté : E(-z) = -E(z)."
      ],
      antiPlanes: ["Changement de signe du champ à la traversée du plan."],
      directionText: "Le champ est strictement normal au plan : E(M) = sgn(z) · E(z) · e_z",
      directionVec: "e_z"
    }

    invariances = {
      list: [
        "Invariance par translation le long de l'axe x.",
        "Invariance par translation le long de l'axe y."
      ],
      deduction: "La norme du champ E ne dépend que de la distance orthogonale |z| au plan : E(x, y, z) = E(|z|)"
    }

    surfaceAnalysis = {
      surfaceType: 'box',
      fluxDecomposition: [
        { face: "2 Faces parallèles au plan (Aire S)", dotProduct: "E ∥ dS (E · dS = E · S)", eConst: "E = E(|z|) uniforme", fluxTerm: "Φ_actives = 2 · E(|z|) · S" },
        { face: "4 Faces latérales", dotProduct: "E ⊥ dS (E · dS = 0)", eConst: "-", fluxTerm: "Φ_lat = 0" }
      ]
    }

    const vValue = -2 * Math.PI * KE_REAL * sigma * r_g
    const vFieldFormula = "V(z) = -σ · |z| / (2 ε₀) = -2π k_e σ |z| (Référence V(0) = 0)"

    gaussStep4Detail = {
      qIntFormula: `Q_int = σ · S = ${(qInt * 1e9).toFixed(3)} nC`,
      eFieldFormula: "E = σ / (2 ε₀) = 2π k_e σ (Champ uniforme indépendant de z !)",
      vectorResult: `E(M) = ${eField.toExponential(2)} e_z V/m`,
      vFieldFormula,
      vValueStr: `V(M) = ${Math.abs(vValue) >= 1000 ? (vValue / 1000).toFixed(2) + ' kV' : vValue.toFixed(2) + ' V'}`
    }

    let gaussStep5Detail = {
      relation: "E_z = -dV/dz  ⇒  V(z) = -∫ E_z dz + C",
      extIntegration: "Pour z > 0 : E_z = σ / (2 ε₀)  ⇒  V(z) = -(σ / (2 ε₀)) · z + C",
      extBoundary: "Référence de potentiel fixée sur le plan z = 0 : V(0) = 0  ⇒  C = 0",
      intIntegration: "Symétrie par rapport au plan : V(-z) = V(z)",
      continuity: "Continuité de V(z) en z = 0 garantie",
      constantResolution: "C = 0",
      finalFormula: vFieldFormula,
      finalValueStr: `V(M) = ${Math.abs(vValue) >= 1000 ? (vValue / 1000).toFixed(2) + ' kV' : vValue.toFixed(2) + ' V'}`
    }

    return { 
      qInt, flux, area, eField, configName, R, hollow, r_g, h_g, w_g, sigma, lambda, Q,
      symmetryDetails, invariances, surfaceAnalysis, gaussStep4Detail, gaussStep5Detail
    }
  }

  let gaussStep5Detail = {
    relation: "E = -grad V",
    extIntegration: "-",
    extBoundary: "-",
    intIntegration: "-",
    continuity: "-",
    constantResolution: "-",
    finalFormula: "V = Σ (k_e q_i / r_i)",
    finalValueStr: "V(M)"
  }

  return { 
    qInt, flux, area, eField, configName, R, hollow, r_g, h_g, w_g, sigma, lambda, Q,
    symmetryDetails, invariances, surfaceAnalysis, gaussStep4Detail, gaussStep5Detail
  }
}

