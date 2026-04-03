import { useEffect, useRef } from 'react';
import { InstrumentEngine } from '../lib/audio/InstrumentEngine';

interface KeyboardControlsProps {
  audioEngine: InstrumentEngine | null;
  onToggleVisualizer?: () => void;
}

export const KeyboardControls: React.FC<KeyboardControlsProps> = ({
  audioEngine,
  onToggleVisualizer,
}) => {
  const muteStateRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (audioEngine) {
          muteStateRef.current = !muteStateRef.current;
          if (muteStateRef.current) {
            audioEngine.mute();
          } else {
            void audioEngine.resume();
          }
        }
      }

      if (e.key === 'v' || e.key === 'V') {
        onToggleVisualizer?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioEngine, onToggleVisualizer]);

  return null;
};
