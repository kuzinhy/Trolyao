import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';

// We use a procedural avatar to avoid 404 errors from external URLs expiring.
// In a production app, this would load the user's generated .glb file.
function ProceduralAvatar() {
  const { isThinking, isListening, isSpeaking } = useStore();
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current || !headRef.current) return;
    const t = state.clock.getElapsedTime();
    
    // 1. Organic Idle Breathing & Swaying
    // Base position is -1 on Y axis
    groupRef.current.position.y = -1 + Math.sin(t * 1.5) * 0.03 + Math.sin(t * 0.8) * 0.01;
    groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.015;
    groupRef.current.rotation.x = Math.sin(t * 0.7) * 0.01;

    // Chest expansion (breathing)
    if (bodyRef.current) {
      bodyRef.current.scale.x = 1 + Math.sin(t * 1.5) * 0.015;
      bodyRef.current.scale.z = 1 + Math.sin(t * 1.5) * 0.025;
    }
    
    // 2. Head movement
    if (isListening) {
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, Math.sin(t * 5) * 0.1, 0.1);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0.1, 0.1);
    } else if (isThinking) {
      headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, Math.sin(t * 3) * 0.1, 0.1);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -0.1, 0.1);
    } else {
      // Natural looking around (combination of sine waves for organic feel)
      const targetRotY = Math.sin(t * 0.4) * 0.1 + Math.sin(t * 0.15) * 0.05;
      const targetRotX = Math.sin(t * 0.6) * 0.05;
      const targetRotZ = Math.sin(t * 0.3) * 0.02;
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetRotY, 0.05);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetRotX, 0.05);
      headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, targetRotZ, 0.05);
    }

    // 3. Blinking
    if (leftEyeRef.current && rightEyeRef.current) {
      // Blink every ~4 seconds, duration is short
      const blinkCycle = t % 4;
      const isBlinking = blinkCycle > 3.8 && blinkCycle < 3.9;
      const targetEyeScale = isBlinking ? 0.1 : 1;
      leftEyeRef.current.scale.y = THREE.MathUtils.lerp(leftEyeRef.current.scale.y, targetEyeScale, 0.4);
      rightEyeRef.current.scale.y = THREE.MathUtils.lerp(rightEyeRef.current.scale.y, targetEyeScale, 0.4);
    }
  });

  // Procedural lip-sync animation
  const mouthScaleY = isSpeaking ? 0.1 + (Math.sin(Date.now() / 50) + 1) / 2 * 0.4 : (isThinking ? 0.3 : 0.05);

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 1.2, 32]} />
        <meshStandardMaterial color="#4f46e5" roughness={0.7} />
      </mesh>
      
      {/* Head */}
      <mesh ref={headRef} position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial color="#fca5a5" roughness={0.4} />
        
        {/* Eyes */}
        <mesh ref={leftEyeRef} position={[-0.15, 0.1, 0.4]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <mesh ref={rightEyeRef} position={[0.15, 0.1, 0.4]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        
        {/* Mouth */}
        <mesh position={[0, -0.15, 0.42]} scale={[1, mouthScaleY, 1]}>
          <boxGeometry args={[0.2, 0.2, 0.05]} />
          <meshStandardMaterial color="#991b1b" />
        </mesh>
      </mesh>
    </group>
  );
}

export function Avatar() {
  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0.2, 2.5], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <spotLight position={[2, 5, 2]} angle={0.5} penumbra={1} intensity={2} castShadow color="#a5b4fc" />
        <pointLight position={[-2, 0, -2]} intensity={1} color="#4f46e5" />
        <pointLight position={[2, 0, -2]} intensity={1} color="#fca5a5" />
        <directionalLight position={[0, 2, 5]} intensity={0.5} color="#ffffff" />
        
        <ProceduralAvatar />
        
        <Environment preset="city" />
        <ContactShadows position={[0, -1.4, 0]} opacity={0.5} scale={5} blur={2} far={4} />
        <OrbitControls 
          enableZoom={true} 
          enablePan={false}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 1.8}
          minDistance={1.5}
          maxDistance={4}
          target={[0, 0.5, 0]}
        />
      </Canvas>
    </div>
  );
}
