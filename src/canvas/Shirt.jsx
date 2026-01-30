import React, { useMemo, Suspense, useEffect, useState } from 'react'
import * as THREE from 'three';
import { easing } from 'maath';
import { useSnapshot } from 'valtio';
import { useFrame } from '@react-three/fiber';
import { Decal, useGLTF, useTexture, OrbitControls } from '@react-three/drei';

import state, { clothingModels } from '../store';

// Helper function to apply border radius to an image
const applyBorderRadius = (imageSrc, borderRadius) => {
  return new Promise((resolve) => {
    if (borderRadius === 0) {
      resolve(imageSrc);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Calculate radius based on percentage of smallest dimension
      const minDimension = Math.min(img.width, img.height);
      const radius = (borderRadius / 100) * (minDimension / 2);
      
      // Draw rounded rectangle path
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(img.width - radius, 0);
      ctx.quadraticCurveTo(img.width, 0, img.width, radius);
      ctx.lineTo(img.width, img.height - radius);
      ctx.quadraticCurveTo(img.width, img.height, img.width - radius, img.height);
      ctx.lineTo(radius, img.height);
      ctx.quadraticCurveTo(0, img.height, 0, img.height - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.clip();
      
      // Draw the image
      ctx.drawImage(img, 0, 0);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

// Component to render a single layer with its own texture and border radius
const LayerDecal = ({ layer }) => {
  const [processedImage, setProcessedImage] = useState(layer.image);
  
  // Apply border radius when layer changes
  useEffect(() => {
    applyBorderRadius(layer.image, layer.borderRadius || 0).then(setProcessedImage);
  }, [layer.image, layer.borderRadius]);
  
  const texture = useTexture(processedImage);
  
  if (!layer.visible) return null;
  
  return (
    <Decal
      position={layer.position}
      rotation={layer.rotation}
      scale={layer.scale}
      map={texture}
      map-anisotropy={16}
      depthTest={false}
      depthWrite={true}
      transparent={true}
      opacity={layer.opacity}
    />
  );
};

// T-Shirt Model Component
const TShirtModel = ({ snap, logoTexture, fullTexture, backLogoTexture, createTextTexture }) => {
  const { nodes, materials } = useGLTF('/shirt.glb');
  
  useFrame((state, delta) => {
    if (materials.lambert1) {
      easing.dampC(materials.lambert1.color, snap.color, 0.25, delta);
    }
  });

  return (
    <mesh
      geometry={nodes.T_Shirt_male.geometry}
      material={materials.lambert1}
      material-metalness={0.1}
      dispose={null}
    >
      {/* Full Texture with controls */}
      {snap.isFullTexture && (
        <Decal
          position={snap.fullTexturePosition}
          rotation={snap.fullTextureRotation}
          scale={snap.fullTextureScale}
          map={fullTexture}
          depthTest={false}
          depthWrite={true}
        />
      )}

      {/* Multi-layer system - render all visible layers */}
      {snap.layers.map((layer) => (
        <LayerDecal key={layer.id} layer={layer} />
      ))}

      {/* Front Logo */}
      {snap.isFrontLogoTexture && (
        <Decal
          position={snap.frontLogoPosition}
          rotation={snap.frontLogoRotation}
          scale={snap.frontLogoScale}
          map={logoTexture}
          map-anisotropy={16}
          depthTest={false}
          depthWrite={true}
        />
      )}
      
      {snap.isFrontText && (
        <Decal
          position={snap.frontTextPosition}
          rotation={snap.frontTextRotation}
          scale={snap.frontTextScale}
          map={createTextTexture(snap.frontText, snap.frontTextFont, snap.frontTextSize, snap.frontTextColor)}
        />
      )}

      {snap.isBackLogoTexture && (
        <Decal
          position={snap.backLogoPosition}
          rotation={snap.backLogoRotation}
          scale={snap.backLogoScale}
          map={backLogoTexture}
          map-anisotropy={16}
          depthTest={false}
          depthWrite={true}
        />
      )}
      
      {snap.isBackText && (
        <Decal
          position={snap.backTextPosition}
          rotation={snap.backTextRotation}
          scale={snap.backTextScale}
          map={createTextTexture(snap.backText, snap.backTextFont, snap.backTextSize, snap.backTextColor)}
        />
      )}
    </mesh>
  );
};

// Hoodie Model Component
const HoodieModel = ({ snap }) => {
  const { scene } = useGLTF('/urban_streetwear_hoodie__3d_clothing.glb');
  
  // Clone scene to avoid modifying the cached original
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    
    // Find and store materials for color changing
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        // Clone material so we can modify it
        child.material = child.material.clone();
      }
    });
    
    return clone;
  }, [scene]);

  // Update color on all meshes
  useFrame((state, delta) => {
    clonedScene.traverse((child) => {
      if (child.isMesh && child.material && child.material.color) {
        easing.dampC(child.material.color, snap.color, 0.25, delta);
      }
    });
  });

  return (
    <group scale={1.5} position={[0, -0.3, 0]}>
      <primitive object={clonedScene} />
    </group>
  );
};

const Shirt = () => {
  const snap = useSnapshot(state);

  const logoTexture = useTexture(snap.frontLogoDecal);
  const fullTexture = useTexture(snap.fullDecal);
  const backLogoTexture = useTexture(snap.backLogoDecal);

  const stateString = JSON.stringify(snap);

  const createTextTexture = (text, font, size, color) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${size}px ${font}`;
    const textWidth = ctx.measureText(text).width;
    canvas.width = textWidth;
    canvas.height = size;
    ctx.fillStyle = color;
    ctx.font = `${size}px ${font}`;
    ctx.fillText(text, 0, size);
    return new THREE.CanvasTexture(canvas);
  };

  const sharedProps = {
    snap,
    logoTexture,
    fullTexture,
    backLogoTexture,
    createTextTexture,
  };

  return (
    <>
      <OrbitControls />
      <group key={stateString}>
        <Suspense fallback={null}>
          {snap.selectedClothing === 'tshirt' && <TShirtModel {...sharedProps} />}
          {snap.selectedClothing === 'hoodie' && <HoodieModel {...sharedProps} />}
        </Suspense>
      </group>
    </>
  );
};

// Preload models
useGLTF.preload('/shirt.glb');
useGLTF.preload('/urban_streetwear_hoodie__3d_clothing.glb');

export default Shirt;
