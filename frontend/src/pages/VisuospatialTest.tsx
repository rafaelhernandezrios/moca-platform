import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CanvasPad } from '../components/ui/CanvasPad';
import type { CanvasPadRef } from '../components/ui/CanvasPad';
import type { VisuospatialTaskId } from '@moca/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STEPS: { id: VisuospatialTaskId; title: string; instruction: string; bgImage?: string; referenceImage?: string }[] = [
    {
        id: 'A_TRAIL',
        title: 'Alternancia Conceptual',
        instruction: 'Dibuje una línea alternando entre cifras y letras, respetando el orden numérico y alfabético. Comience en el 1 y termine en la E (1-A-2-B...)',
        bgImage: '/assets/trail_making_bg.png'
    },
    {
        id: 'B_CUBE',
        title: 'Copiar el Cubo',
        instruction: 'Copie el dibujo del cubo en el espacio de abajo lo más exactamente posible.',
        referenceImage: '/assets/cube_ref.png'
    },
    {
        id: 'C_CLOCK',
        title: 'Dibujar un Reloj',
        instruction: 'Dibuje un reloj circular con todos los números y las agujas marcando las 11:10.'
    }
];

export default function VisuospatialTest() {
    const { testId = 'demo-test' } = useParams(); // Default test ID for demo
    const navigate = useNavigate();
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Puntaje por sub-tarea (se guarda internamente; el paciente NO ve resultados)
    const [scores, setScores] = useState<Record<string, number>>({});
    const padRef = useRef<CanvasPadRef>(null);

    const currentStep = STEPS[currentStepIndex];

    const persistTotal = (updated: Record<string, number>) => {
        const total = Object.values(updated).reduce((a, b) => a + b, 0);
        localStorage.setItem(`moca_${testId}_visuospatial`, total.toString());
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    // Evalúa el dibujo en segundo plano y avanza. El resultado NO se muestra al paciente:
    // solo se acumula el puntaje para el reporte del dashboard.
    const handleEvaluate = async (blob: Blob | null, base64: string) => {
        if (!blob) return;
        setIsSubmitting(true);

        try {
            // Una sola llamada (envía y evalúa) — sin estado en memoria, compatible con serverless.
            const evalResponse = await axios.post(`${API_URL}/tests/${testId}/visuospatial/${currentStep.id}/submit-and-evaluate`, {
                imageBase64: base64,
            });

            const score = Number(evalResponse.data?.score) || 0;
            const updated = { ...scores, [currentStep.id]: score };
            setScores(updated);
            persistTotal(updated);

            // Avanza al siguiente módulo/paso sin mostrar el resultado
            if (currentStepIndex < STEPS.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
            } else {
                navigate(`/tests/${testId}/naming`);
            }
        } catch (error) {
            console.error(error);
            alert('Error al enviar. Revise la consola.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header / Progress */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-900">Visuoespacial / Ejecutiva</h1>
                    <span className="text-sm font-medium text-slate-500">
                        Paso {currentStepIndex + 1} de {STEPS.length}
                    </span>
                </div>

                {/* Instruction Card */}
                <Card className="bg-white">
                    <h2 className="text-xl font-semibold text-brand-700 mb-2">{currentStep.title}</h2>
                    <p className="text-slate-700 text-lg">{currentStep.instruction}</p>

                    {currentStep.referenceImage && (
                        <div className="mt-6 flex justify-center">
                            <img
                                src={currentStep.referenceImage}
                                alt={`Referencia para ${currentStep.title}`}
                                className="max-w-full h-auto max-h-48 border border-slate-200 rounded p-2"
                            />
                        </div>
                    )}
                </Card>

                {/* Drawing Area */}
                <Card title="Área de Dibujo">
                    <CanvasPad
                        ref={padRef}
                        key={currentStep.id} // Re-mount on step change to clear canvas
                        onSave={handleEvaluate}
                        className="mb-4"
                        backgroundImage={currentStep.bgImage}
                    />

                    <div className="flex justify-between mt-4 border-t pt-4">
                        <Button
                            variant="secondary"
                            onClick={handlePrev}
                            disabled={currentStepIndex === 0 || isSubmitting}
                        >
                            ← Anterior
                        </Button>

                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => padRef.current?.clear()}
                                disabled={isSubmitting}
                            >
                                Borrar Trazo
                            </Button>

                            <Button
                                onClick={() => padRef.current?.save()}
                                disabled={isSubmitting}
                                variant="primary"
                            >
                                {isSubmitting ? 'Guardando...' : (currentStepIndex < STEPS.length - 1 ? 'Continuar →' : 'Finalizar sección →')}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
