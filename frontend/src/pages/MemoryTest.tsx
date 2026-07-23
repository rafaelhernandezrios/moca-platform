import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { VoiceRecorder, TranscriptBox } from '../components/ui/VoiceRecorder';
import { useTTS } from '../hooks/useTTS';
import type { MemoryWord } from '@moca/shared';

const WORDS: MemoryWord[] = ['ROSTRO', 'SEDA', 'IGLESIA', 'CLAVEL', 'ROJO'];

export default function MemoryTest() {
    const { testId = 'demo-test' } = useParams();
    const navigate = useNavigate();

    const [trial, setTrial] = useState<1 | 2>(1);
    const [isReading, setIsReading] = useState(false);
    const [transcript, setTranscript] = useState('');

    // Acumula el texto transcrito por Whisper (no se muestran las palabras objetivo
    // para no arruinar la prueba de memoria).
    const handleTranscript = (text: string) => {
        setTranscript((prev) => (prev ? `${prev} ${text}` : text));
    };

    const { speak } = useTTS();

    const readWords = async () => {
        setIsReading(true);
        await speak(WORDS.join('. ')); // Pausa entre palabras
        setIsReading(false);
    };

    const handleNextTrial = () => {
        if (trial === 1) {
            setTrial(2);
            setTranscript('');
        } else {
            // Fin de la fase de aprendizaje (sin puntaje; se evalúa en Recuerdo Diferido)
            alert("Instrucción Final: 'Recuerde estas palabras, se las pediré de nuevo al final de la prueba'.");
            navigate(`/tests/${testId}/attention`);
        }
    };



    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-900">Memoria (Recuerdo Inmediato)</h1>
                    <span className="text-sm font-medium text-slate-500">Paso 5 - Intento {trial} de 2</span>
                </div>

                <Card className="bg-white p-8">
                    <div className="mb-8 p-4 bg-blue-50 text-blue-800 rounded-lg flex items-start gap-3">
                        <span className="text-2xl">📢</span>
                        <div>
                            <p className="font-bold">Instrucción al Paciente:</p>
                            <p>"Voy a leerle una lista de palabras que debe recordar ahora y más tarde. Escuche con atención y cuando yo termine, dígame todas las palabras que pueda recordar."</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center space-y-8">

                        {/* Status Icon */}
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl transition-all duration-500 ${isReading ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-200' : 'bg-slate-100 text-slate-400'
                            }`}>
                            {isReading ? '🔊' : '👂'}
                        </div>

                        {/* Transcript Feedback */}
                        <div className="w-full max-w-md">
                            <p className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider text-center">Tu Respuesta</p>
                            <TranscriptBox transcript={transcript} onClear={() => setTranscript('')} placeholder="Graba y repite las palabras que recuerdes..." />
                        </div>

                        {/* Controls */}
                        <div className="flex flex-wrap gap-4 justify-center items-center">
                            <Button
                                onClick={readWords}
                                disabled={isReading}
                                variant="secondary"
                                className="w-48"
                            >
                                {isReading ? 'Leyendo...' : '🔊 Leer Palabras'}
                            </Button>

                            <VoiceRecorder onResult={handleTranscript} idleLabel="🎙️ Grabar respuesta" disabled={isReading} />
                        </div>
                    </div>
                </Card>



                <div className="flex justify-between border-t border-slate-200 pt-6">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            if (trial === 2) setTrial(1);
                            else navigate(`/tests/${testId}/naming`);
                        }}
                    >
                        ← Anterior
                    </Button>

                    <Button onClick={handleNextTrial} variant="primary">
                        {trial === 1 ? 'Siguiente Intento →' : 'Finalizar Sección →'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
