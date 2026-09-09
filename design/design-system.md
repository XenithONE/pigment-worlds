# PIGMENT visual specification

The built-in Image Gen concept in `concept.png` establishes the full primary start screen. Prompt: a Japanese oil-painted first-person world, ultramarine swirling sky, gold trail and ornate portal into a mint garden; ivory editorial type, PIGMENT top left, 世界を選ぶ / 音 OFF / ? top right, 絵の向こうへ、歩いていこう。 lower left, one 旅をはじめる action, scene caption lower right. No marketing sections or persistent card grid.

- Palette: ivory #f7f1e4; midnight #101c34; gold #d8b96f. Scene palettes change with the painting world.
- Type: Cormorant Garamond logo; Noto Serif JP / native Japanese serif body. System sans for compact operation help. Scene remains dominant.
- Rhythm: 34–42px desktop edge insets; 22–26px mobile insets. Hairline translucent borders, 2px corners, quiet interactive states.
- Start: entire 3D viewport visible, lower-left heading and one CTA. In play: remove introduction, show a small progress cluster and transient proximity action only.
- Secondary states: world chooser and journey journal open as dismissible dialogs, with the same type and palette. Touch movement control appears on touch-sized/coarse-pointer devices.

## Intentional implementation differences

The concept is a still composition; the shipped scene has freely moving perspective. Hills, flowers, trees, portal ornament, collectibles and water are authored as actual original procedural 3D geometry and shaders, so they exhibit parallax and respond to traversal. Generated paintings supply distant skies and next-world portal previews; a static screenshot is never used as interactive UI or the playable world. This code-native geometry is required by the user's request to walk through painting worlds. World selection, collection feedback, settings, loading/error states and journal extend the primary visual system to support the complete usable game. Per-world authored composition differs from the generated concept's imagined village but retains blue/gold night, organic plants, a gold path and a luminous garden portal.

## User-directed refinement

The user requested that every surrounding object and plant feel like thick, viscous oil paint, pursuing the sensation of being inside a painting. Closed rounded daubs replace planar foliage, flower petals have actual thickness and curved cups, rocks and architectural edges are rounded, and spatial pigment ridges perturb light across the geometry. Sky reflections add the sheen of oil to these surfaces. A directional low-variance paint filter brings the rendered materials together without replacing the real 3D view. Small slow deformations on foliage suggest soft paint; reduced-motion mode holds them still.

## Asset delivery

Built-in Image Gen source paintings are retained in `design/source-images/`; runtime uses compressed WebP derivatives in `public/art/`. Exact sky and portal prompts are recorded in the adjacent prompt documents. Fonts are bundled locally using Fontsource, with OFL licenses in `public/licenses/`. No third-party font connection is needed while playing.
