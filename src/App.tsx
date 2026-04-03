import { useInvisibleInstrument } from './hooks/useInvisibleInstrument';

const App = () => {
  const { cameraError, videoRef } = useInvisibleInstrument();

  if (cameraError) {
    return (
      <main className="fallback" role="alert">
        <p>{cameraError}</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <video
        ref={videoRef}
        aria-label="Live camera feed"
        autoPlay
        className="camera-feed"
        muted
        playsInline
      />
    </main>
  );
};

export default App;
