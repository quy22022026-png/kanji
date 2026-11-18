# Runtime dependencies

- `tailwind.min.css`: generated for this app with Tailwind CSS 3.4.17 (MIT). Source configuration: `../tailwind.config.cjs`, `../scripts/tailwind.css`.
- `jszip.min.js`: JSZip 3.10.1, unmodified distribution. See `JSZip-LICENSE.md`.
- `zen-tts/`: ZEN-TTS v1.3.0 from `zenryokukikai/zen-tts`, git commit `38773bf7eaf915797b1bf361b7a8cf3b3d074d5a`. TypeScript compiled to browser ES modules without source changes. Its CPU worker stays on the same origin as the app. See the original `zen-tts/LICENSE.md` and `zen-tts/THIRD_PARTY_NOTICES.md`.

The app-specific adapter lives in `../zen-worker.js`. No model weights or dictionary archives are included in this package. The UI retains the required linked ZEN-TTS credit.
