import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { useSnapshot } from 'valtio';
import { useFrame } from '@react-three/fiber';
import { Decal, useGLTF, useTexture, OrbitControls } from '@react-three/drei';
import { easing } from 'maath';
import * as THREE from 'three';
import state from '../store';

// ============================================
// HELPER FUNCTIONS
// ============================================

// Apply border radius to image
// Apply border radius and return a THREE.Texture directly
const applyBorderRadius = (imageSrc, borderRadius) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Clear canvas with transparency
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (borderRadius > 0) {
        // Calculate radius based on percentage of smaller dimension
        const minDim = Math.min(img.width, img.height);
        const radius = (borderRadius / 100) * (minDim / 2);
        
        ctx.beginPath();
        if (borderRadius >= 50) {
          // Full ellipse/circle
          ctx.ellipse(img.width / 2, img.height / 2, img.width / 2, img.height / 2, 0, 0, Math.PI * 2);
        } else {
          // Rounded rectangle
          const x = 0, y = 0, w = img.width, h = img.height;
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + w - radius, y);
          ctx.arcTo(x + w, y, x + w, y + radius, radius);
          ctx.lineTo(x + w, y + h - radius);
          ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
          ctx.lineTo(x + radius, y + h);
          ctx.arcTo(x, y + h, x, y + h - radius, radius);
          ctx.lineTo(x, y + radius);
          ctx.arcTo(x, y, x + radius, y, radius);
        }
        ctx.closePath();
        ctx.clip();
      }
      
      ctx.drawImage(img, 0, 0);
      
      // Create THREE.Texture directly from canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.flipY = true;
      texture.needsUpdate = true;
      resolve(texture);
    };
    img.onerror = () => {
      // Fallback: create texture from original image
      const texture = new THREE.TextureLoader().load(imageSrc);
      resolve(texture);
    };
    img.src = imageSrc;
  });
};

// Create text texture
const createTextTexture = (text, font, size, color) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 512;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${size || 48}px ${font || 'Arial'}`;
  ctx.fillStyle = color || 'black';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text || '', canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

// ============================================
// LAYER DECAL COMPONENT
// ============================================
const LayerDecal = ({ layer }) => {
  const [texture, setTexture] = useState(null);
  const [textureKey, setTextureKey] = useState(0);
  
  useEffect(() => {
    const loadTexture = async () => {
      const tex = await applyBorderRadius(layer.image, layer.borderRadius);
      setTexture(tex);
      setTextureKey(prev => prev + 1);
    };
    loadTexture();
    
    // Cleanup old texture
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [layer.image, layer.borderRadius]);
  
  if (!layer.visible || !texture) return null;
  
  return (
    <Decal
      key={`${layer.id}-${textureKey}`}
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

// Layer Decal for Hoodie with scale factor
const HoodieLayerDecal = ({ layer, scaleFactor }) => {
  const [texture, setTexture] = useState(null);
  const [textureKey, setTextureKey] = useState(0);
  
  useEffect(() => {
    const loadTexture = async () => {
      const tex = await applyBorderRadius(layer.image, layer.borderRadius);
      setTexture(tex);
      setTextureKey(prev => prev + 1);
    };
    loadTexture();
    
    // Cleanup old texture
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [layer.image, layer.borderRadius]);
  
  if (!layer.visible || !texture) return null;
  
  const scaledPos = [
    layer.position[0] * scaleFactor,
    layer.position[1] * scaleFactor,
    layer.position[2] * scaleFactor
  ];
  const scaledScale = [
    layer.scale[0] * scaleFactor,
    layer.scale[1] * scaleFactor,
    layer.scale[2] * scaleFactor
  ];
  
  return (
    <Decal
      key={`${layer.id}-${textureKey}`}
      position={scaledPos}
      rotation={layer.rotation}
      scale={scaledScale}
      map={texture}
      map-anisotropy={16}
      depthTest={false}
      depthWrite={true}
    />
  );
};

// ============================================
// T-SHIRT COMPONENT
// ============================================
const TShirt = () => {
  const snap = useSnapshot(state);
  const { nodes, materials } = useGLTF('/shirt.glb');
  const meshRef = useRef();
  
  // Load textures
  const logoTexture = useTexture(snap.frontLogoDecal);
  const backLogoTexture = useTexture(snap.backLogoDecal);
  const fullTexture = useTexture(snap.fullDecal);
  
  // Animate color
  useFrame((state, delta) => {
    if (meshRef.current) {
      easing.dampC(meshRef.current.material.color, snap.color, 0.25, delta);
    }
  });

  return (
    <group scale={11}>
      <mesh
        ref={meshRef}
        castShadow
        geometry={nodes.T_Shirt_male.geometry}
        material={materials.lambert1}
        material-roughness={1}
        dispose={null}
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

        {/* Layers - render in reverse order so first layer (top in UI) appears on top in 3D */}
        {[...snap.layers].filter(l => l.visible).reverse().map((layer) => (
          <LayerDecal key={layer.id} layer={layer} />
        ))}

        {/* Front Logo */}
        {snap.isFrontLogoTexture && (
          <Decal
            position={snap.frontLogoPosition}
            rotation={snap.frontLogoRotation}
            scale={snap.frontLogoScale}
            map={logoTexture}
          />
        )}

        {/* Back Logo */}
        {snap.isBackLogoTexture && (
          <Decal
            position={snap.backLogoPosition}
            rotation={snap.backLogoRotation}
            scale={snap.backLogoScale}
            map={backLogoTexture}
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
    </group>
  );
};

// ============================================
// HOODIE COMPONENT
// ============================================
const Hoodie = () => {
  const snap = useSnapshot(state);
  const { scene } = useGLTF('/urban_streetwear_hoodie__3d_clothing.glb');
  const meshRefs = useRef([]);
  
  // Load textures
  const logoTexture = useTexture(snap.frontLogoDecal);
  const backLogoTexture = useTexture(snap.backLogoDecal);
  const fullTexture = useTexture(snap.fullDecal);
  
  // Extract mesh data from scene - ONLY ONCE
  const { meshDataList, centerOffset } = useMemo(() => {
    const meshes = [];
    
    // Calculate bounding box first for centering
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    
    scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const geometry = child.geometry.clone();
        child.updateWorldMatrix(true, false);
        
        // Apply world matrix to geometry vertices
        geometry.applyMatrix4(child.matrixWorld);
        
        // Center geometry at origin
        geometry.translate(-center.x, -center.y, -center.z);
        
        meshes.push({
          name: child.name,
          geometry,
          vertexCount: geometry.attributes.position?.count || 0
        });
      }
    });
    
    meshes.sort((a, b) => b.vertexCount - a.vertexCount);
    
    console.log('Hoodie meshes:', meshes.map(m => `${m.name} (${m.vertexCount} verts)`));
    
    // Update store with mesh parts info for UI
    state.hoodieMeshParts = meshes.map((m, index) => ({
      id: index,
      name: m.name || `Mesh ${index + 1}`,
      vertexCount: m.vertexCount
    }));
    
    return { meshDataList: meshes, centerOffset: center };
  }, [scene]);
  
  // Create materials for each mesh
  const [materials, setMaterials] = useState([]);
  
  useEffect(() => {
    const mats = meshDataList.map(() => {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(snap.color),
        roughness: 0.85,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
    });
    setMaterials(mats);
    
    return () => mats.forEach(m => m.dispose());
  }, [meshDataList.length]);
  
  // Animate color for all meshes
  useFrame((_, delta) => {
    materials.forEach((mat) => {
      if (mat?.color) {
        easing.dampC(mat.color, snap.color, 0.25, delta);
      }
    });
  });

  // Render decals function - with adjusted positions for Hoodie
  // Hoodie is ~2x bigger than T-shirt, so we need to scale decal positions/sizes
  const HOODIE_SCALE_FACTOR = 500; // Adjust decal scale for hoodie size
  
  const scalePosition = (pos) => [pos[0] * HOODIE_SCALE_FACTOR, pos[1] * HOODIE_SCALE_FACTOR, pos[2] * HOODIE_SCALE_FACTOR];
  const scaleValue = (val) => [val[0] * HOODIE_SCALE_FACTOR, val[1] * HOODIE_SCALE_FACTOR, val[2] * HOODIE_SCALE_FACTOR];
  
  // Render decals for a specific mesh index
  const renderDecalsForMesh = (meshIndex) => {
    // Filter layers that target this mesh - reverse order so first layer (top in UI) appears on top
    const layersForMesh = [...snap.layers].filter(l => 
      l.visible && (l.targetMeshIndices || [0]).includes(meshIndex)
    ).reverse();
    
    // Check if global decals should render on this mesh
    const shouldRenderGlobal = snap.selectedMeshIndices.includes(meshIndex);
    
    return (
      <>
        {shouldRenderGlobal && snap.isFullTexture && (
          <Decal
            position={scalePosition(snap.fullTexturePosition)}
            rotation={snap.fullTextureRotation}
            scale={scaleValue(snap.fullTextureScale)}
            map={fullTexture}
          />
        )}

        {layersForMesh.map((layer) => (
          <HoodieLayerDecal 
            key={layer.id} 
            layer={layer} 
            scaleFactor={HOODIE_SCALE_FACTOR}
          />
        ))}

        {shouldRenderGlobal && snap.isFrontLogoTexture && (
          <Decal
            position={scalePosition(snap.frontLogoPosition)}
            rotation={snap.frontLogoRotation}
            scale={scaleValue(snap.frontLogoScale)}
            map={logoTexture}
          />
        )}

        {shouldRenderGlobal && snap.isBackLogoTexture && (
          <Decal
            position={scalePosition(snap.backLogoPosition)}
            rotation={snap.backLogoRotation}
            scale={scaleValue(snap.backLogoScale)}
            map={backLogoTexture}
          />
        )}

        {shouldRenderGlobal && snap.isFrontText && (
          <Decal
            position={scalePosition(snap.frontTextPosition)}
            rotation={snap.frontTextRotation}
            scale={scaleValue(snap.frontTextScale)}
            map={createTextTexture(snap.frontText, snap.frontTextFont, snap.frontTextSize, snap.frontTextColor)}
          />
        )}

        {shouldRenderGlobal && snap.isBackText && (
          <Decal
            position={scalePosition(snap.backTextPosition)}
            rotation={snap.backTextRotation}
            scale={scaleValue(snap.backTextScale)}
            map={createTextTexture(snap.backText, snap.backTextFont, snap.backTextSize, snap.backTextColor)}
          />
        )}
      </>
    );
  };

  if (materials.length === 0) return null;

  return (
    <group scale={1.8}>
      {meshDataList.map((meshData, index) => {
        return (
          <mesh
            key={meshData.name}
            ref={(el) => (meshRefs.current[index] = el)}
            geometry={meshData.geometry}
            material={materials[index]}
            castShadow
          >
            {renderDecalsForMesh(index)}
          </mesh>
        );
      })}
    </group>
  );
};

// ============================================
// MAIN SHIRT COMPONENT
// ============================================
const Shirt = () => {
  const snap = useSnapshot(state);
  
  return (
    <>
      <OrbitControls />
      <Suspense fallback={null}>
        {snap.selectedClothing === 'tshirt' && <TShirt />}
        {snap.selectedClothing === 'hoodie' && <Hoodie />}
      </Suspense>
    </>
  );
};

// Preload models
useGLTF.preload('/shirt.glb');
useGLTF.preload('/urban_streetwear_hoodie__3d_clothing.glb');

export default Shirt;
