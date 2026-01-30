import React, { useMemo, Suspense, useEffect, useState, useRef } from 'react'
import * as THREE from 'three';
import { easing } from 'maath';
import { useSnapshot } from 'valtio';
import { useFrame } from '@react-three/fiber';
import { Decal, useGLTF, useTexture, OrbitControls } from '@react-three/drei';

import state, { clothingModels } from '../store';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

// ============================================================================
// LAYER DECAL COMPONENT
// ============================================================================

const LayerDecal = ({ layer, parentMesh }) => {
  const [processedImage, setProcessedImage] = useState(layer.image);
  
  useEffect(() => {
    applyBorderRadius(layer.image, layer.borderRadius || 0)
      .then(setProcessedImage);
  }, [layer.image, layer.borderRadius]);
  
  const texture = useTexture(processedImage);
  
  // Debug log
  useEffect(() => {
    console.log('LayerDecal rendering:', layer.name, 'position:', layer.position, 'scale:', layer.scale, 'visible:', layer.visible, 'parentMesh:', !!parentMesh?.current);
  }, [layer, parentMesh]);
  
  if (!layer.visible || !parentMesh?.current) return null;
  
  return (
    <Decal
      mesh={parentMesh}
      position={layer.position}
      rotation={layer.rotation}
      scale={layer.scale}
      map={texture}
      map-anisotropy={16}
      depthTest={false}
      depthWrite={true}
      polygonOffsetFactor={-10}
      transparent={true}
    />
  );
};

// ============================================================================
// UNIVERSAL GLB MODEL COMPONENT
// ============================================================================

// This component can load ANY GLB model and apply:
// - Color changes
// - Decals (logos, layers, text)
// - Proper centering and scaling
const UniversalGLBModel = ({ 
  modelPath, 
  snap, 
  logoTexture, 
  fullTexture, 
  backLogoTexture, 
  createTextTexture,
  // Optional overrides for specific models
  customScale = null,
  customPosition = null,
  skipCenter = false,
}) => {
  const { scene } = useGLTF(modelPath);
  const [modelData, setModelData] = useState({ ready: false, mainMesh: null });
  const groupRef = useRef();
  const mainMeshRef = useRef();
  
  // Process the model: clone, fix materials, center, find main mesh
  const processedModel = useMemo(() => {
    const clone = scene.clone(true);
    
    // Calculate bounding box for centering
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Calculate auto scale to fit nicely in view
    const maxDim = Math.max(size.x, size.y, size.z);
    const autoScale = maxDim > 0 ? 1.5 / maxDim : 1;
    
    let mainMesh = null;
    let maxVertices = 0;
    
    clone.traverse((child) => {
      if (child.isMesh) {
        // Replace material with MeshStandardMaterial for color support
        if (child.material) {
          const newMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x888888),
            roughness: 0.85,
            metalness: 0.05,
            side: THREE.DoubleSide,
          });
          child.material = newMat;
        }
        
        // Find mesh with most vertices (main body for decals)
        if (child.geometry?.attributes?.position) {
          const vertexCount = child.geometry.attributes.position.count;
          if (vertexCount > maxVertices) {
            maxVertices = vertexCount;
            mainMesh = child;
          }
        }
      }
    });
    
    // Center the model (unless skipCenter is true)
    if (!skipCenter) {
      clone.position.sub(center);
    }
    
    return { 
      clone, 
      mainMesh, 
      autoScale,
      center,
      size
    };
  }, [scene, skipCenter]);

  useEffect(() => {
    if (processedModel.mainMesh) {
      // Debug log
      console.log('=== MODEL DEBUG ===');
      console.log('MainMesh found:', processedModel.mainMesh.name);
      console.log('Geometry vertices:', processedModel.mainMesh.geometry?.attributes?.position?.count);
      console.log('Geometry has normals:', !!processedModel.mainMesh.geometry?.attributes?.normal);
      console.log('Geometry has uvs:', !!processedModel.mainMesh.geometry?.attributes?.uv);
      console.log('MainMesh position:', processedModel.mainMesh.position);
      console.log('MainMesh rotation:', processedModel.mainMesh.rotation);
      console.log('MainMesh scale:', processedModel.mainMesh.scale);
      console.log('MainMesh parent:', processedModel.mainMesh.parent?.name);
      console.log('Clone position:', processedModel.clone.position);
      console.log('Center offset:', processedModel.center);
      console.log('Model size:', processedModel.size);
      console.log('skipCenter:', skipCenter);
      console.log('===================');
      
      // Store reference to mainMesh for decal rendering
      mainMeshRef.current = processedModel.mainMesh;
      
      setModelData({ 
        ready: true, 
        mainMesh: processedModel.mainMesh,
        center: processedModel.center,
        size: processedModel.size
      });
    }
  }, [processedModel, skipCenter]);

  // Animate color changes
  useFrame((_, delta) => {
    processedModel.clone.traverse((child) => {
      if (child.isMesh && child.material?.color) {
        easing.dampC(child.material.color, snap.color, 0.25, delta);
      }
    });
  });

  const finalScale = customScale || processedModel.autoScale;
  const finalPosition = customPosition || [0, 0, 0];

  return (
    <group ref={groupRef} scale={finalScale} position={finalPosition}>
      <primitive object={processedModel.clone} />
      
      {/* Decals - render using mesh prop pointing to mainMesh */}
      {modelData.ready && mainMeshRef.current && (
        <>
          {/* Full Texture */}
          {snap.isFullTexture && (
            <Decal
              mesh={mainMeshRef}
              position={snap.fullTexturePosition}
              rotation={snap.fullTextureRotation}
              scale={snap.fullTextureScale}
              map={fullTexture}
              depthTest={false}
              depthWrite={true}
            />
          )}

          {/* Multi-layer system - Custom uploaded images */}
          {snap.layers.map((layer) => (
            <LayerDecal key={layer.id} layer={layer} parentMesh={mainMeshRef} />
          ))}

          {/* Front Logo */}
          {snap.isFrontLogoTexture && (
            <Decal
              mesh={mainMeshRef}
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
              mesh={mainMeshRef}
              position={snap.frontTextPosition}
              rotation={snap.frontTextRotation}
              scale={snap.frontTextScale}
              map={createTextTexture(snap.frontText, snap.frontTextFont, snap.frontTextSize, snap.frontTextColor)}
            />
          )}

          {/* Back Logo */}
          {snap.isBackLogoTexture && (
            <Decal
              mesh={mainMeshRef}
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
              mesh={mainMeshRef}
              position={snap.backTextPosition}
              rotation={snap.backTextRotation}
              scale={snap.backTextScale}
              map={createTextTexture(snap.backText, snap.backTextFont, snap.backTextSize, snap.backTextColor)}
            />
          )}
        </>
      )}
    </group>
  );
};

// ============================================================================
// MODEL CONFIGURATIONS
// ============================================================================

// Model-specific configurations (optional overrides)
// If not specified, auto-scale and auto-center will be used
const MODEL_CONFIGS = {
  'tshirt': {
    scale: 11,
    position: [0, 0, 0],
    // Don't center T-shirt - it's already centered in the GLB
    skipCenter: true,
  },
  'hoodie': {
    scale: 2.5,
    position: [0, 0, 0],
    skipCenter: false, // Hoodie needs centering
  },
  // Add more models here - they will work automatically!
  // Just add the GLB file to /public and add to clothingModels in store
  // 'jacket': { scale: 2, position: [0, 0, 0] },
  // 'pants': { scale: 1.5, position: [0, -0.5, 0] },
};

// ============================================================================
// MAIN SHIRT COMPONENT
// ============================================================================

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
    canvas.width = textWidth || 100;
    canvas.height = size || 64;
    ctx.fillStyle = color;
    ctx.font = `${size}px ${font}`;
    ctx.fillText(text, 0, size);
    return new THREE.CanvasTexture(canvas);
  };

  // Find current model config
  const currentModel = clothingModels.find(m => m.id === snap.selectedClothing);
  const modelConfig = MODEL_CONFIGS[snap.selectedClothing] || {};

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
          {currentModel && (
            <UniversalGLBModel 
              modelPath={currentModel.file}
              customScale={modelConfig.scale}
              customPosition={modelConfig.position}
              skipCenter={modelConfig.skipCenter || false}
              {...sharedProps} 
            />
          )}
        </Suspense>
      </group>
    </>
  );
};

// Preload all models
clothingModels.forEach(model => {
  useGLTF.preload(model.file);
});

export default Shirt;
