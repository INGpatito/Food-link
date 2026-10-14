# Dispatch Log

## 2026-10-12T06:33:34Z
You are the SWE Light Orchestrator.
Your working directory is /home/pato/footlink/.agents/teamwork/swe_1.
Original user request is recorded at /home/pato/footlink/.agents/teamwork/ORIGINAL_REQUEST.md.

Task requirements summary:
- Take the original burger 3D model (public/models/burger.glb) used in the Hero section and split it into independent physical parts/layers (brioche top bun, lettuce, tomato, cheese, beef patty, bottom bun), preserving photorealistic PBR textures and UV mapping.
- Perfect assembly in resting state (0% scroll progress): layers assemble seamlessly matching the original burger.
- Dynamic scroll-synchronized explosion in #anatomy-root: integrate into src/three/LayeredFoodModel.ts, src/three/SceneManager.ts, and src/sections/AnatomySection.ts so layers separate smoothly along the vertical axis.
- Build must succeed (npm run build exit code 0) without TypeScript or WebGL console errors.

Please coordinate the implementation and review. Report completion back to sentinel when all criteria are satisfied.
