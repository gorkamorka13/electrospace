# Electrospace — Project Brief

## Vision
Electrospace is an interactive 3D educational platform for learning electrostatics at the CPGE/Licence (undergraduate) level. It transforms abstract physical concepts — Coulomb's law, electric fields, Gauss's theorem, continuous charge distributions — into tangible, manipulable 3D visualizations.

## Core Requirements

### Educational Goals
- Provide an intuitive, real-time 3D sandbox for electrostatic simulation
- Bridge the gap between mathematical formalism (vector calculus, integrals) and physical intuition
- Support progressive learning: from point charges to continuous distributions to advanced topics (Gauss theorem, Laplace solver)
- Deliver interactive pedagogical content in French (with i18n consideration)

### Functional Requirements
1. **Point Charge System**: Create, move, delete point charges; adjust charge values and signs
2. **Electric Field Visualization**: Real-time field vector at a movable test point M; field lines; equipotentials (2D and 3D)
3. **Continuous Distributions**: Support for sphere, cylinder, plane, disk, circle (ring), frame, line, box — with configurable density, radius, hollow/solid options
4. **Coulomb's Law Engine**: Real-time calculation of E(r), V(r), forces with proper SI units
5. **Gauss Companion**: 5-step pedagogical wizard guiding through symmetry analysis → surface selection → flux calculation → field/potential derivation
6. **Graphical Analysis**: 2D plots of E(x) and V(x) along configurable axes
7. **Scene Management**: Undo/redo, preset configurations (dipole, quadrupole, capacitor, etc.), export/import scenes
8. **Deployment**: Cloudflare Pages hosting with SPA fallback

### Phased Development Roadmap
- **Phase 1** (✅ Complete): Point charges, field vectors, basic interaction
- **Phase 2** (✅ Complete): Dipole explorer, animations, field lines
- **Phase 3** (✅ Complete): Continuous distributions, parametric geometries, symmetry planes
- **Phase 4** (🟡 Partial): Gauss theorem wizard (structure exists, quiz/interactivity pending)
- **Phase 5** (❌ Not started): Hand-drawn conductor tool, charge density heatmap
- **Phase 6** (❌ Not started): Laplace/Poisson numerical solver, Web Workers, shaders

## Target Users
- Physics students (CPGE, Licence, Bachelor's)
- Educators looking for interactive demonstration tools
- Self-learners exploring electrostatics

## Constraints
- Browser-based (no native dependencies beyond WebGL)
- Real-time performance target: 60 FPS with moderate complexity
- Single-page application with client-side state (no backend required)
- Deployed on Cloudflare Workers/Pages free tier
