/**
 * Zkredit - HeroCube Component
 * The rotating holographic cube for the Login Portal
 * Kasane-Cosmos Aesthetic
 */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, MeshTransmissionMaterial, Environment } from '@react-three/drei';
import { useTheme } from 'next-themes';
import * as THREE from 'three';

interface HeroCubeProps {
    onConnect?: () => void;
    isAnimating?: boolean;
}

export function HeroCube({ onConnect, isAnimating = false }: HeroCubeProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const { theme } = useTheme();
    const { camera } = useThree();

    // Rotation animation
    useFrame((state) => {
        if (!meshRef.current) return;

        // Kasane-style slow rotation
        meshRef.current.rotation.x += 0.002;
        meshRef.current.rotation.y += 0.003;

        // Mouse-reactive tilt
        const mouseX = state.mouse.x * 0.5;
        const mouseY = state.mouse.y * 0.5;
        meshRef.current.rotation.x += mouseY * 0.001;
        meshRef.current.rotation.y += mouseX * 0.001;

        // Camera zoom animation on wallet connect
        if (isAnimating) {
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, 2, 0.05);
            meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, 3, 0.05);
            meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, 3, 0.05);
            meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, 3, 0.05);
        }
    });

    const isDark = theme === 'dark';

    return (
        <group>
            {/* Environment lighting */}
            <Environment preset={isDark ? 'night' : 'dawn'} />

            {/* Ambient light */}
            <ambientLight intensity={isDark ? 0.2 : 0.5} />

            {/* Rim lights for Cyber-Noir effect */}
            {isDark && (
                <>
                    <pointLight position={[5, 5, 5]} color="#00F0FF" intensity={2} />
                    <pointLight position={[-5, -5, -5]} color="#B026FF" intensity={1.5} />
                </>
            )}

            {/* Soft lighting for Foggy Future */}
            {!isDark && (
                <>
                    <pointLight position={[3, 3, 3]} color="#A8D8EA" intensity={1} />
                    <pointLight position={[-3, -3, -3]} color="#C7B8EA" intensity={0.8} />
                </>
            )}

            {/* The Hero Cube */}
            <RoundedBox
                ref={meshRef}
                args={[2, 2, 2]}
                radius={0.1}
                smoothness={4}
                onClick={onConnect}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'default'}
            >
                {isDark ? (
                    // Dark Mode: Neon Wireframe Glass
                    <MeshTransmissionMaterial
                        backside
                        samples={6}
                        resolution={512}
                        transmission={0.95}
                        roughness={0.1}
                        thickness={0.5}
                        ior={1.5}
                        chromaticAberration={0.5}
                        anisotropy={0.3}
                        distortion={0.2}
                        distortionScale={0.5}
                        temporalDistortion={0.1}
                        color="#00F0FF"
                        emissive="#0080FF"
                        emissiveIntensity={0.5}
                    />
                ) : (
                    // Light Mode: Ceramic Glass
                    <MeshTransmissionMaterial
                        backside
                        samples={8}
                        resolution={512}
                        transmission={0.9}
                        roughness={0.3}
                        thickness={0.3}
                        ior={1.2}
                        chromaticAberration={0.1}
                        anisotropy={0.1}
                        color="#C7B8EA"
                        emissive="#A8D8EA"
                        emissiveIntensity={0.2}
                    />
                )}
            </RoundedBox>

            {/* Inner glowing core */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshStandardMaterial
                    color={isDark ? "#00F0FF" : "#A8D8EA"}
                    emissive={isDark ? "#00F0FF" : "#A8D8EA"}
                    emissiveIntensity={isDark ? 2 : 1}
                    transparent
                    opacity={0.6}
                />
            </mesh>
        </group>
    );
}
