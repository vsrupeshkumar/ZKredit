/**
 * Zkredit - Holographic 3D Analytics Charts
 * Immersive 3D visualization of loan analytics
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';

interface DataPoint {
    x: number;
    y: number;
    z?: number;
    label?: string;
    value: number;
}

interface AnalyticsChart3DProps {
    data: DataPoint[];
    type: 'line' | 'bar' | 'surface' | 'scatter';
    color?: string;
    height?: number;
    width?: number;
    depth?: number;
    animated?: boolean;
}

export function AnalyticsChart3D({
    data,
    type = 'line',
    color = '#00FF88',
    height = 2,
    width = 4,
    depth = 2,
    animated = true
}: AnalyticsChart3DProps) {
    const groupRef = useRef<THREE.Group>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    // Normalize data
    const normalizedData = useMemo(() => {
        if (data.length === 0) return [];
        
        const maxValue = Math.max(...data.map(d => d.value));
        const minValue = Math.min(...data.map(d => d.value));
        const range = maxValue - minValue || 1;
        
        return data.map((point, index) => {
            const normalizedY = ((point.value - minValue) / range) * height;
            const x = (index / (data.length - 1 || 1)) * width - width / 2;
            const z = point.z ? point.z * depth : 0;
            
            return {
                x,
                y: normalizedY,
                z,
                value: point.value,
                label: point.label
            };
        });
    }, [data, height, width, depth]);

    useFrame((state) => {
        if (!groupRef.current || !animated) return;
        
        // Subtle rotation
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
        
        // Holographic glow effect
        if (materialRef.current) {
            const intensity = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.7;
            materialRef.current.emissiveIntensity = intensity;
        }
    });

    const points = normalizedData.map(d => new THREE.Vector3(d.x, d.y, d.z));

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            {/* Base grid */}
            <gridHelper args={[width, 10, color, color]} />
            
            {/* Chart visualization based on type */}
            {type === 'line' && (
                <>
                    <Line
                        points={points}
                        color={color}
                        lineWidth={3}
                    />
                    {normalizedData.map((point, i) => (
                        <mesh key={i} position={[point.x, point.y, point.z]}>
                            <sphereGeometry args={[0.05, 16, 16]} />
                            <meshStandardMaterial
                                ref={i === 0 ? materialRef : undefined}
                                color={color}
                                emissive={color}
                                emissiveIntensity={0.5}
                            />
                        </mesh>
                    ))}
                </>
            )}
            
            {type === 'bar' && normalizedData.map((point, i) => (
                <group key={i} position={[point.x, 0, point.z]}>
                    <mesh position={[0, point.y / 2, 0]}>
                        <boxGeometry args={[width / data.length * 0.8, point.y, 0.1]} />
                        <meshStandardMaterial
                            color={color}
                            emissive={color}
                            emissiveIntensity={0.3}
                            transparent
                            opacity={0.8}
                        />
                    </mesh>
                    {point.label && (
                        <Text
                            position={[0, point.y + 0.2, 0]}
                            fontSize={0.1}
                            color={color}
                            anchorX="center"
                            anchorY="middle"
                        >
                            {point.label}
                        </Text>
                    )}
                </group>
            ))}
            
            {type === 'scatter' && normalizedData.map((point, i) => (
                <mesh key={i} position={[point.x, point.y, point.z]}>
                    <sphereGeometry args={[0.08, 16, 16]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={0.6}
                    />
                </mesh>
            ))}
            
            {/* Holographic effect - glowing lines */}
            <mesh position={[0, height / 2, 0]}>
                <planeGeometry args={[width, 0.01]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.2}
                    transparent
                    opacity={0.3}
                />
            </mesh>
        </group>
    );
}

