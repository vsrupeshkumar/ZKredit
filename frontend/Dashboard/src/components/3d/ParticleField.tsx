/**
 * Zkredit - Particle Field Background
 * WebGL particle system with mouse interaction
 * Kasane-Cosmos Aesthetic - Mobile Optimized
 */

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { useTheme } from 'next-themes';
import * as THREE from 'three';

interface ParticleFieldProps {
    count?: number;
}

// Detect if device is mobile or low-power
function useOptimizedCount(requestedCount: number): number {
    const [count, setCount] = useState(requestedCount);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const isMobile = window.innerWidth < 768;
        const isLowPower = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let optimizedCount = requestedCount;

        if (prefersReducedMotion) {
            optimizedCount = Math.min(requestedCount, 500);
        } else if (isMobile) {
            optimizedCount = Math.min(requestedCount, 1500);
        } else if (isLowPower) {
            optimizedCount = Math.min(requestedCount, 2500);
        }

        setCount(optimizedCount);

        // Also listen for resize
        const handleResize = () => {
            const isMobileNow = window.innerWidth < 768;
            if (isMobileNow) {
                setCount(Math.min(requestedCount, 1500));
            } else {
                setCount(requestedCount);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [requestedCount]);

    return count;
}

export function ParticleField({ count: requestedCount = 5000 }: ParticleFieldProps) {
    const count = useOptimizedCount(requestedCount);
    const pointsRef = useRef<THREE.Points>(null);
    const { theme } = useTheme();
    const { mouse } = useThree();

    // Generate particle positions
    const particles = useMemo(() => {
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            // Spread particles in a large sphere
            const radius = 10 + Math.random() * 20;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
        }

        return positions;
    }, [count]);

    // Animation loop
    useFrame((state) => {
        if (!pointsRef.current) return;

        const time = state.clock.elapsedTime;

        // Slow ambient rotation
        pointsRef.current.rotation.x = time * 0.05;
        pointsRef.current.rotation.y = time * 0.03;

        // Mouse-reactive movement
        pointsRef.current.rotation.x += mouse.y * 0.02;
        pointsRef.current.rotation.y += mouse.x * 0.02;
    });

    const isDark = theme === 'dark';

    return (
        <Points
            ref={pointsRef}
            positions={particles}
            stride={3}
            frustumCulled={false}
        >
            <PointMaterial
                transparent
                color={isDark ? "#00F0FF" : "#A8D8EA"}
                size={0.05}
                sizeAttenuation={true}
                depthWrite={false}
                opacity={isDark ? 0.6 : 0.4}
                blending={THREE.AdditiveBlending}
            />
        </Points>
    );
}
