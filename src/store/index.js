import { proxy } from 'valtio';

// Available clothing models
export const clothingModels = [
  {
    id: 'tshirt',
    name: 'T-Shirt',
    file: '/shirt.glb',
    meshName: 'T_Shirt_male',
    materialName: 'lambert1',
  },
  {
    id: 'hoodie',
    name: 'Hoodie',
    file: '/urban_streetwear_hoodie__3d_clothing.glb',
    meshName: null,  // Will auto-detect
    materialName: null,
  },
];

// Layer template for creating new layers
export const createLayer = (id, image, name = `Layer ${id}`) => ({
  id,
  name,
  image,                                    // Base64 or URL of the image
  visible: true,
  opacity: 1,
  // Position
  position: [0, 0, 0],
  // Rotation (radians)
  rotation: [0, 0, 0],
  // Scale (separate X, Y, Z)
  scale: [1, 1, 1],
  // Border radius (0-50, percentage of smallest dimension)
  borderRadius: 0,
  // Blending
  blendMode: 'normal',                      // normal, multiply, add, etc.
});

const state = proxy({
  intro: true,
  color: '#EFBD48',
  
  // ========== CLOTHING SELECTION ==========
  selectedClothing: 'tshirt',               // 'tshirt' or 'hoodie'
  
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
