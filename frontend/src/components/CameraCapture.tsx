import { useEffect, useRef, useState } from 'react';
import { Button } from './ui';

// Guided webcam capture with an upload fallback. Returns a base64 data URL.
export default function CameraCapture({
  shape = 'oval',
  onCapture,
}: {
  shape?: 'oval' | 'side';
  onCapture: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError('No pudimos acceder a la cámara. Puedes subir una foto.'));
    return () => {
      active = false;
      setStream((s) => {
        s?.getTracks().forEach((t) => t.stop());
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function snap() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL('image/jpeg', 0.8));
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onCapture(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-900">
        {!error ? (
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center px-4 text-center text-sm text-slate-300">{error}</div>
        )}
        {!error && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div
              className="border-2 border-dashed border-white/70"
              style={
                shape === 'oval'
                  ? { width: '55%', height: '70%', borderRadius: '50% / 45%' }
                  : { width: '52%', height: '70%', borderRadius: '45% 50% 50% 45% / 50%' }
              }
            />
            <span className="absolute bottom-3 text-xs text-white/80">
              {shape === 'oval' ? 'Centra tu rostro' : 'Gira tu rostro de perfil'}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2 text-xs text-slate-400">
        <span>• Buena luz</span><span>• Sin lentes ni gorra</span>
      </div>

      <div className="mt-4 space-y-2">
        {!error && <Button onClick={snap}>Capturar</Button>}
        <label className="block w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Subir foto
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
      </div>
    </div>
  );
}
