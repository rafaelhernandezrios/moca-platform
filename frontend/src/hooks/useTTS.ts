import { useState, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Text-to-Speech con ElevenLabs (voz natural, siempre en español) vía el backend /tts.
 * `speak` devuelve una promesa que se resuelve al terminar la reproducción, para poder
 * encadenar instrucciones. Si ElevenLabs falla, cae al TTS del navegador (es-ES).
 */
export const useTTS = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // Cache texto -> objectURL para no re-generar audios repetidos (ahorra llamadas).
    const cacheRef = useRef<Map<string, string>>(new Map());

    const stopCurrent = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };

    const fallbackSpeak = (text: string) =>
        new Promise<void>((resolve) => {
            if (!('speechSynthesis' in window)) return resolve();
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'es-ES';
            u.rate = 0.9;
            u.onend = () => resolve();
            u.onerror = () => resolve();
            window.speechSynthesis.speak(u);
        });

    const speak = useCallback(async (text: string) => {
        if (!text || !text.trim()) return;
        stopCurrent();
        setIsSpeaking(true);
        try {
            let url = cacheRef.current.get(text);
            if (!url) {
                const res = await fetch(`${API_URL}/tts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text }),
                });
                if (!res.ok) throw new Error(`tts ${res.status}`);
                const blob = await res.blob();
                url = URL.createObjectURL(blob);
                cacheRef.current.set(text, url);
            }
            await new Promise<void>((resolve, reject) => {
                const audio = new Audio(url as string);
                audioRef.current = audio;
                audio.onended = () => resolve();
                audio.onerror = () => reject(new Error('audio error'));
                audio.play().catch(reject);
            });
        } catch (e) {
            console.warn('ElevenLabs TTS falló, usando voz del navegador:', e);
            await fallbackSpeak(text);
        } finally {
            setIsSpeaking(false);
            audioRef.current = null;
        }
    }, []);

    const cancel = useCallback(() => {
        stopCurrent();
        setIsSpeaking(false);
    }, []);

    return { speak, cancel, isSpeaking };
};
