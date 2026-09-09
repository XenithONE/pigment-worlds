# Publication verified — 2026-09-10 JST

- Public experience: https://xenithone.github.io/pigment-worlds/
- Public repository: https://github.com/XenithONE/pigment-worlds
- Portfolio entry: https://xenithone.github.io/unfiled/#pigment-worlds

The sculpted-paint revision (v15) was published from application commit `c172cbc63e0bc8893b04c48b4d7b137bee91f021`. Its [GitHub Actions build, tests and deployment](https://github.com/XenithONE/pigment-worlds/actions/runs/34391382057) completed successfully. The refreshed actual-game photograph and description in the portfolio were published from commit `758cd5f07b1b79659ccf5c20416e7efd095b8e79`; its [deployment](https://github.com/XenithONE/unfiled/actions/runs/34391393785) also succeeded.

The actual public experience was reloaded in the in-app browser. It loaded `./assets/index-CYk8n86f.js`, matching the final local production build. Starting the journey and choosing world 02 opened 睡蓮の庭, where the newly refreshed canyon photograph was visible inside the portal. Choosing world 03 then opened 黄金の渓谷 with the thicker red-gold crown and connected drips, sculpted herbs, deposited cliff relief and visible S-shaped river. Keyboard focus returned to the canvas after world selection. The public tab's error log was empty. One UI-tool response timed out during the canyon transition; the next state read and screenshot confirmed the completed world switch without reissuing the action.

The public portfolio detail page displayed the matching new actual-game canyon photograph, updated description mentioning deposited cliffs, dripping crown, 3D herbs and the blue-gold river, live experience link and source repository link. The image decoded at 1600 pixels wide and its error log was empty. Both pages were visually checked after successful deployments. The local application and portfolio cover files share SHA-256 `a0211bd7fead6adb8be342b199cc8b5361e95f833585172624db2ab5df9adeda`.

This revision supersedes v14 application commit `87b25a815a67a23fc2eb44d49309b335a1372b16` ([run](https://github.com/XenithONE/pigment-worlds/actions/runs/34384486501)) and portfolio commit `961ff7d6a145ffdbec147a5e233b4c5e6e5955a5` ([run](https://github.com/XenithONE/unfiled/actions/runs/34384498170)). It retains the classic pigment atlas and existing distant panorama; the new loaded-atlas experiment was rejected.

This publication record is a documentation-only follow-up and does not change the built application. Implemented visual scope, tests and remaining reference-quality differences are documented in [verification.md](verification.md). The broader visual-quality goal remains open.
