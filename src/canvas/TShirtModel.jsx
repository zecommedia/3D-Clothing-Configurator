import React, { useEffect, useState } from 'react'
import * as THREE from 'three';
import { easing } from 'maath';
import { useFrame } from '@react-three/fiber';
import { Decal, useGLTF, useTexture } from '@react-three/drei';

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
      
      const radiusX = (borderRadius / 100) * (img.width / 2);
      const radiusY = (borderRadius / 100) * (img.height / 2);
      
      ctx.beginPath();
      
      if (borderRadius >= 50) {
        ctx.ellipse(img.width / 2, img.height / 2, img.width / 2, img.height / 2, 0, 0, Math.PI * 2);
      } else {
        const rx = Math.min(radiusX, img.width / 2);
        const ry = Math.min(radiusY, img.height / 2);
        
        ctx.moveTo(rx, 0);
        ctx.lineTo(img.width - rx, 0);
        ctx.ellipse(img.width - rx, ry, rx, ry, 0, -Math.PI/2, 0);
        ctx.lineTo(img.width, img.height - ry);
        ctx.ellipse(img.width - rx, img.height - ry, rx, ry, 0, 0, Math.PI/2);
        ctx.lineTo(rx, img.height);
        ctx.ellipse(rx, img.height - ry, rx, ry, 0, Math.PI/2, Math.PI);
        ctx.lineTo(0, ry);
        ctx.ellipse(rx, ry, rx, ry, 0, Math.PI, Math.PI * 1.5);
      }
      
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, 0, 0);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

// Layer Decal Component
const LayerDecal = ({ layer }) => {
  const [processedImage, setProcessedImage] = useState(layer.image);
  
  useEffect(() => {
    applyBorderRadius(layer.image, layer.borderRadius || 0)
      .then(setProcessedImage);
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
      castShadow
      geometry={nodes.T_Shirt_male.geometry}
      material={materials.lambert1}
      material-roughness={1}
      dispose={null}
      scale={11}
    >
      {/* Full Texture */}
      {snap.isFullTexture && (
        <Decal
          position={snap.fullTexturePosition}
          rotation={snap.fullTextureRotation}
          scale={snap.fullTextureScale}
          map={fullTexture}
        />
      )}

      {/* Multi-layer system */}
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
      
      {/* Front Text */}
      {snap.isFrontText && (
        <Decal
          position={snap.frontTextPosition}
          rotation={snap.frontTextRotation}
          scale={snap.frontTextScale}
          map={createTextTexture(snap.frontText, snap.frontTextFont, snap.frontTextSize, snap.frontTextColor)}
        />
      )}

      {/* Back Logo */}
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
      
      {/* Back Text */}
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

// Preload model
useGLTF.preload('/shirt.glb');

export default TShirtModel;
