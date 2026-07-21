import { useEffect } from 'react';
import { useStore } from '../../store/useStore';

/** Full-screen image viewer. Opened by setLightbox(url); closes on backdrop click, ✕, or Esc. */
export default function Lightbox() {
  const lightbox = useStore((s) => s.lightbox);
  const setLightbox = useStore((s) => s.setLightbox);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, setLightbox]);

  if (!lightbox) return null;

  return (
    <div
      onClick={() => setLightbox(null)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        background: 'rgba(10,30,26,.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        cursor: 'zoom-out',
      }}
    >
      <button
        onClick={() => setLightbox(null)}
        style={{
          position: 'absolute',
          top: 18,
          right: 18,
          border: 'none',
          background: 'rgba(255,255,255,.9)',
          width: 36,
          height: 36,
          borderRadius: 9,
          cursor: 'pointer',
          fontSize: 20,
          color: '#0f2d27',
        }}
      >
        ×
      </button>
      <img
        src={lightbox}
        alt="Full-size report photo"
        // Stop the backdrop's close handler when clicking the image itself.
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          borderRadius: 8,
          boxShadow: '0 10px 40px rgba(0,0,0,.4)',
          cursor: 'default',
        }}
      />
    </div>
  );
}
