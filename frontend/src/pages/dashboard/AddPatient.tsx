import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

interface Study {
  _id: string;
  name: string;
  sequence: string[];
}

export default function AddPatient() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [studies, setStudies] = useState<Study[]>([]);
  const [name, setName] = useState('');
  const [studyId, setStudyId] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient()
      .get<Study[]>('/studies')
      .then((res) => setStudies(res.data))
      .catch(() => {});
  }, []);

  const startCamera = () => {
    setCameraError('');
    // Usar restricciones simples por compatibilidad; algunas cámaras fallan con width/height ideal
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          // En muchos navegadores el vídeo no se muestra hasta que se llama a play()
          video.play().catch((playErr) => {
            setCameraError('Vídeo no pudo reproducirse: ' + (playErr.message || 'Prueba en otro navegador.'));
          });
        }
        setCameraActive(true);
      })
      .catch((err) => {
        const msg = err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Permite el acceso en la barra de direcciones.'
          : err.name === 'NotFoundError'
            ? 'No se encontró ninguna cámara.'
            : err.message || 'No se pudo acceder a la cámara.';
        setCameraError(msg);
      });
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Asegurar que el vídeo se reproduzca cuando ya está en pantalla (evita pantalla negra en algunos navegadores)
  useEffect(() => {
    if (!cameraActive || !streamRef.current) return;
    const video = videoRef.current;
    if (!video || video.srcObject) return;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});
  }, [cameraActive]);

  // Cuando el vídeo está listo (tiene stream), forzar play por si no arrancó
  useEffect(() => {
    if (!cameraActive) return;
    const video = videoRef.current;
    if (!video?.srcObject) return;
    const onLoaded = () => {
      video.play().catch(() => {});
    };
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('loadeddata', onLoaded);
    if (video.readyState >= 2) video.play().catch(() => {});
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('loadeddata', onLoaded);
    };
  }, [cameraActive]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current || video.readyState < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhoto(dataUrl);
    stopCamera();
  };

  const removePhoto = () => {
    setPhoto(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!studyId) {
      setError('Selecciona un estudio.');
      return;
    }
    setLoading(true);
    apiClient()
      .post('/patients', {
        name: name.trim(),
        studyId,
        identifier: identifier.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        notes: notes.trim() || undefined,
        photo: photo || undefined,
      })
      .then((res) => {
        navigate(`/dashboard/patients/${res.data._id}`, { state: { created: true } });
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Error al crear el paciente');
        setLoading(false);
      });
  };

  return (
    <div className="space-y-6 max-w-xl">
      <Breadcrumbs
        items={[
          { label: 'Panel de control', to: '/dashboard' },
          { label: 'Pacientes', to: '/dashboard/patients' },
          { label: 'Añadir paciente' },
        ]}
        className="mb-2"
      />
      <h1 className="text-2xl font-bold text-slate-900">Añadir paciente</h1>
      <p className="text-slate-600 text-sm">
        Asigna un <strong>estudio</strong> a cada paciente. Las sesiones que programes seguirán ese orden (MOCKA, Vending Machine, Relajación) según la posición en el estudio.
      </p>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Foto: cámara o imagen capturada */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Foto del paciente (opcional)
            </label>
            {photo ? (
              <div className="flex flex-col items-start gap-2">
                <img
                  src={photo}
                  alt="Foto capturada"
                  className="w-40 h-40 object-cover rounded-lg border border-slate-200"
                />
                <Button type="button" variant="outline" size="sm" onClick={removePhoto}>
                  Quitar foto
                </Button>
              </div>
            ) : cameraActive ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Coloca al paciente en el encuadre y pulsa "Agregar foto".</p>
                <div className="relative inline-block rounded-lg overflow-hidden border border-slate-200 bg-slate-800">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="block w-full max-w-sm aspect-video max-h-64 object-cover bg-slate-900"
                    style={{ minHeight: 240 }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Si ves la pantalla en negro: cierra otras pestañas que usen la cámara, actualiza la página o prueba con Chrome/Edge. En Windows, comprueba en Configuración → Privacidad → Cámara que las apps puedan usarla.
                </p>
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={capturePhoto}>
                    Agregar foto
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={stopCamera}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Button type="button" variant="outline" size="sm" onClick={startCamera}>
                  Activar cámara
                </Button>
                {cameraError && (
                  <p className="text-sm text-red-600 mt-2">{cameraError}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Nombre *
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <label htmlFor="studyId" className="block text-sm font-medium text-slate-700 mb-1">
              Estudio *
            </label>
            <select
              id="studyId"
              required
              value={studyId}
              onChange={(e) => setStudyId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
            >
              <option value="">Selecciona un estudio</option>
              {studies.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
            {studies.length === 0 && <p className="text-xs text-amber-600 mt-1">Crea primero un estudio en la sección Estudios.</p>}
          </div>
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-1">
              Identificador (opcional)
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
              placeholder="Historial clínico, DNI, etc."
            />
          </div>
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-slate-700 mb-1">
              Fecha de nacimiento (opcional)
            </label>
            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
              placeholder="Notas clínicas"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear paciente'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/patients')}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
