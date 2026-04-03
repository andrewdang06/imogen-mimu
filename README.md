# imogen mimu

A minimal fullscreen React + TypeScript webcam instrument that keeps the page visually identical to a plain live camera view while TensorFlow.js hand tracking and Web Audio synthesis run invisibly in the background.

## Features

- Fullscreen mirrored webcam feed with no visible controls or overlays
- Immediate webcam permission request on load
- TensorFlow.js hand landmark tracking via `@tensorflow-models/handpose`
- Debounced gesture recognition for open palm, fist, pinch, and pointing
- Web Audio synth mapped to gesture state and hand position
- Single fallback message when camera access fails
- No backend or server-side code

## Gesture Mapping

- `open palm`: enables control mode
- `fist`: mutes and disables control mode
- `pinch`: triggers an accented note
- `pointing`: sharpens the filter and increases vibrato
- `hand height`: raises pitch and sustain level
- `hand horizontal position`: moves stereo pan and filter brightness

## Development

```bash
npm install
npm run dev
```

Open the local Vite URL in a browser and allow camera access.

## Production Build

```bash
npm run build
npm run preview
```

## Project Structure

- `src/App.tsx`: fullscreen camera-only surface
- `src/hooks/useInvisibleInstrument.ts`: camera boot, hand tracking loop, gesture smoothing, and audio coordination
- `src/lib/handtracking/createHandTracker.ts`: TensorFlow.js hand model loader
- `src/lib/gestures/classifyGesture.ts`: landmark-based gesture classification
- `src/lib/gestures/GestureSmoother.ts`: debounced gesture stability window
- `src/lib/audio/InstrumentEngine.ts`: Web Audio instrument and parameter mapping

## Notes

- The app is intentionally UI-less. If the camera works, the user only sees the live feed.
- Audio playback may remain suspended until the first user interaction on browsers that enforce autoplay restrictions.
- The bundled TensorFlow.js model makes the client build fairly large, which is expected for this prototype.
