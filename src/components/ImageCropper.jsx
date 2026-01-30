import React, { useState, useRef, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useSnapshot } from 'valtio';
import state, { createLayer } from '../store';

const ImageCropper = () => {
  const snap = useSnapshot(state);
  const imgRef = useRef(null);
  const [crop, setCrop] = useState({
    unit: '%',
    width: 50,
    height: 50,
    x: 25,
    y: 25,
  });
  const [completedCrop, setCompletedCrop] = useState(null);

  const isHoodie = snap.selectedClothing === 'hoodie';
  const meshParts = snap.hoodieMeshParts;

  const toggleMeshSelection = (index) => {
    const current = [...state.selectedMeshIndices];
    const pos = current.indexOf(index);
    
    if (pos === -1) {
      current.push(index);
    } else if (current.length > 1) {
      current.splice(pos, 1);
    }
    
    state.selectedMeshIndices = current;
  };

  const onImageLoad = useCallback((e) => {
    imgRef.current = e.currentTarget;
    // Set initial crop to center
    const { width, height } = e.currentTarget;
    const cropSize = Math.min(width, height) * 0.5;
    setCrop({
      unit: 'px',
      width: cropSize,
      height: cropSize,
      x: (width - cropSize) / 2,
      y: (height - cropSize) / 2,
    });
  }, []);

  const getCroppedImg = useCallback(() => {
    if (!imgRef.current || !completedCrop) return null;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL('image/png');
  }, [completedCrop]);

  const handleApplyCrop = () => {
    const croppedImage = getCroppedImg();
    if (croppedImage && completedCrop && imgRef.current) {
      // Calculate scale factors from display to natural
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      // Store crop info in NATURAL (scaled) coordinates for accurate re-cropping
      // This makes it independent of display size
      const cropInfo = {
        // Crop coordinates in NATURAL pixels (already scaled)
        x: completedCrop.x * scaleX,
        y: completedCrop.y * scaleY,
        width: completedCrop.width * scaleX,
        height: completedCrop.height * scaleY,
        unit: 'px',
        // Store natural dimensions of the SOURCE image for proportional re-cropping
        naturalWidth: imgRef.current.naturalWidth,
        naturalHeight: imgRef.current.naturalHeight,
        // Mark as new format
        format: 'natural',
      };
      
      // Check if we're re-cropping an existing layer
      if (snap.recropLayerId) {
        const existingLayer = state.layers.find(l => l.id === snap.recropLayerId);
        if (existingLayer) {
          existingLayer.image = croppedImage;
          existingLayer.cropInfo = cropInfo;
          // Keep original image and other settings
        }
      } else {
        // Create new layer
        const newLayer = createLayer(
          state.nextLayerId,
          croppedImage,
          `Cropped ${state.nextLayerId}`,
          cropInfo
        );
        // Store original image for re-cropping with presets
        newLayer.originalImage = snap.cropperImage;
        // Store selected mesh indices for Hoodie
        newLayer.targetMeshIndices = [...state.selectedMeshIndices];
        
        state.layers.push(newLayer);
        state.activeLayerId = state.nextLayerId;
        state.nextLayerId += 1;
      }
    }
    handleClose();
  };

  const handleAddWithoutCrop = () => {
    if (snap.cropperImage) {
      // Check if we're re-cropping an existing layer
      if (snap.recropLayerId) {
        const existingLayer = state.layers.find(l => l.id === snap.recropLayerId);
        if (existingLayer) {
          existingLayer.image = snap.cropperImage;
          existingLayer.cropInfo = null; // Remove crop
        }
      } else {
        const newLayer = createLayer(
          state.nextLayerId,
          snap.cropperImage,
          `Layer ${state.nextLayerId}`,
          null // No crop info
        );
        newLayer.originalImage = snap.cropperImage;
        // Store selected mesh indices for Hoodie
        newLayer.targetMeshIndices = [...state.selectedMeshIndices];
        
        state.layers.push(newLayer);
        state.activeLayerId = state.nextLayerId;
        state.nextLayerId += 1;
      }
    }
    handleClose();
  };

  const handleClose = () => {
    state.showCropper = false;
    state.cropperImage = null;
    state.recropLayerId = null; // Reset recrop state
  };

  if (!snap.showCropper || !snap.cropperImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-xl p-6 max-w-4xl max-h-[90vh] overflow-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">✂️ Crop Image</h2>
        
        <div className="mb-4 border rounded-lg overflow-hidden bg-gray-100">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={undefined}
          >
            <img
              src={snap.cropperImage}
              alt="Crop preview"
              onLoad={onImageLoad}
              style={{ maxHeight: '60vh', maxWidth: '100%' }}
            />
          </ReactCrop>
        </div>

        {/* Crop presets */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Quick aspect ratios:</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Free', aspect: undefined },
              { label: '1:1', aspect: 1 },
              { label: '4:3', aspect: 4/3 },
              { label: '16:9', aspect: 16/9 },
              { label: '3:4', aspect: 3/4 },
            ].map((preset) => (
              <button
                key={preset.label}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                onClick={() => {
                  if (imgRef.current && preset.aspect) {
                    const { width, height } = imgRef.current;
                    let newWidth = width * 0.5;
                    let newHeight = newWidth / preset.aspect;
                    if (newHeight > height * 0.8) {
                      newHeight = height * 0.8;
                      newWidth = newHeight * preset.aspect;
                    }
                    setCrop({
                      unit: 'px',
                      width: newWidth,
                      height: newHeight,
                      x: (width - newWidth) / 2,
                      y: (height - newHeight) / 2,
                    });
                  }
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mesh Selector for Hoodie */}
        {isHoodie && meshParts.length > 0 && (
          <div className="mb-4 border rounded-lg p-3 bg-blue-50">
            <p className="text-sm font-medium text-blue-800 mb-2">🎯 Chọn phần mesh để áp dụng:</p>
            <div className="flex flex-wrap gap-2">
              {meshParts.map((mesh, index) => (
                <button
                  key={index}
                  onClick={() => toggleMeshSelection(index)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    snap.selectedMeshIndices.includes(index)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {mesh.name || `Mesh ${index + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            onClick={handleAddWithoutCrop}
          >
            Add Original
          </button>
          <button
            className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            onClick={handleApplyCrop}
          >
            ✂️ Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
