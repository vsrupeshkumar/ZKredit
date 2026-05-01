/**
 * Fluid Background Component
 * Premium animated gradient background inspired by Phantom wallet
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface FluidBackgroundProps {
    variant?: 'default' | 'cyber-noir' | 'foggy-future';
    intensity?: 'low' | 'medium' | 'high';
}

export function FluidBackground({
    variant = 'default',
    intensity = 'medium'
}: FluidBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const setCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        // Obsidian theme - subtle, dark colors
        const colorSchemes = {
            'default': ['#5b21b6', '#6d28d9', '#7c3aed', '#8b5cf6'],
            'cyber-noir': ['#1e1b4b', '#312e81', '#4338ca', '#6366f1'],
            'foggy-future': ['#1e293b', '#334155', '#475569', '#64748b']
        };

        const colors = colorSchemes[variant];

        // Blob configuration
        const blobs: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;
            color: string;
        }> = [];

        const blobCount = intensity === 'low' ? 3 : intensity === 'high' ? 6 : 4;

        // Initialize blobs
        for (let i = 0; i < blobCount; i++) {
            blobs.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: 150 + Math.random() * 200,
                color: colors[i % colors.length]
            });
        }

        let animationId: number;

        const animate = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Update and draw blobs
            blobs.forEach(blob => {
                // Update position
                blob.x += blob.vx * 0.5;
                blob.y += blob.vy * 0.5;

                // Bounce off edges
                if (blob.x - blob.radius < 0 || blob.x + blob.radius > canvas.width) {
                    blob.vx *= -1;
                }
                if (blob.y - blob.radius < 0 || blob.y + blob.radius > canvas.height) {
                    blob.vy *= -1;
                }

                // Create radial gradient - very subtle for obsidian theme
                const gradient = ctx.createRadialGradient(
                    blob.x, blob.y, 0,
                    blob.x, blob.y, blob.radius
                );

                gradient.addColorStop(0, `${blob.color}15`); // Very low opacity
                gradient.addColorStop(0.5, `${blob.color}08`); // Even lower
                gradient.addColorStop(1, `${blob.color}00`); // transparent

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', setCanvasSize);
            cancelAnimationFrame(animationId);
        };
    }, [variant, intensity]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 overflow-hidden bg-background"
            style={{ zIndex: -1 }}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full blur-3xl opacity-20"
            />

            {/* Subtle gradient overlay for obsidian depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background" />

            {/* Very subtle noise texture */}
            <div
                className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
                }}
            />
        </motion.div>
    );
}
