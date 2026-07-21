import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';


export interface CanvasPadRef {
    clear: () => void;
    save: () => void;
}

interface CanvasPadProps {
    onSave?: (blob: Blob | null, base64: string) => void;
    className?: string;
    backgroundImage?: string;
}

export const CanvasPad = forwardRef<CanvasPadRef, CanvasPadProps>(({ onSave, className = '', backgroundImage }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bgImageElRef = useRef<HTMLImageElement | null>(null);
    // Tracks whether the user has actually drawn a stroke. Without this, a
    // resize/redraw (e.g. triggered when the reference image finishes loading)
    // would snapshot-and-restore the plain white/background canvas on top of
    // itself, masking any newly baked-in background image.
    const hasUserDrawnRef = useRef(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
    // Bumped whenever the background/reference image finishes loading, so the
    // draw effect below re-runs and bakes it into the canvas immediately
    // (instead of only appearing after the next unrelated redraw, e.g. Clear).
    const [bgImageVersion, setBgImageVersion] = useState(0);

    const applyCanvasStyle = (ctx: CanvasRenderingContext2D) => {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
    };

    // Draws `img` into the canvas scaled to fit (like CSS `object-fit: contain`),
    // centered within displayWidth x displayHeight.
    const drawImageContained = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, displayWidth: number, displayHeight: number) => {
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const boxRatio = displayWidth / displayHeight;
        let drawWidth: number, drawHeight: number;
        if (imgRatio > boxRatio) {
            drawWidth = displayWidth;
            drawHeight = displayWidth / imgRatio;
        } else {
            drawHeight = displayHeight;
            drawWidth = displayHeight * imgRatio;
        }
        const dx = (displayWidth - drawWidth) / 2;
        const dy = (displayHeight - drawHeight) / 2;
        ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
    };

    const resizeCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const displayWidth = canvas.offsetWidth;
        const displayHeight = canvas.offsetHeight;
        if (displayWidth === 0 || displayHeight === 0) return; // layout not ready yet, skip

        // Preserve existing drawing before resizing (resizing wipes the buffer).
        // Only bother if the user has actually drawn something — otherwise we'd
        // snapshot a plain white/background-only canvas and paint it back on top
        // after redrawing, masking a freshly baked-in reference image.
        let snapshot: ImageData | null = null;
        if (hasUserDrawnRef.current) {
            const prevCtx = canvas.getContext('2d');
            if (prevCtx && canvas.width > 0 && canvas.height > 0) {
                try {
                    snapshot = prevCtx.getImageData(0, 0, canvas.width, canvas.height);
                } catch {
                    snapshot = null;
                }
            }
        }

        // Render at device pixel ratio for crisper, more legible strokes (helps AI evaluation)
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            // IMPORTANT: canvas is transparent by default. When exported as PNG and
            // sent to the AI, different vision models flatten transparency to
            // different colors (white, black, etc.), which can make the drawing
            // invisible or trigger false "blank canvas" results. Always paint an
            // opaque white background so the exported image is unambiguous.
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, displayWidth, displayHeight);

            // Bake the reference/background image directly into the canvas (instead
            // of layering a separate <img> behind a transparent canvas). This way
            // what's visible on screen is exactly what gets exported to the AI —
            // previously the background image was invisible to the AI export, and
            // painting the canvas opaque white (fix above) started hiding it visually too.
            if (bgImageElRef.current && bgImageElRef.current.complete && bgImageElRef.current.naturalWidth > 0) {
                drawImageContained(ctx, bgImageElRef.current, displayWidth, displayHeight);
            }

            applyCanvasStyle(ctx);
            if (snapshot) {
                // Restore previous drawing scaled to the new buffer
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = snapshot.width;
                tempCanvas.height = snapshot.height;
                const tempCtx = tempCanvas.getContext('2d');
                if (tempCtx) {
                    tempCtx.putImageData(snapshot, 0, 0);
                    ctx.drawImage(tempCanvas, 0, 0, snapshot.width, snapshot.height, 0, 0, displayWidth, displayHeight);
                }
            }
            setContext(ctx);
        }
    };

    // Load the background/reference image (if any) before drawing it into the canvas.
    useEffect(() => {
        bgImageElRef.current = null;
        if (!backgroundImage) return;
        let cancelled = false;
        const img = new Image();
        img.onload = () => {
            if (cancelled) return;
            bgImageElRef.current = img;
            // Bump state so the draw effect below re-runs and bakes this in right
            // away, instead of relying only on this callback to call resizeCanvas
            // (which could race with layout not being ready yet on first mount).
            setBgImageVersion(v => v + 1);
        };
        img.src = backgroundImage;
        return () => { cancelled = true; };
    }, [backgroundImage]);

    useEffect(() => {
        // Initial sizing (also re-runs once the background image above finishes
        // loading, via the bgImageVersion dependency, guaranteeing it gets baked
        // into the canvas without needing an unrelated redraw like Clear).
        resizeCanvas();

        // Keep canvas buffer in sync with actual rendered size (mobile toolbars,
        // orientation changes, or late layout can change offsetWidth/offsetHeight
        // after mount, which previously left the canvas buffer stale/blank).
        const canvas = canvasRef.current;
        if (!canvas) return;

        const observer = new ResizeObserver(() => {
            resizeCanvas();
        });
        observer.observe(canvas);

        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backgroundImage, bgImageVersion]);

    useImperativeHandle(ref, () => ({
        clear: () => {
            if (context && canvasRef.current) {
                hasUserDrawnRef.current = false;
                // Use display (CSS) size, not the DPR-scaled buffer size, since the
                // context has a scale transform applied that already accounts for DPR.
                const w = canvasRef.current.offsetWidth;
                const h = canvasRef.current.offsetHeight;
                context.clearRect(0, 0, w, h);
                // Repaint opaque white background (see resizeCanvas for why).
                context.fillStyle = "white";
                context.fillRect(0, 0, w, h);
                // Redraw the baked-in reference/background image, if any.
                if (bgImageElRef.current && bgImageElRef.current.complete && bgImageElRef.current.naturalWidth > 0) {
                    drawImageContained(context, bgImageElRef.current, w, h);
                }
                applyCanvasStyle(context);
            }
        },
        save: () => {
            const canvas = canvasRef.current;
            if (canvas && onSave) {
                const ctx = canvas.getContext('2d');
                if (ctx && canvas.width > 0 && canvas.height > 0) {
                    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    let hasInk = false;
                    // Canvas has an opaque white background now, so check for any
                    // non-white pixel (a small tolerance avoids false positives from
                    // anti-aliasing noise) instead of relying on alpha.
                    for (let i = 0; i < data.length; i += 4) {
                        if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) { hasInk = true; break; }
                    }
                    if (!hasInk) {
                        alert('No se detectó ningún trazo en el dibujo. Intenta dibujar de nuevo antes de evaluar (si el problema persiste, recarga la página).');
                        return;
                    }
                }
                canvas.toBlob((blob) => {
                    const base64 = canvas.toDataURL('image/png');
                    onSave(blob, base64);
                });
            }
        }
    }));

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!context) return;
        hasUserDrawnRef.current = true;
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        context.beginPath();
        context.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !context) return;
        const { x, y } = getCoordinates(e);
        context.lineTo(x, y);
        context.stroke();
    };

    const stopDrawing = () => {
        if (context) context.closePath();
        setIsDrawing(false);
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            <div className="relative border-2 border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden touch-none" style={{ height: '400px' }}>
                {/* backgroundImage (if provided) is baked directly into the canvas
                    raster in resizeCanvas(), so what's displayed matches exactly
                    what gets exported and sent to the AI for evaluation. */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full cursor-crosshair z-10"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>
            {/* External controls only */}
        </div>
    );
});

CanvasPad.displayName = "CanvasPad";
