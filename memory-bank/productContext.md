# Electrospace — Product Context

## Why This Project Exists

Electrostatics is one of the first topics where physics students encounter abstract mathematical concepts — vector fields, surface integrals, flux, divergence — that are difficult to visualize from equations alone. Traditional teaching relies on static diagrams in textbooks, which cannot convey the dynamic, three-dimensional nature of electric fields.

Electrospace was created to solve this problem: to give students a **real-time, interactive 3D laboratory** where they can:
- Place charges and immediately see the resulting field
- Drag a test point through space and watch E and V change continuously
- Visualize Gauss's theorem by constructing surfaces and seeing enclosed charge
- Explore how field lines, equipotentials, and vector fields behave in complex configurations

## Problems It Solves

1. **Abstract vector calculus made concrete**: The divergence theorem, flux integrals, and symmetry arguments become visually intuitive when you can rotate a Gaussian surface and see which charges it encloses.

2. **Bridging analytical and numerical understanding**: Students can compare analytical formulas (e.g., E(r) for a sphere) with the numerical integration result, building confidence in both approaches.

3. **Active learning over passive reading**: Instead of memorizing formulas, students experiment: "What happens if I move this charge? What if I make the sphere hollow? What if I change the Gaussian surface radius?"

4. **Progressive complexity**: The 6-phase roadmap mirrors a typical electrostatics curriculum, allowing students to grow from simple point charges to advanced numerical methods (Laplace solver) at their own pace.

## How It Should Work

### Core Interaction Model
- **3D Canvas** (primary viewport): Rendered with Three.js via React Three Fiber. Contains charges (spheres), test point, field vectors, field lines, equipotentials, distribution geometries, and Gaussian surfaces.
- **Sidebar** (control panel): All configuration, toggles, numerical displays, and pedagogical content. Collapsible for full-screen 3D viewing.
- **Real-time feedback loop**: Any change in the sidebar (charge position, distribution parameter, test point location) immediately updates the 3D scene and numerical readouts.

### User Flow
1. Open the app → default dipole preset loads with two charges and a test point
2. Drag charges to reposition them → field vector at M updates in real time
3. Add more charges or load a preset → superposition principle demonstrated visually
4. Switch to a continuous distribution (e.g., sphere) → point charges hide, 3D distribution renders
5. Activate Gauss Companion → 5-step wizard guides through symmetry → surface → flux → field → potential
6. Enable graphs → 2D plots of E(x) and V(x) appear below the 3D canvas

### Pedagogical Philosophy
- **Show, don't just tell**: Every formula has a corresponding visual element
- **Manipulate to understand**: All parameters are adjustable with immediate feedback
- **Guide, don't lecture**: The Gauss Companion structures the reasoning without giving answers
- **Build intuition first, formalism second**: Students see the field pattern before deriving the equation

## User Experience Goals

- **Zero friction**: Open the app and immediately see an interactive 3D scene — no login, no setup, no loading screens
- **60 FPS responsiveness**: Drag operations and camera controls feel buttery smooth
- **Discoverable controls**: Keyboard shortcuts, context menus, and tooltips make features findable
- **Pedagogically sound**: The Gauss wizard follows real physics pedagogy (symmetry → surface → flux → field)
- **Visually polished**: Dark/light theme, smooth animations, clear color coding (red = positive, blue = negative)
- **Mobile-friendly**: Responsive layout with sidebar overlay on small screens
- **Persistent**: Theme preference and scene state survive page reloads
