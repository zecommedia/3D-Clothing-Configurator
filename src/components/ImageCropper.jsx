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
    if (croppedImage && completedCrop) {
      // Store crop info for preset functionality
      const cropInfo = {
        x: completedCrop.x,
        y: completedCrop.y,
        width: completedCrop.width,
        height: completedCrop.height,
        unit: completedCrop.unit || 'px',
        // Also store natural dimensions for accurate re-cropping
        naturalWidth: imgRef.current?.naturalWidth,
        naturalHeight: imgRef.current?.naturalHeight,
      };
      
      const newLayer = createLayer(
        state.nextLayerId,
        croppedImage,
        `Cropped ${state.nextLayerId}`,
        cropInfo
      );
      // Store original image for re-cropping with presets
      newLayer.originalImage = snap.cropperImage;
      
      state.layers.push(newLayer);
      state.activeLayerId = state.nextLayerId;
      state.nextLayerId += 1;
    }
    handleClose();
  };

  const handleAddWithoutCrop = () => {
    if (snap.cropperImage) {
      const newLayer = createLayer(
        state.nextLayerId,
        snap.cropperImage,
        `Layer ${state.nextLayerId}`,
        null // No crop info
      );
      newLayer.originalImage = snap.cropperImage;
      
      state.layers.push(newLayer);
      state.activeLayerId = state.nextLayerId;
      state.nextLayerId += 1;
    }
    handleClose();
  };

  const handleClose = () => {
    state.showCropper = false;
    state.cropperImage = null;
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
