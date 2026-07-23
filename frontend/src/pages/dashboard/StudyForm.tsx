import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

const ACTIVITY_TYPES = [
  { id: 'MOCKA', label: 'MOCKA' },
  { id: 'VENDING', label: 'Vending Machine' },
  { id: 'RELAJACION', label: 'Relajación' },
] as const;

export default function StudyForm() {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const isEdit = !!studyId;
  const [name, setName] = useState('');
  const [sequence, setSequence] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [, setDraggedItem] = useState<{ type: 'pool' | 'sequence'; index?: number; value?: string } | null>(null);

  useEffect(() => {
    if (studyId) {
      apiClient()
        .get<{ name: string; sequence: string[] }>(`/studies/${studyId}`)
        .then((res) => {
          setName(res.data.name);
          setSequence(res.data.sequence || []);
        })
        .catch(() => setError('Error al cargar el estudio'));
    }
  }, [studyId]);

  const handleDragStartPool = (e: React.DragEvent, value: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'pool', value }));
    e.dataTransfer.effectAllowed = 'copy';
    setDraggedItem({ type: 'pool', value });
  };

  const handleDragStartSequence = (e: React.DragEvent, index: number, value: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'sequence', index, value }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem({ type: 'sequence', index, value });
  };

  const handleDragEnd = () => setDraggedItem(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'pool') {
        setSequence((prev) => [...prev, data.value]);
      } else if (data.type === 'sequence') {
        const idx = data.index as number;
        const newSeq = [...sequence];
        newSeq.splice(idx, 1);
        setSequence(newSeq);
      }
    } catch {}
  };

  const handleDropOnSequence = (e: React.DragEvent, atIndex: number) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'pool') {
        const newSeq = [...sequence];
        newSeq.splice(atIndex, 0, data.value);
        setSequence(newSeq);
      } else if (data.type === 'sequence' && data.index !== atIndex) {
        const newSeq = [...sequence];
        const [v] = newSeq.splice(data.index, 1);
        const insertAt = atIndex > data.index ? atIndex - 1 : atIndex;
        newSeq.splice(insertAt, 0, v);
        setSequence(newSeq);
      }
    } catch {}
  };

  const removeFromSequence = (index: number) => {
    setSequence((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDelete = () => {
    if (!studyId) return;
    if (!confirm('¿Eliminar este estudio? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    apiClient()
      .delete(`/studies/${studyId}`)
      .then(() => navigate('/dashboard/studies'))
      .catch(() => {
        setError('Error al eliminar el estudio');
        setDeleting(false);
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (sequence.length === 0) {
      setError('Añade al menos una actividad a la secuencia.');
      setLoading(false);
      return;
    }
    const payload = { name: name.trim() || 'Estudio sin nombre', sequence };
    const req = isEdit
      ? apiClient().patch(`/studies/${studyId}`, payload)
      : apiClient().post('/studies', payload);
    req
      .then(() => {
        setSuccessMessage(isEdit ? 'Estudio actualizado correctamente.' : 'Estudio creado correctamente.');
        setLoading(false);
        setTimeout(() => navigate('/dashboard/studies'), 1800);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Error al guardar');
        setLoading(false);
      });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumbs
        items={[
          { label: 'Panel de control', to: '/dashboard' },
          { label: 'Estudios', to: '/dashboard/studies' },
          { label: isEdit ? 'Editar estudio' : 'Crear estudio' },
        ]}
        className="mb-2"
      />
      <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Editar estudio' : 'Crear estudio'}</h1>
      <p className="text-slate-600 text-sm max-w-xl">
        Arrastra las actividades al recuadro en el orden en que quieres las sesiones. Puedes repetir (ej: MOCKA → Vending → MOCKA). La <strong>sesión 1</strong> usará la primera actividad, la sesión 2 la segunda, y así sucesivamente.
      </p>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {successMessage && (
            <p className="text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg">{successMessage}</p>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Nombre del estudio (opcional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900"
              placeholder="Ej. Estudio estándar"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Actividades disponibles</p>
            <p className="text-xs text-slate-500 mb-2">Arrastra al recuadro de abajo para definir el orden de cada sesión. Puedes repetir actividades.</p>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TYPES.map((a) => (
                <span
                  key={a.id}
                  draggable
                  onDragStart={(e) => handleDragStartPool(e, a.id)}
                  onDragEnd={handleDragEnd}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-100 text-slate-800 cursor-grab active:cursor-grabbing border border-slate-200 hover:bg-slate-200"
                >
                  {a.label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Secuencia del estudio (orden de sesiones)</p>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`min-h-[120px] p-4 rounded-xl border-2 border-dashed ${
                dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              {sequence.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">Arrastra aquí las actividades en el orden deseado</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sequence.map((value, index) => (
                    <div
                      key={`${index}-${value}`}
                      draggable
                      onDragStart={(e) => handleDragStartSequence(e, index, value)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropOnSequence(e, index)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-sm cursor-move hover:border-brand-300"
                    >
                      <span className="text-sm font-medium text-slate-800">
                        {ACTIVITY_TYPES.find((a) => a.id === value)?.label ?? value}
                      </span>
                      <span className="text-slate-400 text-xs">Sesión {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeFromSequence(index)}
                        className="ml-1 text-slate-400 hover:text-red-600 text-lg leading-none"
                        aria-label="Quitar"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear estudio'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/studies')}>
              Cancelar
            </Button>
            {isEdit && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Eliminar estudio'}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
