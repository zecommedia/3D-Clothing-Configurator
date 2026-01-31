import React, { useMemo, useEffect, useState } from 'react'
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

// Hoodie Model Component
const HoodieModel = ({ snap, logoTexture, fullTexture, backLogoTexture, createTextTexture }) => {
  const { scene } = useGLTF('/urban_streetwear_hoodie__3d_clothing.glb');
  
  console.log('HoodieModel: scene loaded', scene);
  
  // Process the model once - extract geometry and create material
  const processedData = useMemo(() => {
    console.log('HoodieModel: processing scene...');
    
    // Calculate bounding box for centering
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    
    let mainMesh = null;
    let maxVertices = 0;
    
    // Find the main mesh (most vertices)
    scene.traverse((child) => {
      if (child.isMesh && child.geometry?.attributes?.position) {
        const vertexCount = child.geometry.attributes.position.count;
        console.log('HoodieModel: found mesh', child.name, 'vertices:', vertexCount);
        if (vertexCount > maxVertices) {
          maxVertices = vertexCount;
          mainMesh = child;
        }
      }
    });
    
    if (!mainMesh) {
      console.error('HoodieModel: No mesh found!');
      return null;
    }
    
    console.log('HoodieModel: using main mesh', mainMesh.name, 'with', maxVertices, 'vertices');
    console.log('HoodieModel: center =', center);
    
    // Update world matrix first
    scene.updateMatrixWorld(true);
    
    // Clone the geometry and apply world transform
    const geometry = mainMesh.geometry.clone();
    geometry.applyMatrix4(mainMesh.matrixWorld);
    
    // Now compute new bounding box after transform
    geometry.computeBoundingBox();
    const geomBox = geometry.boundingBox;
    const geomCenter = geomBox.getCenter(new THREE.Vector3());
    
    // Translate to center
    geometry.translate(-geomCenter.x, -geomCenter.y, -geomCenter.z);
    
    // Calculate auto scale based on geometry bounding box
    const geomSize = geomBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(geomSize.x, geomSize.y, geomSize.z);
    const autoScale = maxDim > 0 ? 1.5 / maxDim : 1;
    
    console.log('HoodieModel: geomCenter =', geomCenter, 'geomSize =', geomSize, 'autoScale =', autoScale);
    
    // Create material for color support
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x888888),
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    
    console.log('HoodieModel: processedData ready');
    return { geometry, material, center, autoScale };
  }, [scene]);
  
  // Animate color - update material directly
  useFrame((_, delta) => {
    if (processedData?.material) {
      easing.dampC(processedData.material.color, snap.color, 0.25, delta);
    }
  });

  console.log('HoodieModel render: processedData =', processedData);

  if (!processedData) {
    console.error('HoodieModel: processedData is null, returning null');
    return null;
  }

  console.log('HoodieModel: rendering mesh with scale', processedData.autoScale);

  return (
    <mesh
      geometry={processedData.geometry}
      material={processedData.material}
      scale={processedData.autoScale}
    >
      {/* Full Texture */}
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
useGLTF.preload('/urban_streetwear_hoodie__3d_clothing.glb');

export default HoodieModel;
