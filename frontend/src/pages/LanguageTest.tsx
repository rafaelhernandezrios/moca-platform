import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { VoiceRecorder, TranscriptBox } from '../components/ui/VoiceRecorder';
import { useTTS } from '../hooks/useTTS';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Task Configuration
const SENTENCE_1 = "El gato se esconde bajo el sofá cuando los perros entran en la sala";
const SENTENCE_2 = "Espero que él le entregue el mensaje una vez que ella se lo pida";
const FLUENCY_TIME = 60; // segundos (guía informativa)

export default function LanguageTest() {
    const { testId = 'demo-test' } = useParams();
    const navigate = useNavigate();

    // Steps: 0=Intro, 1=Sentence1, 2=Sentence2, 3=FluencyIntro, 4=FluencyTask
    const [currentStep, setCurrentStep] = useState(0);
    const [isReading, setIsReading] = useState(false);
    const [transcript, setTranscript] = useState('');

    // Cronómetro informativo de la fluidez
    const [timeLeft, setTimeLeft] = useState(FLUENCY_TIME);
    const [timerStarted, setTimerStarted] = useState(false);

    const [testResults, setTestResults] = useState<any>({});

    // Cuenta regresiva informativa (no detiene la grabación automáticamente)
    useEffect(() => {
        if (!timerStarted || timeLeft <= 0) return;
        const id = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
        return () => clearInterval(id);
    }, [timerStarted, timeLeft]);

    // Acumula el texto transcrito por Whisper (no borra lo anterior).
    const appendTranscript = (text: string) => {
        setTranscript((prev) => (prev ? `${prev} ${text}` : text));
    };

    // Conteo aproximado de palabras (para la fluidez)
    const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

    // --- Actions ---

    const { speak } = useTTS();

    const readText = async (text: string) => {
        setIsReading(true);
        await speak(text);
        setIsReading(false);
    };

    // --- Navigation ---

    const [isSubmitting, setIsSubmitting] = useState(false);

    const nextStep = () => {
        // Save results
        if (currentStep === 1) setTestResults({ ...testResults, sentence1: transcript });
        if (currentStep === 2) setTestResults({ ...testResults, sentence2: transcript });

        setCurrentStep(prev => prev + 1);
        setTranscript('');
    };

    // Envía todos los datos de lenguaje al backend para puntuación automática (el paciente no ve el puntaje)
    const finishModule = async () => {
        setIsSubmitting(true);
        const submission = {
            testId,
            sentence1: testResults.sentence1 || '',
            sentence2: testResults.sentence2 || '',
            fluencyWords: transcript, // paso de fluidez actual
        };
        try {
            const res = await axios.post(`${API_URL}/language/submit`, submission);
            const score = Number(res.data?.score) || 0;
            localStorage.setItem(`moca_${testId}_language`, score.toString());
        } catch (err) {
            console.error('Language scoring failed', err);
            localStorage.setItem(`moca_${testId}_language`, '0');
        } finally {
            setIsSubmitting(false);
            navigate(`/tests/${testId}/abstraction`);
        }
    };

    // --- Renders ---

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-900">Lenguaje</h1>
                    <span className="text-sm font-medium text-slate-500">Paso {currentStep + 1} de 5</span>
                </div>

                <Card className="bg-white p-8">

                    {/* Intro */}
                    {currentStep === 0 && (
                        <div className="text-center space-y-6">
                            <h2 className="text-xl font-bold">Instrucciones</h2>
                            <p className="text-slate-600">Esta sección evaluará sus habilidades de lenguaje mediante repetición de frases y fluidez verbal.</p>
                            <Button onClick={nextStep} variant="primary">Comenzar</Button>
                        </div>
                    )}

                    {/* Sentence 1 */}
                    {currentStep === 1 && (
                        <div className="space-y-6 text-center">
                            <h2 className="text-xl font-bold">Repetición de Frases (1)</h2>
                            <p className="text-blue-800 bg-blue-50 p-4 rounded-lg">"Le voy a leer una frase. Repítala exactamente cuando yo termine."</p>

                            <div className="flex flex-col items-center gap-4">
                                <Button onClick={() => readText(SENTENCE_1)} disabled={isReading}>
                                    {isReading ? '🔊 Leyendo...' : '▶️ Escuchar Frase'}
                                </Button>
                                <VoiceRecorder onResult={appendTranscript} idleLabel="🎙️ Repetir" />
                            </div>

                            <TranscriptBox transcript={transcript} onClear={() => setTranscript('')} placeholder="Su respuesta..." />

                            <Button onClick={nextStep} className="w-full">Siguiente</Button>
                        </div>
                    )}

                    {/* Sentence 2 */}
                    {currentStep === 2 && (
                        <div className="space-y-6 text-center">
                            <h2 className="text-xl font-bold">Repetición de Frases (2)</h2>
                            <p className="text-blue-800 bg-blue-50 p-4 rounded-lg">"Ahora le voy a leer otra frase. Repítala exactamente cuando yo termine."</p>

                            <div className="flex flex-col items-center gap-4">
                                <Button onClick={() => readText(SENTENCE_2)} disabled={isReading}>
                                    {isReading ? '🔊 Leyendo...' : '▶️ Escuchar Frase'}
                                </Button>
                                <VoiceRecorder onResult={appendTranscript} idleLabel="🎙️ Repetir" />
                            </div>

                            <TranscriptBox transcript={transcript} onClear={() => setTranscript('')} placeholder="Su respuesta..." />

                            <Button onClick={nextStep} className="w-full">Siguiente</Button>
                        </div>
                    )}

                    {/* Fluency Intro */}
                    {currentStep === 3 && (
                        <div className="space-y-6 text-center">
                            <h2 className="text-xl font-bold">Fluidez Verbal</h2>
                            <div className="bg-blue-50 p-4 rounded-lg text-left space-y-2 text-blue-900">
                                <p><strong>Instrucciones:</strong></p>
                                <p>Diga el mayor número posible de palabras que comiencen por la letra <strong>"P"</strong> en 1 minuto.</p>
                                <p>Ejemplo: "Pato", "Pera", "Piedra"...</p>
                                <ul className="list-disc pl-5 text-sm mt-2">
                                    <li>No diga nombres propios (ej. Pedro, París).</li>
                                    <li>No diga números.</li>
                                    <li>No diga palabras de la misma familia (ej. Pato, Patito).</li>
                                </ul>
                            </div>
                            <Button onClick={nextStep} variant="primary" size="lg">Estoy listo</Button>
                        </div>
                    )}

                    {/* Fluency Task */}
                    {currentStep === 4 && (
                        <div className="space-y-6 text-center">
                            <h2 className="text-xl font-bold">Fluidez Verbal (Letra P)</h2>

                            <div className={`text-5xl font-mono font-bold mb-2 ${timeLeft <= 10 && timerStarted ? 'text-red-600' : 'text-slate-700'}`}>
                                00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                            </div>
                            <p className="text-sm text-slate-500">
                                Grabe diciendo palabras con "P" durante ~1 minuto. Puede grabar varias veces; el tiempo es una guía.
                            </p>

                            <div className="flex justify-center">
                                <VoiceRecorder
                                    onResult={appendTranscript}
                                    idleLabel="🎙️ Grabar palabras"
                                    onRecordingChange={(rec) => { if (rec) setTimerStarted(true); }}
                                />
                            </div>

                            <div className="mt-2">
                                <span className="text-sm font-bold uppercase text-slate-500">Palabras (aprox): {wordCount}</span>
                                <TranscriptBox transcript={transcript} onClear={() => setTranscript('')} placeholder="Las palabras aparecerán aquí..." />
                            </div>

                            <Button onClick={finishModule} disabled={isSubmitting || !transcript} className="w-full">
                                {isSubmitting ? 'Guardando...' : 'Continuar →'}
                            </Button>
                        </div>
                    )}

                </Card>
            </div>
        </div>
    );
}
