import React, { useRef, useEffect, useState } from "react";

interface JoystickProps {
    x: number; // 1000-2000
    y: number; // 1000-2000
    isInteractive?: boolean;
    onMove?: (throttle: number, roll: number) => void;
}

export function Joystick({ x, y, isInteractive = false, onMove }: JoystickProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Map 1000-2000 to -1 to 1 for display
    const mapToVisual = (v: number) => ((v - 1500) / 500);
    const xVisual = mapToVisual(x) * 80; // max 80px offset
    const yVisual = mapToVisual(y) * -80; // Invert Y for screen coords (Up is negative px)

    const handleStart = (clientX: number, clientY: number) => {
        if (!isInteractive) return;
        setIsDragging(true);
        handleMove(clientX, clientY);
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!isInteractive || !containerRef.current || !onMove) return;

        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let deltaX = clientX - centerX;
        let deltaY = clientY - centerY;

        // Clamp to radius
        const maxRadius = 80;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > maxRadius) {
            const ratio = maxRadius / distance;
            deltaX *= ratio;
            deltaY *= ratio;
        }

        // Map back to 1000-2000
        // X: -80 to 80 -> 1000 to 2000
        // Y: -80 to 80 -> 2000 to 1000 (Inverted: Up (-Y) is forward (2000))

        const roll = 1500 + (deltaX / 80) * 500;
        const throttle = 1500 - (deltaY / 80) * 500;

        onMove(
            Math.max(1000, Math.min(2000, Math.round(throttle))),
            Math.max(1000, Math.min(2000, Math.round(roll)))
        );
    };

    const handleEnd = () => {
        if (!isInteractive) return;
        setIsDragging(false);
        if (onMove) onMove(1500, 1500); // Reset to center
    };

    // Mouse Events
    const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);

    // Touch Events
    const onTouchStart = (e: React.TouchEvent) => {
        // Prevent scrolling while using joystick
        // e.preventDefault(); // React synthetic events might complain, usually handled in useEffect with non-passive
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };

    useEffect(() => {
        const onWindowMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                handleMove(e.clientX, e.clientY);
            }
        };
        const onWindowMouseUp = () => {
            if (isDragging) {
                handleEnd();
            }
        };

        const onWindowTouchMove = (e: TouchEvent) => {
            if (isDragging) {
                e.preventDefault(); // Stop scrolling
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };
        const onWindowTouchEnd = () => {
            if (isDragging) {
                handleEnd();
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', onWindowMouseMove);
            window.addEventListener('mouseup', onWindowMouseUp);
            window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
            window.addEventListener('touchend', onWindowTouchEnd);
        }

        return () => {
            window.removeEventListener('mousemove', onWindowMouseMove);
            window.removeEventListener('mouseup', onWindowMouseUp);
            window.removeEventListener('touchmove', onWindowTouchMove);
            window.removeEventListener('touchend', onWindowTouchEnd);
        };
    }, [isDragging]);


    return (
        <div
            ref={containerRef}
            className={`w-48 h-48 rounded-full border border-slate-700 bg-slate-800/50 relative mx-auto flex items-center justify-center select-none ${isInteractive ? "cursor-crosshair touch-none" : ""}`}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
        >
            {/* Background Grid */}
            <div className={`absolute inset-0 rounded-full ${isInteractive && isDragging ? "bg-indigo-500/5" : ""}`} />

            {/* Crosshairs */}
            <div className="absolute w-full h-[1px] bg-slate-700/50" />
            <div className="absolute h-full w-[1px] bg-slate-700/50" />

            {/* Stick */}
            <div
                className={`w-10 h-10 rounded-full border shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-transform duration-75 flex items-center justify-center relative z-10
                    ${isInteractive
                        ? (isDragging ? "bg-indigo-500 border-indigo-400 scale-110" : "bg-indigo-500/40 border-indigo-500/60 hover:bg-indigo-500/60")
                        : "bg-slate-600/20 border-slate-600 grayscale opacity-50"
                    }
                `}
                style={{
                    transform: `translate(${xVisual}px, ${yVisual}px)`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
            >
                <div className={`w-3 h-3 rounded-full ${isInteractive ? "bg-white" : "bg-slate-400"}`} />
            </div>

            {/* Interactive Hint */}
            {isInteractive && !isDragging && (
                <div className="absolute bottom-2 text-[10px] text-slate-500 uppercase tracking-wider font-semibold pointer-events-none">
                    Drag to Control
                </div>
            )}
        </div>
    );
}
