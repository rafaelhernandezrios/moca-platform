import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

const ACTIVITY_LABELS: Record<string, string> = {
  MOCKA: 'MOCKA',
  VENDING: 'Vending Machine',
  RELAJACION: 'Relajación',
};

interface Patient {
  _id: string;
  name: string;
  studyId?: string;
  identifier?: string;
  dateOfBirth?: string;
  notes?: string;
  photo?: string;
}

interface Study {
  _id: string;
  name: string;
  sequence: string[];
}

interface Evaluation {
  _id: string;
  testId: string;
  status: string;
  total: number;
  completedAt?: string;
  createdAt: string;
}

interface Session {
  _id: string;
  sessionIndex: number;
  activityType: string;
  scheduledAt: string;
  status: string;
}

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [study, setStudy] = useState<Study | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionScheduledAt, setSessionScheduledAt] = useState('');
  const [sessionSaving, setSessionSaving] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editSessionIndex, setEditSessionIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [createdMessage, setCreatedMessage] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState(false);

  useEffect(() => {
    const state = location.state as { created?: boolean } | null;
    if (state?.created) {
      setCreatedMessage(true);
      navigate(location.pathname, { replace: true, state: {} });
      const t = setTimeout(() => setCreatedMessage(false), 4000);
      return () => clearTimeout(t);
    }
  }, [location.state, location.pathname, navigate]);

  const loadData = (setLoadState = true) => {
    if (!patientId) return;
    const api = apiClient();
    if (setLoadState) setLoading(true);
    Promise.all([
      api.get<Patient>(`/patients/${patientId}`),
      api.get<Evaluation[]>(`/evaluations?patientId=${patientId}`),
      api.get<Session[]>(`/sessions/patient/${patientId}`),
    ])
      .then(([pRes, eRes, sRes]) => {
        setPatient(pRes.data);
        setEvaluations(eRes.data);
        setSessions(sRes.data);
        if (pRes.data.studyId) {
          api.get<Study>(`/studies/${pRes.data.studyId}`).then((sRes) => setStudy(sRes.data)).catch(() => {});
        }
      })
      .catch(() => setError('Error al cargar el paciente'))
      .finally(() => { if (setLoadState) setLoading(false); });
  };

  useEffect(() => {
    if (!patientId) return;
    loadData(true);
  }, [patientId]);

  const handleDeletePatient = () => {
    if (!patientId || !patient) return;
    if (!confirm(`¿Eliminar al paciente "${patient.name}"? Se eliminarán también sus sesiones. Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    apiClient()
      .delete(`/patients/${patientId}`)
      .then(() => navigate('/dashboard/patients'))
      .catch(() => {
        setError('Error al eliminar el paciente');
        setDeleting(false);
      });
  };

  const handleNewEvaluation = () => {
    if (!patientId) return;
    setStarting(true);
    apiClient()
      .post<{ testId: string }>('/evaluations', { patientId })
      .then((res) => {
        navigate(`/tests/${res.data.testId}/visuospatial`);
      })
      .catch(() => {
        setError('Error al crear la evaluación');
        setStarting(false);
      });
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !patient?.studyId || !sessionScheduledAt) return;
    setSessionSaving(true);
    apiClient()
      .get<number>(`/sessions/next-index/${patientId}`)
      .then((nextRes) => {
        const nextIndex = nextRes.data as number;
        return apiClient().post('/sessions', {
          patientId,
          studyId: patient.studyId,
          sessionIndex: nextIndex,
          scheduledAt: new Date(sessionScheduledAt).toISOString(),
        });
      })
      .then(() => {
        setShowAddSession(false);
        setSessionScheduledAt('');
        setSessionSuccess(true);
        setTimeout(() => setSessionSuccess(false), 3000);
        loadData(false);
      })
      .catch(() => setError('Error al crear la sesión'))
      .finally(() => setSessionSaving(false));
  };

  const handleUpdateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSessionId) return;
    setSessionSaving(true);
    apiClient()
      .patch(`/sessions/${editingSessionId}`, {
        scheduledAt: editScheduledAt ? new Date(editScheduledAt).toISOString() : undefined,
        sessionIndex: editSessionIndex,
      })
      .then(() => {
        setEditingSessionId(null);
        loadData();
      })
      .catch(() => setError('Error al actualizar'))
      .finally(() => setSessionSaving(false));
  };

  const handleDeleteSession = (id: string) => {
    if (!confirm('¿Eliminar esta sesión?')) return;
    apiClient()
      .delete(`/sessions/${id}`)
      .then(() => loadData())
      .catch(() => setError('Error al eliminar'));
  };

  if (loading) return <div className="text-slate-600">Cargando...</div>;
  if (error || !patient) return <div className="text-red-600">{error || 'Paciente no encontrado'}</div>;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Panel de control', to: '/dashboard' },
          { label: 'Pacientes', to: '/dashboard/patients' },
          { label: patient.name },
        ]}
        className="mb-2"
      />
      {createdMessage && (
        <p className="text-green-600 font-medium bg-green-50 px-4 py-2 rounded-lg">Paciente creado correctamente.</p>
      )}
      {sessionSuccess && (
        <p className="text-green-600 font-medium bg-green-50 px-4 py-2 rounded-lg">Sesión agregada correctamente.</p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
          <p className="text-slate-600 text-sm mt-1 max-w-xl">
            Desde aquí puedes programar sesiones (orden según el estudio asignado), ver evaluaciones MoCA y iniciar una nueva evaluación.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div>
            <Button onClick={handleNewEvaluation} disabled={starting}>
              {starting ? 'Creando...' : 'Nueva evaluación'}
            </Button>
            <p className="text-xs text-slate-500 mt-1">Se abrirá el test MoCA. Al finalizar, guarda el reporte en el dashboard.</p>
          </div>
          <Button variant="destructive" onClick={handleDeletePatient} disabled={deleting}>
            {deleting ? 'Eliminando...' : 'Eliminar paciente'}
          </Button>
        </div>
      </div>

      <Card title="Datos del paciente">
        <div className="flex flex-col sm:flex-row gap-6">
          {patient.photo && (
            <img
              src={patient.photo}
              alt={patient.name}
              className="w-24 h-24 rounded-lg object-cover border border-slate-200 shrink-0"
            />
          )}
          <dl className="grid sm:grid-cols-2 gap-3 text-sm flex-1">
          <dt className="text-slate-500">Estudio</dt>
          <dd className="text-slate-900">{study?.name ?? patient.studyId ?? '—'}</dd>
          <dt className="text-slate-500">Identificador</dt>
          <dd className="text-slate-900">{patient.identifier || '—'}</dd>
          <dt className="text-slate-500">Fecha de nacimiento</dt>
          <dd className="text-slate-900">
            {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '—'}
          </dd>
          {patient.notes && (
            <>
              <dt className="text-slate-500">Notas</dt>
              <dd className="text-slate-900">{patient.notes}</dd>
            </>
          )}
          </dl>
        </div>
      </Card>

      {patient.studyId && (
        <Card title="Sesiones">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <p className="text-sm text-slate-600 max-w-xl">
              Cada sesión tiene <strong>fecha y hora</strong>. La <strong>actividad</strong> (MOCKA, Vending Machine, Relajación) se asigna automáticamente según el orden del estudio: sesión 1 = primera actividad, sesión 2 = segunda, etc.
            </p>
            <Button size="sm" onClick={() => setShowAddSession(true)}>Agregar sesión</Button>
          </div>
          {showAddSession && (
            <form onSubmit={handleAddSession} className="p-4 bg-slate-50 rounded-lg mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha y hora</label>
                <input
                  type="datetime-local"
                  required
                  value={sessionScheduledAt}
                  onChange={(e) => setSessionScheduledAt(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>
              <Button type="submit" size="sm" disabled={sessionSaving}>{sessionSaving ? 'Guardando...' : 'Guardar'}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddSession(false)}>Cancelar</Button>
            </form>
          )}
          {sessions.length === 0 ? (
            <p className="text-slate-500">No hay sesiones programadas. Agrega una para asignar fecha y hora.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="pb-2 pr-4 font-medium">Sesión</th>
                    <th className="pb-2 pr-4 font-medium">Actividad</th>
                    <th className="pb-2 pr-4 font-medium">Fecha y hora</th>
                    <th className="pb-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s._id} className="border-b border-slate-100">
                      {editingSessionId === s._id ? (
                        <>
                          <td className="py-2 pr-4">
                            <input
                              type="number"
                              min={1}
                              value={editSessionIndex}
                              onChange={(e) => setEditSessionIndex(parseInt(e.target.value, 10) || 1)}
                              className="w-16 px-2 py-1 border rounded text-slate-900"
                            />
                          </td>
                          <td className="py-2 pr-4">{ACTIVITY_LABELS[s.activityType] ?? s.activityType}</td>
                          <td className="py-2 pr-4">
                            <input
                              type="datetime-local"
                              value={editScheduledAt}
                              onChange={(e) => setEditScheduledAt(e.target.value)}
                              className="px-2 py-1 border rounded text-slate-900"
                            />
                          </td>
                          <td className="py-2">
                            <button type="button" onClick={handleUpdateSession} className="text-brand-600 mr-2">Guardar</button>
                            <button type="button" onClick={() => setEditingSessionId(null)} className="text-slate-500">Cancelar</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 pr-4 font-medium">{s.sessionIndex}</td>
                          <td className="py-2 pr-4">{ACTIVITY_LABELS[s.activityType] ?? s.activityType}</td>
                          <td className="py-2 pr-4">{new Date(s.scheduledAt).toLocaleString()}</td>
                          <td className="py-2">
                            <button type="button" onClick={() => { setEditingSessionId(s._id); const d = new Date(s.scheduledAt); setEditScheduledAt(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`); setEditSessionIndex(s.sessionIndex); }} className="text-brand-600 mr-2">Editar</button>
                            <button type="button" onClick={() => handleDeleteSession(s._id)} className="text-red-600">Eliminar</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card title="Evaluaciones">
        {evaluations.length === 0 ? (
          <p className="text-slate-500">Aún no hay evaluaciones. Usa "Nueva evaluación" para empezar.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {evaluations.map((e) => (
              <li key={e._id} className="py-3 flex items-center justify-between">
                <span className="text-slate-600">
                  {e.status === 'completed'
                    ? `Completada ${e.completedAt ? new Date(e.completedAt).toLocaleDateString() : ''}`
                    : 'En curso'}
                </span>
                <span className="font-medium">{e.status === 'completed' ? `${e.total}/30` : '—'}</span>
                {e.status === 'completed' ? (
                  <Link to={`/dashboard/evaluations/${e._id}`} className="text-brand-600 hover:text-brand-700 text-sm font-medium">
                    Ver reporte
                  </Link>
                ) : (
                  <Link to={`/tests/${e.testId}/report`} className="text-brand-600 hover:text-brand-700 text-sm font-medium">
                    Continuar
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
