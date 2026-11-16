import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

function photoCanvas(source, width, height, scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function readMealPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    return photoCanvas(image, image.naturalWidth, image.naturalHeight, scale).toDataURL('image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function MealCamera({ onCapture, onClose, onFallback }) {
  const video = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stream;
    async function open() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled) return stream.getTracks().forEach(track => track.stop());
        video.current.srcObject = stream;
      } catch {
        if (!cancelled) setError(true);
      }
    }
    open();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="camera-panel">
      <div className="flex-between"><h3>Take a meal photo</h3><button type="button" className="icon-button" onClick={onClose} aria-label="Close camera"><X size={20} /></button></div>
      {error ? <p role="alert">Your camera couldn’t open. Choose a photo from your device.</p> : <video ref={video} autoPlay muted playsInline onLoadedData={() => setReady(true)} aria-label="Camera preview" />}
      {error ? <button type="button" className="btn btn-primary" onClick={onFallback}>Choose a photo</button> :
        <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => {
          const source = video.current;
          photoCanvas(source, source.videoWidth, source.videoHeight).toBlob(photo => {
            if (photo) onCapture(photo);
            else setError(true);
          }, 'image/jpeg', 0.95);
        }}><Camera size={18} /> Take photo</button>}
    </div>
  );
}
