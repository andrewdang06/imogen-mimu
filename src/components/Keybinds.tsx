import { useState, useEffect } from 'react';

interface KeybindsProps {
  onToggleVisualizer?: () => void;
}

export const Keybinds: React.FC<KeybindsProps> = () => {
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' || e.key === 'h') {
        setShowHelp((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setShowHelp((prev) => !prev)}
        className="help-button"
        aria-label="Toggle help"
      >
        ?
      </button>

      {showHelp && (
        <div className="keybinds-panel">
          <h3>Hand Gestures (No keyboard needed!)</h3>
          <dl>
            <dt>📂 Open Palm</dt>
            <dd>Enable audio control • Move hand to change pitch</dd>

            <dt>✊ Fist</dt>
            <dd>Mute all audio</dd>

            <dt>🤏 Pinch (thumb + index)</dt>
            <dd>Trigger a note</dd>

            <dt>☝️ Pointing (one finger up)</dt>
            <dd>Enable audio control • Fine pitch control</dd>

            <dt>↕️ Vertical Movement</dt>
            <dd>Control pitch (up = higher)</dd>

            <dt>↔️ Horizontal Movement</dt>
            <dd>Control filter cutoff (left = darker, right = brighter)</dd>
          </dl>

          <h3>Keyboard Shortcuts (Optional)</h3>
          <dl>
            <dt>? or H</dt>
            <dd>Toggle this help panel</dd>

            <dt>V</dt>
            <dd>Toggle hand visualizer</dd>

            <dt>Space</dt>
            <dd>Mute/unmute (quick toggle)</dd>
          </dl>

          <p className="help-hint">Press ? or H to hide this panel</p>
        </div>
      )}
    </>
  );
};
