/**
 * Zkredit - Agent Status Orb
 * 3D pulsing sphere with dynamic blue circles showing AI agent status in real-time
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Ring } from '@react-three/drei';
import * as THREE from 'three';

interface AgentStatusOrbProps {
    status: 'profiting' | 'negotiating' | 'idle' | 'error';
}

const STATUS_COLORS = {
    profiting: '#00FF88',    // Profit green
    negotiating: '#FFA500',  // Amber
    idle: '#0080FF',         // Electric blue
    error: '#FF3366',        // Loss red
};

// Orbiting ring component
function OrbitingRing({ radius, speed, color, delay = 0 }: { radius: number; speed: number; color: string; delay?: number }) {
    const ringRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame((state) => {
        if (!ringRef.current || !materialRef.current) return;

        const time = state.clock.elapsedTime + delay;
        
        // Orbital motion in 3D space
        const angle = time * speed;
        ringRef.current.position.x = Math.cos(angle) * radius;
        ringRef.current.position.y = Math.sin(angle * 0.7) * radius;
        ringRef.current.position.z = Math.sin(angle * 0.5) * radius * 0.5;

        // Rotation
        ringRef.current.rotation.x += 0.01;
        ringRef.current.rotation.z += 0.015;

        // Pulsing opacity
        const pulse = Math.sin(time * 3) * 0.3 + 0.7;
        materialRef.current.opacity = pulse * 0.6;
    });

    return (
        <Ring ref={ringRef} args={[0.8, 1.0, 32]}>
            <meshStandardMaterial
                ref={materialRef}
                color={color}
                emissive={color}
                emissiveIntensity={2}
                transparent
                opacity={0.6}
                side={THREE.DoubleSide}
            />
        </Ring>
    );
}

// Particle ring component
function ParticleRing({ radius, particleCount, color, speed }: { radius: number; particleCount: number; color: string; speed: number }) {
    const particlesRef = useRef<THREE.InstancedMesh>(null);
    const tempObject = new THREE.Object3D();

    useFrame((state) => {
        if (!particlesRef.current) return;

        const time = state.clock.elapsedTime;

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + time * speed;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const z = Math.sin(angle * 2) * radius * 0.3;

            tempObject.position.set(x, y, z);
            tempObject.rotation.set(angle, angle * 0.5, 0);
            tempObject.scale.setScalar(0.1 + Math.sin(time * 2 + i) * 0.05);
            tempObject.updateMatrix();

            particlesRef.current.setMatrixAt(i, tempObject.matrix);
        }

        particlesRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={particlesRef} args={[undefined, undefined, particleCount]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={3}
            />
        </instancedMesh>
    );
}

export function AgentStatusOrb({ status }: AgentStatusOrbProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const innerRingRef = useRef<THREE.Mesh>(null);
    const outerRingRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!meshRef.current || !glowRef.current) return;

        const time = state.clock.elapsedTime;

        // Enhanced pulsing animation with multiple frequencies
        const pulse = Math.sin(time * 2.5) * 0.15 + 1;
        const fastPulse = Math.sin(time * 4) * 0.05 + 1;
        meshRef.current.scale.setScalar(pulse * fastPulse);
        glowRef.current.scale.setScalar(pulse * 1.3);

        // Multi-axis rotation for dynamic movement
        meshRef.current.rotation.x += 0.005;
        meshRef.current.rotation.y += 0.01;
        meshRef.current.rotation.z += 0.003;

        // Intensity pulse for glow
        const glowMaterial = glowRef.current.material as THREE.MeshStandardMaterial;
        glowMaterial.emissiveIntensity = pulse * 1.5;

        // Rotating rings
        if (innerRingRef.current) {
            innerRingRef.current.rotation.x += 0.02;
            innerRingRef.current.rotation.y += 0.015;
            innerRingRef.current.rotation.z += 0.01;
        }
        if (outerRingRef.current) {
            outerRingRef.current.rotation.x -= 0.015;
            outerRingRef.current.rotation.y -= 0.02;
            outerRingRef.current.rotation.z -= 0.008;
        }
    });

    const color = STATUS_COLORS[status];
    const blueColor = '#0080FF'; // Always use blue for circles

    return (
        <group>
            {/* Main sphere */}
            <Sphere ref={meshRef} args={[1, 32, 32]}>
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={1.5}
                    metalness={0.8}
                    roughness={0.2}
                />
            </Sphere>

            {/* Glow halo */}
            <Sphere ref={glowRef} args={[1.2, 32, 32]}>
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={1}
                    transparent
                    opacity={0.3}
                />
            </Sphere>

            {/* Rotating inner ring */}
            <Ring ref={innerRingRef} args={[1.3, 1.5, 64]} position={[0, 0, 0]}>
                <meshStandardMaterial
                    color={blueColor}
                    emissive={blueColor}
                    emissiveIntensity={2}
                    transparent
                    opacity={0.7}
                    side={THREE.DoubleSide}
                />
            </Ring>

            {/* Rotating outer ring */}
            <Ring ref={outerRingRef} args={[1.6, 1.8, 64]} position={[0, 0, 0]}>
                <meshStandardMaterial
                    color={blueColor}
                    emissive={blueColor}
                    emissiveIntensity={1.5}
                    transparent
                    opacity={0.5}
                    side={THREE.DoubleSide}
                />
            </Ring>

            {/* Orbiting blue circles */}
            <OrbitingRing radius={2.2} speed={0.8} color={blueColor} delay={0} />
            <OrbitingRing radius={2.5} speed={-0.6} color={blueColor} delay={1} />
            <OrbitingRing radius={2.8} speed={0.5} color={blueColor} delay={2} />

            {/* Particle ring */}
            <ParticleRing radius={2.0} particleCount={12} color={blueColor} speed={0.4} />

            {/* Point light emanating from orb */}
            <pointLight
                position={[0, 0, 0]}
                color={color}
                intensity={2}
                distance={10}
            />
        </group>
    );
}
