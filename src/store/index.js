import { proxy } from 'valtio';

// Available clothing models
export const clothingModels = [
  {
    id: 'tshirt',
    name: 'T-Shirt',
    file: '/shirt.glb',
    meshName: 'T_Shirt_male',
    materialName: 'lambert1',
    type: 'glb',
    meshParts: [{ id: 0, name: 'Body' }], // T-shirt only has 1 mesh
  },
  {
    id: 'hoodie',
    name: 'Hoodie',
    file: '/urban_streetwear_hoodie__3d_clothing.glb',
    meshName: null,
    materialName: null,
    type: 'glb',
    meshParts: [], // Will be populated dynamically
  },
];

// Layer template for creating new layers
export const createLayer = (id, image, name = `Layer ${id}`, cropInfo = null, sourceImageId = null) => ({
  id,
  name,
  image,                                    // Base64 or URL of the image
  originalImage: image,                     // Keep original for re-cropping
  sourceImageId: sourceImageId || `src_${Date.now()}`, // Smart Object: links layers to same source
  visible: true,
  opacity: 1,
  // Position - Z = 0.3 to be in front of model surface
  position: [0, 0, 0.3],
  // Rotation (radians)
  rotation: [0, 0, 0],
  // Scale - smaller default for better control
  scale: [0.3, 0.3, 0.3],
  // Border radius (0-50, percentage of smallest dimension)
  borderRadius: 0,
  // Blending
  blendMode: 'normal',                      // normal, multiply, add, etc.
  // Crop information for presets (null = no crop, use original)
  cropInfo: cropInfo,  // { x, y, width, height, unit } - stores crop coordinates
  // Mesh indices for Hoodie (which meshes to apply decal to)
  targetMeshIndices: [0],
});

// Duplicate a layer with same source (for Smart Object)
export const duplicateLayer = (layerId) => {
  const sourceLayer = state.layers.find(l => l.id === layerId);
  if (!sourceLayer) return null;
  
  const newLayer = {
    ...JSON.parse(JSON.stringify(sourceLayer)), // Deep clone
    id: state.nextLayerId,
    name: `${sourceLayer.name} (Copy)`,
  };
  
  state.layers.push(newLayer);
  state.activeLayerId = state.nextLayerId;
  state.nextLayerId += 1;
  
  return newLayer;
};

// Apply crop to image
// NEW format (format='natural'): x/y/width/height are in NATURAL coordinates
// OLD format (no format field): x/y/width/height are in DISPLAY coordinates, need to scale
export const applyCropToImage = (originalImage, cropInfo) => {
  return new Promise((resolve) => {
    if (!cropInfo || !originalImage) {
      resolve(originalImage);
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const origNatWidth = cropInfo.naturalWidth || img.naturalWidth;
      const origNatHeight = cropInfo.naturalHeight || img.naturalHeight;
      
      let cropX, cropY, cropW, cropH;
      
      if (cropInfo.format === 'natural') {
        // NEW FORMAT: coordinates are already in natural pixels
        // Just scale proportionally to new image size
        const scaleX = img.naturalWidth / origNatWidth;
        const scaleY = img.naturalHeight / origNatHeight;
        
        cropX = cropInfo.x * scaleX;
        cropY = cropInfo.y * scaleY;
        cropW = cropInfo.width * scaleX;
        cropH = cropInfo.height * scaleY;
      } else {
        // OLD FORMAT: coordinates are in DISPLAY pixels
        // We need to first convert to natural coords, then scale
        // OLD presets: the crop was done with display coords, then getCroppedImg scaled them
        // So the actual crop region used was (x * scaleX_old, y * scaleY_old, ...)
        // where scaleX_old = naturalWidth / displayWidth
        // But we don't have displayWidth! So we need to estimate.
        
        // WORKAROUND: Assume the crop coordinates are proportional to natural dimensions
        // This works if user uploads image with same aspect ratio
        const scaleX = img.naturalWidth / origNatWidth;
        const scaleY = img.naturalHeight / origNatHeight;
        
        cropX = cropInfo.x * scaleX;
        cropY = cropInfo.y * scaleY;
        cropW = cropInfo.width * scaleX;
        cropH = cropInfo.height * scaleY;
      }
      
      // Ensure we don't exceed image bounds
      const safeX = Math.max(0, Math.min(cropX, img.naturalWidth - 1));
      const safeY = Math.max(0, Math.min(cropY, img.naturalHeight - 1));
      const safeW = Math.min(cropW, img.naturalWidth - safeX);
      const safeH = Math.min(cropH, img.naturalHeight - safeY);
      
      canvas.width = Math.max(1, Math.round(safeW));
      canvas.height = Math.max(1, Math.round(safeH));
      
      ctx.drawImage(img, safeX, safeY, safeW, safeH, 0, 0, canvas.width, canvas.height);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(originalImage);
    img.src = originalImage;
  });
};

// Replace source image for all linked layers (Smart Object behavior)
export const replaceSourceImage = async (sourceImageId, newOriginalImage) => {
  const linkedLayers = state.layers.filter(l => l.sourceImageId === sourceImageId);
  
  for (const layer of linkedLayers) {
    layer.originalImage = newOriginalImage;
    
    // Re-apply crop if exists
    if (layer.cropInfo) {
      layer.image = await applyCropToImage(newOriginalImage, layer.cropInfo);
    } else {
      layer.image = newOriginalImage;
    }
  }
};

// Create a full preset including all layers and settings
export const createPreset = (name, state) => ({
  id: Date.now(),
  name,
  date: new Date().toISOString(),
  version: '2.0', // Preset version for compatibility
  data: {
    // All layers with their settings
    layers: state.layers.map(layer => ({
      ...layer,
      // Store image as base64 (or could be removed to save only settings)
      image: layer.image,
      originalImage: layer.originalImage || layer.image,
    })),
    // Layer count and next ID
    nextLayerId: state.nextLayerId,
    activeLayerId: state.activeLayerId,
    // Full texture settings
    fullTexturePosition: [...state.fullTexturePosition],
    fullTextureRotation: [...state.fullTextureRotation],
    fullTextureScale: [...state.fullTextureScale],
    isFullTexture: state.isFullTexture,
    fullDecal: state.fullDecal,
    // Color
    color: state.color,
    // Selected clothing
    selectedClothing: state.selectedClothing,
    // Front/Back logo and text settings
    isFrontLogoTexture: state.isFrontLogoTexture,
    isBackLogoTexture: state.isBackLogoTexture,
    isFrontText: state.isFrontText,
    isBackText: state.isBackText,
    frontLogoDecal: state.frontLogoDecal,
    backLogoDecal: state.backLogoDecal,
    frontLogoPosition: [...state.frontLogoPosition],
    frontLogoRotation: [...state.frontLogoRotation],
    frontLogoScale: [...state.frontLogoScale],
    backLogoPosition: [...state.backLogoPosition],
    backLogoRotation: [...state.backLogoRotation],
    backLogoScale: [...state.backLogoScale],
    frontText: state.frontText,
    frontTextPosition: [...state.frontTextPosition],
    frontTextRotation: [...state.frontTextRotation],
    frontTextScale: [...state.frontTextScale],
    frontTextFont: state.frontTextFont,
    frontTextSize: state.frontTextSize,
    frontTextColor: state.frontTextColor,
    backText: state.backText,
    backTextPosition: [...state.backTextPosition],
    backTextRotation: [...state.backTextRotation],
    backTextScale: [...state.backTextScale],
    backTextFont: state.backTextFont,
    backTextSize: state.backTextSize,
    backTextColor: state.backTextColor,
  },
});

// Apply a preset, optionally with a new image to replace layer images
export const applyPreset = (preset, newImage = null) => {
  const data = preset.data;
  
  // Apply layers with optional new image
  if (newImage) {
    // Replace all layer images with the new image, keeping settings
    state.layers = data.layers.map((layer, index) => ({
      ...layer,
      id: layer.id,
      image: newImage, // Use new image
      originalImage: newImage,
    }));
  } else {
    state.layers = JSON.parse(JSON.stringify(data.layers));
  }
  
  state.nextLayerId = data.nextLayerId || state.layers.length + 1;
  state.activeLayerId = state.layers.length > 0 ? state.layers[0].id : null;
  
  // Apply full texture settings
  state.fullTexturePosition = data.fullTexturePosition || [0, 0, 0];
  state.fullTextureRotation = data.fullTextureRotation || [0, 0, 0];
  state.fullTextureScale = data.fullTextureScale || [1, 1, 1];
  state.isFullTexture = data.isFullTexture ?? false;
  if (data.fullDecal) state.fullDecal = data.fullDecal;
  
  // Apply color
  state.color = data.color || '#EFBD48';
  
  // Apply clothing selection
  if (data.selectedClothing) state.selectedClothing = data.selectedClothing;
  
  // Apply logo/text settings if present
  if (data.isFrontLogoTexture !== undefined) state.isFrontLogoTexture = data.isFrontLogoTexture;
  if (data.isBackLogoTexture !== undefined) state.isBackLogoTexture = data.isBackLogoTexture;
  if (data.isFrontText !== undefined) state.isFrontText = data.isFrontText;
  if (data.isBackText !== undefined) state.isBackText = data.isBackText;
  if (data.frontLogoDecal) state.frontLogoDecal = data.frontLogoDecal;
  if (data.backLogoDecal) state.backLogoDecal = data.backLogoDecal;
  if (data.frontLogoPosition) state.frontLogoPosition = [...data.frontLogoPosition];
  if (data.frontLogoRotation) state.frontLogoRotation = [...data.frontLogoRotation];
  if (data.frontLogoScale) state.frontLogoScale = [...data.frontLogoScale];
  if (data.backLogoPosition) state.backLogoPosition = [...data.backLogoPosition];
  if (data.backLogoRotation) state.backLogoRotation = [...data.backLogoRotation];
  if (data.backLogoScale) state.backLogoScale = [...data.backLogoScale];
  if (data.frontText !== undefined) state.frontText = data.frontText;
  if (data.frontTextPosition) state.frontTextPosition = [...data.frontTextPosition];
  if (data.frontTextRotation) state.frontTextRotation = [...data.frontTextRotation];
  if (data.frontTextScale) state.frontTextScale = [...data.frontTextScale];
  if (data.frontTextFont) state.frontTextFont = data.frontTextFont;
  if (data.frontTextSize) state.frontTextSize = data.frontTextSize;
  if (data.frontTextColor) state.frontTextColor = data.frontTextColor;
  if (data.backText !== undefined) state.backText = data.backText;
  if (data.backTextPosition) state.backTextPosition = [...data.backTextPosition];
  if (data.backTextRotation) state.backTextRotation = [...data.backTextRotation];
  if (data.backTextScale) state.backTextScale = [...data.backTextScale];
  if (data.backTextFont) state.backTextFont = data.backTextFont;
  if (data.backTextSize) state.backTextSize = data.backTextSize;
  if (data.backTextColor) state.backTextColor = data.backTextColor;
};

const state = proxy({
  intro: true,
  color: '#EFBD48',
  
  // ========== CLOTHING SELECTION ==========
  selectedClothing: 'tshirt',               // 'tshirt' or 'hoodie'
  
  // ========== MESH SELECTION FOR DECALS ==========
  hoodieMeshParts: [],                      // Dynamic mesh parts from Hoodie model
  selectedMeshIndices: [0],                 // Array of mesh indices to apply decals
  showMeshSelector: false,                  // Show mesh selector modal
  pendingFileReadType: null,                // Pending file type to read after mesh selection
  
  isFrontLogoTexture: true,
  isBackLogoTexture: true,
  isFrontText: true,
  isBackText: true,
  isFullTexture: false,
  frontLogoDecal: './threejs.png',
  fullDecal: './texture.jpeg',
  
  // ========== FULL TEXTURE CONTROLS ==========
  fullTexturePosition: [0, 0, 0],
  fullTextureRotation: [0, 0, 0],
  fullTextureScale: [1, 1, 1],
  
  // ========== MULTI-LAYER SYSTEM ==========
  layers: [],                               // Array of layer objects
  activeLayerId: null,                      // Currently selected layer for editing
  nextLayerId: 1,                           // Auto-increment ID for new layers
  
  // ========== IMAGE CROPPER ==========
  cropperImage: null,                       // Image being cropped
  showCropper: false,                       // Show cropper modal
  recropLayerId: null,                      // Layer ID being re-cropped (null = new layer)
  
  // ========== SAVED PRESETS ==========
  savedPresets: [],                         // Array of saved configurations
  
  // Front Logo - Enhanced controls
  frontLogoPosition: [0, 0.04, 0.15],
  frontLogoRotation: [0, 0, 0],           // [rx, ry, rz] in radians
  frontLogoScale: [0.15, 0.15, 0.15],     // [sx, sy, sz] separate scale
  frontLogoDepth: 1,                       // projection depth
  
  // Back Logo - Enhanced controls
  backLogoDecal: './threejs.png',
  backLogoPosition: [0, 0.04, -0.15],
  backLogoRotation: [0, Math.PI, 0],      // [rx, ry, rz] in radians
  backLogoScale: [0.15, 0.15, 0.15],      // [sx, sy, sz] separate scale
  backLogoDepth: 1,                        // projection depth
  frontText: 'Front Text',
  frontTextPosition: [0, -0.04, 0.15],
  frontTextRotation: [0, 0, 0],
  frontTextFontSize: 0.1,
  frontTextScale: [0.15, 0.04, 0.1],
  frontTextFont: 'Arial',
  frontTextSize: 64,
  frontTextColor: 'black',
  backText: 'Back Text',
  backTextPosition: [0, -0.04, -0.15],
  backTextRotation: [0, Math.PI, 0],
  backTextFontSize: 0.1,
  backTextScale: [0.15, 0.04, 0.1],
  backTextFont: 'Arial',
  backTextSize: 64,
  backTextColor: 'white',
});

export default state;
