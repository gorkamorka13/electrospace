import * as THREE from 'three'
import { KE_REAL } from './coulomb'

export function calculateGaussParameters(state) {
  const { distributions, charges, gaussSurfaceType, gaussSurfaceRadius, gaussSurfaceHeight, gaussSurfaceWidth, gaussSurfaceDepth, gaussCenter, chargeUnit } = state

  const activeDist = distributions[0] || null
  const configName = activeDist ? activeDist.type : 'charges'
  const R = activeDist?.radius || 1
  const hollow = activeDist?.hollow || false
  const sigma = activeDist?.density || 0
  const lambda = activeDist?.density || 0
  // volumeCharge is reserved for future volumetric distributions
  // eslint-disable-next-line no-unused-vars
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
    const { radius, innerRadius = 0, e_ext = 0, e_int = 0 } = activeDist
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
      basisVectors: ['\\vec{e}_r', '\\vec{e}_\\theta', '\\vec{e}_\\phi'],
      planes: [
        "Tout plan $\\Pi_S$ contenant le centre $O$ et passant par le point $M$ est un plan de symétrie.",
        "Le champ $\\vec{E}(M)$ appartient à tous les plans de symétrie passant par $M$.",
        "L'intersection de tous ces plans $\\Pi_S$ passant par $M$ définit la droite radiale $(O, M)$ portée par $\\vec{e}_r$."
      ],
      antiPlanes: ["Distribution à symétrie sphérique centrée en $O$."],
      directionText: "Le champ électrique est radial et passe par $M$ : $\\vec{E}(M) = E(r) \\, \\vec{e}_r",
      directionVec: "\\vec{e}_r"
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

    // eslint-disable-next-line no-useless-assignment
    let vFieldFormula = ""
    // eslint-disable-next-line no-useless-assignment
    let vValue = 0

    if (r_g < R) {
      if (hollow) {
        vFieldFormula = "V(r) = \\frac{k_e Q}{R} \\text{ (Constant à l'intérieur)}"
        vValue = R > 0 ? (KE_REAL * Q) / R : 0
      } else {
        vFieldFormula = "V(r) = \\frac{k_e Q}{2 R} \\cdot \\left[3 - \\left(\\frac{r}{R}\\right)^2\\right]"
        vValue = R > 0 ? (KE_REAL * Q / (2 * R)) * (3 - Math.pow(r_g / R, 2)) : 0
      }
    } else {
      vFieldFormula = "V(r) = \\frac{k_e Q}{r}"
      vValue = r_g > 0 ? (KE_REAL * Q) / r_g : 0
    }

    gaussStep4Detail = {
      qIntFormula: r_g < R
        ? (hollow ? "$Q_{\\text{int}} = 0 \\text{ (sphère creuse à l'intérieur)}$" : `$Q_{\\text{int}} = Q \\cdot \\left(\\frac{r}{R}\\right)^3 = ${(qInt * 1e9).toFixed(3)} \\text{ nC}$`)
        : `$Q_{\\text{int}} = Q_{\\text{total}} = ${(qInt * 1e9).toFixed(3)} \\text{ nC}$`,
      eFieldFormula: r_g < R
        ? (hollow ? "$E(r) = 0 \\text{ V/m}$" : "$E(r) = \\frac{k_e Q r}{R^3}$")
        : "$E(r) = \\frac{k_e Q}{r^2}$",
      vectorResult: `\\vec{E}(M) = ${eField.toExponential(2)} \\, \\vec{e}_r \\text{ V/m}`,
      vFieldFormula,
      vValueStr: `$V(M) = ${Math.abs(vValue) >= 1000 ? (vValue / 1000).toFixed(2) + ' \\text{ kV}' : vValue.toFixed(2) + ' \\text{ V}'}$`
    }

    let gaussStep5Detail = {
      relation: "$E(r) = -\\frac{dV}{dr} \\implies V(r) = -\\int E(r) \\, dr + C$",
      extIntegration: "Pour $r \\ge R$ : $V_{\\text{ext}}(r) = -\\int \\frac{k_e Q}{r^2} \\, dr = \\frac{k_e Q}{r} + C_{\\text{ext}}$",
      extBoundary: "Condition à l'infini : $\\lim_{r \\to \\infty} V_{\\text{ext}}(r) = 0 \\implies C_{\\text{ext}} = 0$",
      intIntegration: hollow
        ? "Pour $r < R$ : $E_{\\text{int}}(r) = 0 \\implies V_{\\text{int}}(r) = C_{\\text{int}}$"
        : "Pour $r < R$ : $E_{\\text{int}}(r) = \\frac{k_e Q r}{R^3} \\implies V_{\\text{int}}(r) = -\\frac{k_e Q r^2}{2 R^3} + C_{\\text{int}}$",
      continuity: "Raccordement par Continuité en $r = R$ : $V_{\\text{int}}(R) = V_{\\text{ext}}(R)$",
      constantResolution: hollow
        ? "$C_{\\text{int}} = V_{\\text{ext}}(R) = \\frac{k_e Q}{R}$"
        : "$-\\frac{k_e Q}{2 R} + C_{\\text{int}} = \\frac{k_e Q}{R} \\implies C_{\\text{int}} = \\frac{3 k_e Q}{2 R}$",
      finalFormula: vFieldFormula,
      finalValueStr: `$V(M) = ${Math.abs(vValue) >= 1000 ? (vValue / 1000).toFixed(2) + ' \\text{ kV}' : vValue.toFixed(2) + ' \\text{ V}'}$`
    }

    return {
      qInt, flux, area, eField, configName, R, hollow, r_g, h_g, w_g, sigma, lambda, Q,
      symmetryDetails, invariances, surfaceAnalysis, gaussStep4Detail, gaussStep5Detail
    }
  } else if (configName === 'cylinder' || configName === 'line') {
    symmetryDetails = {
      basisType: 'cylindrical',
      basisVectors: ['\\vec{e}_r', '\\vec{e}_\\theta', '\\vec{e}_z'],
      planes: [
        "Pour un cylindre ou fil infini, le plan $\\Pi_{S1} = (M, \\vec{e}_r, \\vec{e}_z)$ contenant l'axe $z$ et le point $M$ est un plan de symétrie.",
        "Le plan $\\Pi_{S2} = (M, \\vec{e}_r, \\vec{e}_\\theta)$ orthogonal à l'axe $z$ et passant par le point $M$ est aussi un plan de symétrie.",
        "L'intersection $\\Pi_{S1} \\cap \\Pi_{S2} = (M, \\vec{e}_r)$ exige que le champ $\\vec{E}(M)$ soit porté par le vecteur radial : $\\vec{E}(M) = E(r) \\, \\vec{e}_r$."
      ],
      antiPlanes: ["Symétrie axiale cylindrique uniforme."],
      directionText: "Le champ électrique est radial et porté par $\\vec{e}_r$ : $\\vec{E}(M) = E(r) \\, \\vec{e}_r$",
      directionVec: "\\vec{e}_r"
    }

    invariances = {
      list: [
        "Invariance par translation le long de l'axe $z$ (cylindre ou fil infini).",
        "Invariance par rotation autour de l'axe $z$ (angle $\\theta$)."
      ],
      deduction: "La norme du champ $E$ ne dépend que de la distance radiale $r$ à l'axe : $E(r, \\theta, z) = E(r)$"
    }

    surfaceAnalysis = {
      surfaceType: 'cylinder',
      fluxDecomposition: [
        { face: "Paroi Latérale $\\Sigma_{\\text{lat}}$ (rayon $r$, haut $h$)", dotProduct: "\\vec{E} \\parallel d\\vec{S}", eConst: "$E(r)$ est uniforme sur la paroi", fluxTerm: "\\Phi_{\\text{lat}} = E(r) \\cdot (2\\pi r h)" },
        { face: "Base supérieure & inférieure $\\Sigma_{\\text{bases}}$", dotProduct: "\\vec{E} \\perp d\\vec{S}", eConst: "-", fluxTerm: "\\Phi_{\\text{bases}} = 0" }
      ]
    }

    // eslint-disable-next-line no-useless-assignment
    let vFieldFormula = ""
    // eslint-disable-next-line no-useless-assignment
    let vValue = 0

    if (r_g < R) {
      if (hollow) {
        vFieldFormula = "V(r) = 0 \\text{ V (Référence } V(R) = 0\\text{)}"
        vValue = 0
      } else {
        vFieldFormula = "V(r) = \\frac{k_e \\lambda}{R^2} (R^2 - r^2) \\text{ (Référence } V(R) = 0\\text{)}"
        vValue = R > 0 ? (KE_REAL * lambda / (R * R)) * (R * R - r_g * r_g) : 0
      }
    } else {
      vFieldFormula = "V(r) = -2 k_e \\lambda \\ln\\left(\\frac{r}{R}\\right) \\text{ (Référence } V(R) = 0\\text{)}"
      vValue = (R > 0 && r_g > 0) ? -2 * KE_REAL * lambda * Math.log(r_g / R) : 0
    }

    gaussStep4Detail = {
      qIntFormula: r_g < R
        ? (hollow ? "$Q_{\\text{int}} = 0 \\text{ (creux)}$" : `$Q_{\\text{int}} = \\lambda_{\\text{eff}} h \\cdot \\left(\\frac{r}{R}\\right)^2 = ${(qInt * 1e9).toFixed(3)} \\text{ nC}$`)
        : `$Q_{\\text{int}} = \\lambda h = ${(qInt * 1e9).toFixed(3)} \\text{ nC}$`,
      eFieldFormula: r_g < R
        ? (hollow ? "$E(r) = 0 \\text{ V/m}$" : "$E(r) = \\frac{2 k_e \\lambda r}{R^2}$")
        : "$E(r) = \\frac{2 k_e \\lambda}{r}$",
      vectorResult: `\\vec{E}(M) = ${eField.toExponential(2)} \\, \\vec{e}_r \\text{ V/m}`,
      vFieldFormula,
      vValueStr: `$V(M) = ${Math.abs(vValue) >= 1000 ? (vValue / 1000).toFixed(2) + ' \\text{ kV}' : vValue.toFixed(2) + ' \\text{ V}'}$`
    }

    let gaussStep5Detail = {
      relation: "$E(r) = -\\frac{dV}{dr} \\implies V(r) = -\\int E(r) \\, dr + C$",
      extIntegration: "Pour $r \\ge R$ : $V_{\\text{ext}}(r) = -\\int \\frac{2 k_e \\lambda}{r} \\, dr = -2 k_e \\lambda \\ln(r) + C_{\\text{ext}}$",
      extBoundary: "Référence de potentiel fixée à la surface $r = R$ : $V(R) = 0 \\implies C_{\\text{ext}} = 2 k_e \\lambda \\ln(R)$",
      intIntegration: hollow
        ? "Pour $r < R$ : $E_{\\text{int}}(r) = 0 \\implies V_{\\text{int}}(r) = C_{\\text{int}}$"
        : "Pour $r < R$ : $E_{\\text{int}}(r) = \\frac{2 k_e \\lambda r}{R^2} \\implies V_{\\text{int}}(r) = -\\frac{k_e \\lambda r^2}{R^2} + C_{\\text{int}}$",
      continuity: "Raccordement par Continuité du Potentiel en $r = R$ : $V_{\\text{int}}(R) = V_{\\text{ext}}(R) = 0$",
      constantResolution: hollow
        ? "$C_{\\text{int}} = 0 \\implies V_{\\text{int}}(r) = 0$"
        : "$-k_e \\lambda + C_{\\text{int}} = 0 \\implies C_{\\text{int}} = k_e \\lambda$",
      finalFormula: vFieldFormula,
      finalValueStr: `$V(M) = ${Math.abs(vValue) >= 1000 ? (vValue / 1000).toFixed(2) + ' \\text{ kV}' : vValue.toFixed(2) + ' \\text{ V}'}$`
    }

    return {
      qInt, flux, area, eField, configName, R, hollow, r_g, h_g, w_g, sigma, lambda, Q,
      symmetryDetails, invariances, surfaceAnalysis, gaussStep4Detail, gaussStep5Detail
    }
  } else if (configName === 'plane') {
    symmetryDetails = {
      basisType: 'cartesian',
      basisVectors: ['\\vec{e}_x', '\\vec{e}_y', '\\vec{e}_z'],
      planes: [
        "Le plan $\\Pi_{S1} = (M, \\vec{e}_x, \\vec{e}_y)$ est un plan de symétrie : il contient la normale $\\vec{e}_x$ au plan chargé et passe par $M$.",
        "Le plan $\\Pi_{S2} = (M, \\vec{e}_x, \\vec{e}_z)$ est aussi un plan de symétrie : il contient $\\vec{e}_x$ et est perpendiculaire à $\\Pi_{S1}$, passant par $M$.",
        "L'intersection $\\Pi_{S1} \\cap \\Pi_{S2} = (M, \\vec{e}_x)$ impose que $\\vec{E}(M)$ est porté par la normale : $\\vec{E}(M) = E(x) \\, \\vec{e}_x$."
      ],
      antiPlanes: ["Le plan chargé lui-même ($x = 0$) est un plan d'anti-symétrie : $\\vec{E}(-x) = -\\vec{E}(x)$."],
      directionText: "Le champ électrique est colinéaire à la normale $\\vec{e}_x$ et passe par $M$ : $\\vec{E}(M) = \\text{sgn}(x)\\, E \\, \\vec{e}_x$",
      directionVec: "\\vec{e}_x"
    }

    invariances = {
      list: [
        "Invariance par translation le long de l'axe $y$.",
        "Invariance par translation le long de l'axe $z$."
      ],
      deduction: "La norme du champ $E$ ne dépend que de la distance $|x|$ au plan chargé : $E(x, y, z) = E(|x|)$"
    }

    surfaceAnalysis = {
      surfaceType: 'box',
      fluxDecomposition: [
        { face: "2 Faces perpendiculaires à $\\vec{e}_x$ (Aire $S$)", dotProduct: "\\vec{E} \\parallel d\\vec{S}", eConst: "$E = E(|x|)$ uniforme", fluxTerm: "\\Phi_{\\text{actives}} = 2 E(|x|) S" },
        { face: "4 Faces latérales (parallèles à $\\vec{e}_x$)", dotProduct: "\\vec{E} \\perp d\\vec{S}", eConst: "-", fluxTerm: "\\Phi_{\\text{lat}} = 0" }
      ]
    }

    const xM = Math.abs(gaussCenter ? gaussCenter[0] : 0)
    const vValue = -2 * Math.PI * KE_REAL * sigma * xM
    const vFieldFormula = "V(x) = -\\frac{\\sigma |x|}{2 \\varepsilon_0} = -2\\pi k_e \\sigma |x| \\text{ (Référence } V(0) = 0\\text{)}"

    gaussStep4Detail = {
      qIntFormula: `$Q_{\\text{int}} = \\sigma S = ${(qInt * 1e9).toFixed(3)} \\text{ nC}$`,
      eFieldFormula: "$E = \\frac{\\sigma}{2 \\varepsilon_0} = 2\\pi k_e \\sigma \\text{ (Champ uniforme indépendant de } x \\text{!)}$",
      vectorResult: `\\vec{E}(M) = ${eField.toExponential(2)} \\, \\vec{e}_x \\text{ V/m}`,
      vFieldFormula,
      vValueStr: `V(M) = ${Math.abs(vValue) >= 1000 ? (vValue / 1000).toFixed(2) + ' kV' : vValue.toFixed(2) + ' V'}`
    }

    let gaussStep5Detail = {
      relation: "$E_x = -\\frac{dV}{dx} \\implies V(x) = -\\int E_x \\, dx + C$",
      extIntegration: "Pour $x > 0$ : $E_x = \\frac{\\sigma}{2 \\varepsilon_0} \\implies V(x) = -\\frac{\\sigma x}{2 \\varepsilon_0} + C$",
      extBoundary: "Référence de potentiel fixée sur le plan $x = 0$ : $V(0) = 0 \\implies C = 0$",
      intIntegration: "Anti-symétrie par rapport au plan chargé : $V(-x) = V(x)$",
      continuity: "Continuité de $V(x)$ en $x = 0$ garantie",
      constantResolution: "$C = 0$",
      finalFormula: vFieldFormula,
      finalValueStr: `$V(M) = ${Math.abs(vValue) >= 1000 ? (vValue / 1000).toFixed(2) + ' \\text{ kV}' : vValue.toFixed(2) + ' \\text{ V}'}$`
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

