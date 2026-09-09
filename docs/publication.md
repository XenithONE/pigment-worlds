# Publication verified — 2026-09-10 JST

- Public experience: https://xenithone.github.io/pigment-worlds/
- Public repository: https://github.com/XenithONE/pigment-worlds
- Portfolio entry: https://xenithone.github.io/unfiled/#pigment-worlds

The viscous-paint revision (v16) was published from application commit `12958cab36a6e47cc200304a5787101dfd7f9ac7`. Its [GitHub Actions build, tests and deployment](https://github.com/XenithONE/pigment-worlds/actions/runs/34400198905) completed successfully. The refreshed actual-game photograph and description in the portfolio were published from commit `ab96708e08180d0592aaf6368b18f99b273f2db9`; its [deployment](https://github.com/XenithONE/unfiled/actions/runs/34400210149) also succeeded.

The actual public experience was reloaded in the in-app browser. It loaded `./assets/index-AgnGANoa.js`, matching the final local production build. Starting the journey and choosing world 02 opened 睡蓮の庭, where the refreshed v16 canyon photograph was visible inside the portal. Choosing world 03 opened 黄金の渓谷 with the retained knife-edge red-gold crown, thickened botanical blades, refined deposited cliff relief, visible S-shaped river and new impasto sky. Keyboard focus returned to the canvas after each completed world selection. Repeated real W-key input advanced the viewpoint; drag-look revealed nearby painted terrain and the brushed sky overhead, then returned to a forward view. The public tab's error log was empty.

The canyon transition took long enough for one UI-tool response to time out. The next observation showed the loading screen, and a later screenshot confirmed the rendered scene without reissuing the world-selection action. This public check does not claim a short first-load time. All four worlds, the twelve-colour journey and nine canyon views were exercised separately in the final local browser suite documented in [verification.md](verification.md).

The public portfolio detail page displayed the matching new actual-game canyon photograph, updated description mentioning impasto clouds, layered painted plants and the blue-gold river spilling over steps, live experience link and source repository link. The detail image decoded at 1600 × 1067 pixels and its error log was empty. Both pages were visually checked after successful deployments. The local application and portfolio cover files share SHA-256 `0d4870ede475840596401a2af21777d9ce14520a45301440dc0cf4e014f7e3fc`.

This revision supersedes v15 application commit `c172cbc63e0bc8893b04c48b4d7b137bee91f021` ([run](https://github.com/XenithONE/pigment-worlds/actions/runs/34391382057)) and portfolio commit `758cd5f07b1b79659ccf5c20416e7efd095b8e79` ([run](https://github.com/XenithONE/unfiled/actions/runs/34391393785)). It retains the classic pigment atlas, v15 tree geometry and existing distant landscape paintings. The experimental union crown and canyon colour-transfer treatment were rejected. The selected sky's source, exact prompt and projection limits are recorded in [sky provenance](../design/sky-v16-prompts.md).

This publication record is a documentation-only follow-up and does not change the built application. Implemented visual scope, tests and remaining reference-quality differences are documented in [verification.md](verification.md). The broader visual-quality goal remains open.
