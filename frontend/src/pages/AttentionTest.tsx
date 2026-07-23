import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { VoiceRecorder, TranscriptBox } from '../components/ui/VoiceRecorder';
import { useTTS } from '../hooks/useTTS';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Task Configuration
const DIGITS_FORWARD = ['2', '1', '8', '5', '4'];
const DIGITS_BACKWARD = ['7', '4', '2'];
const LETTERS_SEQUENCE = "F B A C M N A A J K L B A F A K D E A A A J A M O F A A B".split(' ');

export default function AttentionTest() {
    const { testId = 'demo-test' } = useParams();
    const navigate = useNavigate();

    // Steps: 0=Intro, 1=DigitsForward, 2=DigitsBackward, 3=Letters, 4=Serial7
    const [currentStep, setCurrentStep] = useState(0);
    const [isReading, setIsReading] = useState(false);
    const [transcript, setTranscript] = useState('');

    // Letters Tap State
    const [letterIndex, setLetterIndex] = useState(-1);
    const [tapErrors, setTapErrors] = useState(0); // taps on non-A or missed A

    const [testResults, setTestResults] = useState<any>({});

    const { speak } = useTTS();

    // Acumula el texto transcrito por Whisper (no borra lo anterior).
    const appendTranscript = (text: string) => {
        setTranscript((prev) => (prev ? `${prev} ${text}` : text));
    };

    // --- Actions ---

    // Series numéricas: una sola locución natural en español (ElevenLabs).
    const playDigits = async (sequence: string[]) => {
        setIsReading(true);
        await speak(sequence.join(', '));
        setIsReading(false);
    };

    // La detección de letras SÍ usa la voz del navegador letra a letra, porque necesita
    // saber qué letra suena en cada momento para validar los toques (sincronía por letra).
    const readSequence = (sequence: string[], rate = 0.8, onChar?: (char: string, index: number) => void) => {
        if (!('speechSynthesis' in window)) return;
        setIsReading(true);
        setLetterIndex(-1);

        let currentIndex = 0;

        const speakNext = () => {
            if (currentIndex >= sequence.length) {
                setIsReading(false);
                setLetterIndex(-1);
                return;
            }

            const char = sequence[currentIndex];
            if (onChar) onChar(char, currentIndex);

            const utterance = new SpeechSynthesisUtterance(char);
            utterance.lang = 'es-ES';
            utterance.rate = rate;

            utterance.onend = () => {
                currentIndex++;
                setTimeout(speakNext, 1000); // 1 sec interval
            };

            window.speechSynthesis.speak(utterance);
        };

        speakNext();
    };

    // --- Letters Logic ---
    const handleLetterTap = () => {
        // User taps button. Check if current letter is A
        if (currentStep === 3 && isReading && letterIndex >= 0) {
            const currentLetter = LETTERS_SEQUENCE[letterIndex];
            if (currentLetter !== 'A') {
                setTapErrors(prev => prev + 1);
                console.log("Error: Tapped on " + currentLetter);
            } else {
                console.log("Correct Tap on A");
            }
        }
    };

    // --- Navigation ---

    const [isSubmitting, setIsSubmitting] = useState(false);

    const nextStep = () => {
        // Save results if needed
        if (currentStep === 1) setTestResults({ ...testResults, digitsForward: transcript });
        if (currentStep === 2) setTestResults({ ...testResults, digitsBackward: transcript });
        if (currentStep === 3) setTestResults({ ...testResults, letterErrors: tapErrors });

        setCurrentStep(prev => prev + 1);
        setTranscript('');
        setTapErrors(0);
    };

    // Envía todos los datos de atención al backend para puntuación automática (el paciente no ve el puntaje)
    const finishModule = async () => {
        setIsSubmitting(true);
        const submission = {
            testId,
            digitsForward: testResults.digitsForward || '',
            digitsBackward: testResults.digitsBackward || '',
            letterErrors: typeof testResults.letterErrors === 'number' ? testResults.letterErrors : tapErrors,
            serial7: transcript, // paso actual
        };
        try {
            const res = await axios.post(`${API_URL}/attention/submit`, submission);
            const score = Number(res.data?.score) || 0;
            localStorage.setItem(`moca_${testId}_attention`, score.toString());
        } catch (err) {
            console.error('Attention scoring failed', err);
            localStorage.setItem(`moca_${testId}_attention`, '0');
        } finally {
            setIsSubmitting(false);
            navigate(`/tests/${testId}/language`);
        }
    };

    // --- Renders ---

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-900">Atención</h1>
                    <span className="text-sm font-medium text-slate-500">Paso {currentStep + 1} de 5</span>
                    {/* nota: el paso 5 (índice 4) es la resta en serie y finaliza el módulo */}
                </div>

                <Card className="bg-white p-8">

                    {/* Intro */}
                    {currentStep === 0 && (
                        <div className="text-center space-y-6">
                            <h2 className="text-xl font-bold">Instrucciones</h2>
                            <p className="text-slate-600">Esta sección evaluará su atención mediante series de números, letras y cálculos matemáticos.</p>
                            <Button onClick={nextStep} variant="primary">Comenzar</Button>
                        </div>
                    )}

                    {/* Digits Forward */}
                    {currentStep === 1 && (
                        <div className="space-y-6 text-center">
                            <h2 className="text-xl font-bold">Serie Numérica (Directa)</h2>
                            <p className="text-blue-800 bg-blue-50 p-4 rounded-lg">"Voy a decirle algunos números. Escuche atentamente y cuando yo termine, repítalos exactamente como yo los dije."</p>

                            <div className="flex flex-col items-center gap-4">
                                <Button onClick={() => playDigits(DIGITS_FORWARD)} disabled={isReading}>
                                    {isReading ? '🔊 Leyendo...' : '▶️ Reproducir Serie'}
                                </Button>
                                <VoiceRecorder onResult={appendTranscript} idleLabel="🎙️ Responder" />
                            </div>

                            <TranscriptBox transcript={transcript} onClear={() => setTranscript('')} placeholder="Su respuesta aparecerá aquí..." />

                            <Button onClick={nextStep} className="w-full">Siguiente</Button>
                        </div>
                    )}

                    {/* Digits Backward */}
                    {currentStep === 2 && (
                        <div className="space-y-6 text-center">
                            <h2 className="text-xl font-bold">Serie Numérica (Inversa)</h2>
                            <p className="text-blue-800 bg-blue-50 p-4 rounded-lg">"Ahora voy a decirle otros números, pero cuando yo termine, repítalos AL REVÉS (hacia atrás)."</p>

                            <div className="flex flex-col items-center gap-4">
                                <Button onClick={() => playDigits(DIGITS_BACKWARD)} disabled={isReading}>
                                    {isReading ? '🔊 Leyendo...' : '▶️ Reproducir Serie'}
                                </Button>
                                <VoiceRecorder onResult={appendTranscript} idleLabel="🎙️ Responder" />
                            </div>

                            <TranscriptBox transcript={transcript} onClear={() => setTranscript('')} placeholder="Su respuesta aparecerá aquí..." />

                            <Button onClick={nextStep} className="w-full">Siguiente</Button>
                        </div>
                    )}

                    {/* Letters */}
                    {currentStep === 3 && (
                        <div className="space-y-6 text-center">
                            <h2 className="text-xl font-bold">Detección de Letras</h2>
                            <p className="text-blue-800 bg-blue-50 p-4 rounded-lg">"Voy a leerle una serie de letras. Cada vez que escuche la letra 'A', dé un golpecito con la mano (toque el botón)."</p>

                            <div className="flex items-center justify-center h-32">
                                <Button
                                    onClick={handleLetterTap}
                                    disabled={!isReading}
                                    className={`w-32 h-32 rounded-full text-2xl shadow-xl transition-all ${isReading ? 'bg-brand-600 hover:scale-105 active:scale-95' : 'bg-slate-200 text-slate-400'
                                        }`}
                                >
                                    TAP 👋
                                </Button>
                            </div>

                            <Button
                                onClick={() => readSequence(LETTERS_SEQUENCE, 1, (_char, idx) => setLetterIndex(idx))}
                                disabled={isReading}
                                variant="secondary"
                            >
                                {isReading ? '🔊 Leyendo...' : '▶️ Iniciar Prueba'}
                            </Button>

                            <Button onClick={nextStep} className="w-full">Siguiente</Button>
                        </div>
                    )}

                    {/* Serial 7s */}
                    {currentStep === 4 && (
                        <div className="space-y-6 text-center">
                            <h2 className="text-xl font-bold">Resta en Serie (7)</h2>
                            <p className="text-blue-800 bg-blue-50 p-4 rounded-lg">"Ahora, quiero que reste 7 de 100, y luego continúe restando 7 a la cifra anterior hasta que yo le diga que pare."</p>
                            <p className="text-sm text-slate-500">(Ejemplo: 100 - 7 = ?, ? - 7 = ...)</p>

                            <VoiceRecorder onResult={appendTranscript} idleLabel="🎙️ Comenzar a Hablar" />

                            <TranscriptBox transcript={transcript} onClear={() => setTranscript('')} placeholder="Diga los números..." mono />

                            <Button onClick={finishModule} disabled={isSubmitting} className="w-full">
                                {isSubmitting ? 'Guardando...' : 'Finalizar Sección'}
                            </Button>
                        </div>
                    )}

                </Card>
            </div>
        </div>
    );
}
