import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useTTS } from '../hooks/useTTS';
import axios from 'axios';

const TARGET_WORDS = ['ROSTRO', 'SEDA', 'IGLESIA', 'CLAVEL', 'ROJO'];

const CUES: Record<string, { category: string; choices: string[] }> = {
    'ROSTRO': { category: 'parte del cuerpo', choices: ['Nariz', 'Rostro', 'Mano'] },
    'SEDA': { category: 'tipo de tela', choices: ['Lana', 'Algodón', 'Seda'] },
    'IGLESIA': { category: 'tipo de edificio', choices: ['Iglesia', 'Escuela', 'Hospital'] },
    'CLAVEL': { category: 'tipo de flor', choices: ['Rosa', 'Clavel', 'Margarita'] },
    'ROJO': { category: 'un color', choices: ['Rojo', 'Azul', 'Verde'] }
};

const DelayedRecallTest: React.FC = () => {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    const { speak } = useTTS();

    // Steps: 
    // 0: Instruction "Tell me words"
    // 1: Spontaneous Entry
    // 2..N: Cued/Choice loops for missing words
    const [step, setStep] = useState(0);
    const [spontaneousInput, setSpontaneousInput] = useState('');
    const [missedWords, setMissedWords] = useState<string[]>([]);

    // For Cued flow
    const [currentMissedIndex, setCurrentMissedIndex] = useState(0);
    const [subStep, setSubStep] = useState<'CUE' | 'CHOICE' | 'DONE'>('CUE');

    useEffect(() => {
        if (step === 0) {
            speak("Antes le leí una serie de palabras y le pedí que las recordase. Dígame ahora todas las palabras que recuerde.");
        }
    }, [step, speak]);

    const handleSpontaneousSubmit = () => {
        const userWords = spontaneousInput.toUpperCase().split(/[\s,]+/).filter(w => w.length > 0);

        // Calculate missed words locally to drive the UI flow
        const missed = TARGET_WORDS.filter(target => !userWords.includes(target));

        if (missed.length === 0) {
            // Perfect score!
            submitResults(userWords);
        } else {
            setMissedWords(missed);
            setCurrentMissedIndex(0);
            setSubStep('CUE');
            setStep(2); // Move to Cued phase
        }
    };

    // Effect to speak cues
    useEffect(() => {
        if (step === 2 && subStep === 'CUE' && missedWords.length > 0) {
            const word = missedWords[currentMissedIndex];
            const cue = CUES[word];
            speak(`Para la palabra que olvidó, la pista es: ${cue.category}. ¿Cuál es la palabra?`);
        } else if (step === 2 && subStep === 'CHOICE') {
            const word = missedWords[currentMissedIndex];
            const cue = CUES[word];
            speak(`¿Era ${cue.choices[0]}, ${cue.choices[1]} o ${cue.choices[2]}? Seleccione la correcta.`);
        }
    }, [step, subStep, currentMissedIndex, missedWords, speak]);

    const handleCueResponse = (response: string) => {
        const target = missedWords[currentMissedIndex];
        if (response.toUpperCase().includes(target)) {
            // Correct with Cue
            nextMissedWord();
        } else {
            // Failed Cue -> Go to Choice
            setSubStep('CHOICE');
        }
    };

    const handleChoiceResponse = (_choice: string) => {
        // RECORD CHOICE? (for clinical notes, strictly MoCA score is 0 if it reached here usually, but we save data)
        nextMissedWord();
    };

    const nextMissedWord = () => {
        if (currentMissedIndex < missedWords.length - 1) {
            setCurrentMissedIndex(prev => prev + 1);
            setSubStep('CUE');
        } else {
            // All done
            submitResults(spontaneousInput.split(' ')); // Simplification: re-sending raw input + we could send detail
        }
    };

    const submitResults = async (spontaneousWords: string[]) => {
        try {
            const response = await axios.post(`http://localhost:3000/delayed-recall/submit`, {
                testId,
                taskId: "RECALL_SPONTANEOUS",
                data: { words: spontaneousWords },
                metadata: { timestamp: Date.now() }
            });

            // Save Score
            const result = (response as any).data;
            if (result && typeof result.score === 'number') {
                localStorage.setItem(`moca_${testId}_delayed_recall`, result.score.toString());
            }

            console.log("Delayed Recall Finished");
            alert("Test Completo. Gracias.");
            navigate(`/tests/${testId}/orientation`); // Next Module: Orientation
        } catch (e) {
            console.error(e);
            alert("Error saving results");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <h1 className="text-2xl font-bold text-slate-900">Recuerdo Diferido</h1>

                <Card className="p-8 space-y-8">
                    {step === 0 || step === 1 ? (
                        <div className="space-y-4">
                            <p className="text-lg">Escriba todas las palabras que recuerde (separadas por espacio):</p>
                            <textarea
                                className="w-full p-4 border rounded"
                                value={spontaneousInput}
                                onChange={e => setSpontaneousInput(e.target.value)}
                                rows={4}
                            />
                            <Button onClick={() => setStep(1)} disabled={step === 1}>Comenzar a Escribir</Button>
                            {step === 1 && (
                                <Button onClick={handleSpontaneousSubmit} className="w-full bg-indigo-600 text-white">
                                    Terminar y Verificar
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="text-center space-y-6">
                            <h2 className="text-xl font-bold">Ayuda de Memoria ({currentMissedIndex + 1}/{missedWords.length})</h2>

                            {subStep === 'CUE' && (
                                <div className="space-y-4">
                                    <p>Pista: <strong>{CUES[missedWords[currentMissedIndex]].category}</strong></p>
                                    <input id="cueInput" className="border p-2 rounded" placeholder="Escriba la palabra..." />
                                    <Button onClick={() => {
                                        const val = (document.getElementById('cueInput') as HTMLInputElement).value;
                                        handleCueResponse(val);
                                    }}>Enviar</Button>
                                </div>
                            )}

                            {subStep === 'CHOICE' && (
                                <div className="grid grid-cols-1 gap-4">
                                    <p>Seleccione la palabra correcta:</p>
                                    {CUES[missedWords[currentMissedIndex]].choices.map(choice => (
                                        <Button key={choice} onClick={() => handleChoiceResponse(choice)} variant="outline">
                                            {choice}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default DelayedRecallTest;
