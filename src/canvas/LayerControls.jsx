import React, { useState, useRef } from 'react';
import { useSnapshot } from 'valtio';
import state, { createLayer } from '../store';

const LayerControls = () => {
  const snap = useSnapshot(state);
  const fileInputRef = useRef(null);
  const cropFileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('layers'); // 'layers', 'fullTexture', 'presets'

  // ========== FILE UPLOAD (Direct - no crop) ==========
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newLayer = createLayer(
          state.nextLayerId,
          event.target.result,
          file.name.replace(/\.[^/.]+$/, '') // Remove extension
        );
        state.layers.push(newLayer);
        state.activeLayerId = state.nextLayerId;
        state.nextLayerId += 1;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = ''; // Reset input
  };

  // ========== FILE UPLOAD WITH CROP ==========
  const handleFileUploadWithCrop = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      state.cropperImage = event.target.result;
      state.showCropper = true;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  // ========== LAYER MANAGEMENT ==========
  const handleSelectLayer = (id) => {
    state.activeLayerId = id;
  };

  const handleDeleteLayer = (id) => {
    const index = state.layers.findIndex((l) => l.id === id);
    if (index !== -1) {
      state.layers.splice(index, 1);
      if (state.activeLayerId === id) {
        state.activeLayerId = state.layers.length > 0 ? state.layers[0].id : null;
      }
    }
  };

  const handleToggleVisibility = (id) => {
    const layer = state.layers.find((l) => l.id === id);
    if (layer) layer.visible = !layer.visible;
  };

  const handleMoveLayer = (id, direction) => {
    const index = state.layers.findIndex((l) => l.id === id);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < state.layers.length) {
      const [removed] = state.layers.splice(index, 1);
      state.layers.splice(newIndex, 0, removed);
    }
  };

  // ========== LAYER PROPERTY UPDATES ==========
  const updateLayerProperty = (property, value) => {
    const layer = state.layers.find((l) => l.id === snap.activeLayerId);
    if (layer) layer[property] = value;
  };

  const updateLayerArrayProperty = (property, index, value) => {
    const layer = state.layers.find((l) => l.id === snap.activeLayerId);
    if (layer) layer[property][index] = value;
  };

  // ========== FULL TEXTURE CONTROLS ==========
  const updateFullTexture = (property, index, value) => {
    state[property][index] = value;
  };

  // ========== SAVE/LOAD PRESETS ==========
  const savePreset = () => {
    const presetName = prompt('Enter preset name:');
    if (!presetName) return;

    const preset = {
      id: Date.now(),
      name: presetName,
      date: new Date().toISOString(),
      data: {
        layers: JSON.parse(JSON.stringify(snap.layers)),
        fullTexturePosition: [...snap.fullTexturePosition],
        fullTextureRotation: [...snap.fullTextureRotation],
        fullTextureScale: [...snap.fullTextureScale],
        color: snap.color,
      },
    };
    state.savedPresets.push(preset);
    localStorage.setItem('clothingPresets', JSON.stringify(state.savedPresets));
    alert(`Preset "${presetName}" saved!`);
  };

  const loadPreset = (preset) => {
    state.layers = JSON.parse(JSON.stringify(preset.data.layers));
    state.fullTexturePosition = [...preset.data.fullTexturePosition];
    state.fullTextureRotation = [...preset.data.fullTextureRotation];
    state.fullTextureScale = [...preset.data.fullTextureScale];
    state.color = preset.data.color;
    state.activeLayerId = state.layers.length > 0 ? state.layers[0].id : null;
  };

  const deletePreset = (id) => {
    const index = state.savedPresets.findIndex((p) => p.id === id);
    if (index !== -1) {
      state.savedPresets.splice(index, 1);
      localStorage.setItem('clothingPresets', JSON.stringify(state.savedPresets));
    }
  };

  const exportPreset = () => {
    const data = {
      layers: snap.layers,
      fullTexturePosition: snap.fullTexturePosition,
      fullTextureRotation: snap.fullTextureRotation,
      fullTextureScale: snap.fullTextureScale,
      color: snap.color,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clothing-preset-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPreset = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        state.layers = data.layers || [];
        state.fullTexturePosition = data.fullTexturePosition || [0, 0, 0];
        state.fullTextureRotation = data.fullTextureRotation || [0, 0, 0];
        state.fullTextureScale = data.fullTextureScale || [1, 1, 1];
        state.color = data.color || '#EFBD48';
        state.activeLayerId = state.layers.length > 0 ? state.layers[0].id : null;
        alert('Preset imported successfully!');
      } catch (err) {
        alert('Error importing preset: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Load saved presets from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('clothingPresets');
    if (saved) {
      try {
        state.savedPresets = JSON.parse(saved);
      } catch (e) {
        console.error('Error loading presets:', e);
      }
    }
  }, []);

  const activeLayer = snap.layers.find((l) => l.id === snap.activeLayerId);

  // ========== UI COMPONENTS ==========
  const SliderRow = ({ label, value, onChange, min = -1, max = 1, step = 0.01 }) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="text-gray-700 text-xs font-medium">{label}</span>
        <span className="text-gray-500 text-xs">{typeof value === 'number' ? value.toFixed(3) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );

  return (
    <div className="absolute left-full ml-3 bg-white rounded-lg shadow-lg p-4 w-80 max-h-[85vh] overflow-y-auto">
      <h3 className="text-sm font-bold text-gray-800 mb-3">🎨 Layer & Texture Controls</h3>

      {/* Tab Switcher */}
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        {['layers', 'fullTexture', 'presets'].map((tab) => (
          <button
            key={tab}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
              activeTab === tab
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'layers' && '📚 Layers'}
            {tab === 'fullTexture' && '🖼️ Full'}
            {tab === 'presets' && '💾 Presets'}
          </button>
        ))}
      </div>

      {/* ========== LAYERS TAB ========== */}
      {activeTab === 'layers' && (
        <>
          {/* Upload Buttons */}
          <div className="mb-4 space-y-2">
            {/* Upload with Crop */}
            <input
              ref={cropFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUploadWithCrop}
              className="hidden"
            />
            <button
              className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              onClick={() => cropFileInputRef.current?.click()}
            >
              ✂️ Upload & Crop Image
            </button>
            
            {/* Direct Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              ➕ Upload Direct (Multi-select)
            </button>
          </div>

          {/* Layer List */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">📚 Layers ({snap.layers.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {snap.layers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No layers yet. Upload images above.</p>
              ) : (
                snap.layers.map((layer, index) => (
                  <div
                    key={layer.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                      snap.activeLayerId === layer.id
                        ? 'bg-blue-100 border border-blue-300'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSelectLayer(layer.id)}
                  >
                    {/* Thumbnail */}
                    <img
                      src={layer.image}
                      alt={layer.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{layer.name}</p>
                      <p className="text-xs text-gray-400">Layer {index + 1}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-1">
                      <button
                        className="p-1 hover:bg-gray-200 rounded text-xs"
                        onClick={(e) => { e.stopPropagation(); handleToggleVisibility(layer.id); }}
                        title={layer.visible ? 'Hide' : 'Show'}
                      >
                        {layer.visible ? '👁️' : '🙈'}
                      </button>
                      <button
                        className="p-1 hover:bg-gray-200 rounded text-xs"
                        onClick={(e) => { e.stopPropagation(); handleMoveLayer(layer.id, 'up'); }}
                        title="Move Up"
                        disabled={index === 0}
                      >
                        ⬆️
                      </button>
                      <button
                        className="p-1 hover:bg-gray-200 rounded text-xs"
                        onClick={(e) => { e.stopPropagation(); handleMoveLayer(layer.id, 'down'); }}
                        title="Move Down"
                        disabled={index === snap.layers.length - 1}
                      >
                        ⬇️
                      </button>
                      <button
                        className="p-1 hover:bg-red-200 rounded text-xs text-red-500"
                        onClick={(e) => { e.stopPropagation(); handleDeleteLayer(layer.id); }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Layer Controls */}
          {activeLayer && (
            <div className="border-t pt-4">
              <h4 className="text-xs font-semibold text-gray-600 mb-2">
                ⚙️ Editing: {activeLayer.name}
              </h4>

              {/* Opacity & Border Radius */}
              <div className="mb-3 bg-gray-50 rounded-lg p-2 space-y-2">
                <SliderRow
                  label="Opacity"
                  value={activeLayer.opacity}
                  onChange={(v) => updateLayerProperty('opacity', v)}
                  min={0}
                  max={1}
                  step={0.05}
                />
                <SliderRow
                  label="🔲 Border Radius"
                  value={activeLayer.borderRadius || 0}
                  onChange={(v) => updateLayerProperty('borderRadius', v)}
                  min={0}
                  max={50}
                  step={1}
                />
              </div>

              {/* Position */}
              <div className="mb-3">
                <h5 className="text-xs text-gray-500 mb-1">📍 Position</h5>
                <div className="space-y-1 bg-gray-50 rounded-lg p-2">
                  <SliderRow
                    label="X (Left/Right)"
                    value={activeLayer.position[0]}
                    onChange={(v) => updateLayerArrayProperty('position', 0, v)}
                    min={-0.5}
                    max={0.5}
                  />
                  <SliderRow
                    label="Y (Up/Down)"
                    value={activeLayer.position[1]}
                    onChange={(v) => updateLayerArrayProperty('position', 1, v)}
                    min={-0.5}
                    max={0.5}
                  />
                  <SliderRow
                    label="Z (Depth)"
                    value={activeLayer.position[2]}
                    onChange={(v) => updateLayerArrayProperty('position', 2, v)}
                    min={-0.5}
                    max={0.5}
                  />
                </div>
              </div>

              {/* Rotation */}
              <div className="mb-3">
                <h5 className="text-xs text-gray-500 mb-1">🔄 Rotation</h5>
                <div className="space-y-1 bg-gray-50 rounded-lg p-2">
                  <SliderRow
                    label="Rot X"
                    value={activeLayer.rotation[0]}
                    onChange={(v) => updateLayerArrayProperty('rotation', 0, v)}
                    min={-Math.PI}
                    max={Math.PI}
                    step={0.05}
                  />
                  <SliderRow
                    label="Rot Y"
                    value={activeLayer.rotation[1]}
                    onChange={(v) => updateLayerArrayProperty('rotation', 1, v)}
                    min={-Math.PI}
                    max={Math.PI}
                    step={0.05}
                  />
                  <SliderRow
                    label="Rot Z"
                    value={activeLayer.rotation[2]}
                    onChange={(v) => updateLayerArrayProperty('rotation', 2, v)}
                    min={-Math.PI}
                    max={Math.PI}
                    step={0.05}
                  />
                </div>
              </div>

              {/* Scale */}
              <div className="mb-3">
                <h5 className="text-xs text-gray-500 mb-1">📐 Scale</h5>
                <div className="space-y-1 bg-gray-50 rounded-lg p-2">
                  <SliderRow
                    label="Scale X"
                    value={activeLayer.scale[0]}
                    onChange={(v) => updateLayerArrayProperty('scale', 0, v)}
                    min={0.1}
                    max={2}
                    step={0.05}
                  />
                  <SliderRow
                    label="Scale Y"
                    value={activeLayer.scale[1]}
                    onChange={(v) => updateLayerArrayProperty('scale', 1, v)}
                    min={0.1}
                    max={2}
                    step={0.05}
                  />
                  <SliderRow
                    label="Scale Z"
                    value={activeLayer.scale[2]}
                    onChange={(v) => updateLayerArrayProperty('scale', 2, v)}
                    min={0.1}
                    max={2}
                    step={0.05}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== FULL TEXTURE TAB ========== */}
      {activeTab === 'fullTexture' && (
        <>
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">🖼️ Full Texture Controls</h4>
            <p className="text-xs text-gray-400 mb-3">Adjust how the full texture is projected onto the shirt</p>
          </div>

          {/* Position */}
          <div className="mb-3">
            <h5 className="text-xs text-gray-500 mb-1">📍 Position</h5>
            <div className="space-y-1 bg-gray-50 rounded-lg p-2">
              <SliderRow
                label="X"
                value={snap.fullTexturePosition[0]}
                onChange={(v) => updateFullTexture('fullTexturePosition', 0, v)}
                min={-1}
                max={1}
              />
              <SliderRow
                label="Y"
                value={snap.fullTexturePosition[1]}
                onChange={(v) => updateFullTexture('fullTexturePosition', 1, v)}
                min={-1}
                max={1}
              />
              <SliderRow
                label="Z"
                value={snap.fullTexturePosition[2]}
                onChange={(v) => updateFullTexture('fullTexturePosition', 2, v)}
                min={-1}
                max={1}
              />
            </div>
          </div>

          {/* Rotation */}
          <div className="mb-3">
            <h5 className="text-xs text-gray-500 mb-1">🔄 Rotation</h5>
            <div className="space-y-1 bg-gray-50 rounded-lg p-2">
              <SliderRow
                label="Rot X"
                value={snap.fullTextureRotation[0]}
                onChange={(v) => updateFullTexture('fullTextureRotation', 0, v)}
                min={-Math.PI}
                max={Math.PI}
                step={0.05}
              />
              <SliderRow
                label="Rot Y"
                value={snap.fullTextureRotation[1]}
                onChange={(v) => updateFullTexture('fullTextureRotation', 1, v)}
                min={-Math.PI}
                max={Math.PI}
                step={0.05}
              />
              <SliderRow
                label="Rot Z"
                value={snap.fullTextureRotation[2]}
                onChange={(v) => updateFullTexture('fullTextureRotation', 2, v)}
                min={-Math.PI}
                max={Math.PI}
                step={0.05}
              />
            </div>
          </div>

          {/* Scale */}
          <div className="mb-3">
            <h5 className="text-xs text-gray-500 mb-1">📐 Scale</h5>
            <div className="space-y-1 bg-gray-50 rounded-lg p-2">
              <SliderRow
                label="Scale X"
                value={snap.fullTextureScale[0]}
                onChange={(v) => updateFullTexture('fullTextureScale', 0, v)}
                min={0.5}
                max={3}
                step={0.05}
              />
              <SliderRow
                label="Scale Y"
                value={snap.fullTextureScale[1]}
                onChange={(v) => updateFullTexture('fullTextureScale', 1, v)}
                min={0.5}
                max={3}
                step={0.05}
              />
              <SliderRow
                label="Scale Z"
                value={snap.fullTextureScale[2]}
                onChange={(v) => updateFullTexture('fullTextureScale', 2, v)}
                min={0.5}
                max={3}
                step={0.05}
              />
            </div>
          </div>

          {/* Reset */}
          <button
            className="w-full bg-red-500 hover:bg-red-600 text-white text-xs font-medium py-2 rounded-lg transition-colors"
            onClick={() => {
              state.fullTexturePosition = [0, 0, 0];
              state.fullTextureRotation = [0, 0, 0];
              state.fullTextureScale = [1, 1, 1];
            }}
          >
            🔄 Reset Full Texture
          </button>
        </>
      )}

      {/* ========== PRESETS TAB ========== */}
      {activeTab === 'presets' && (
        <>
          <div className="mb-4 space-y-2">
            <button
              className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              onClick={savePreset}
            >
              💾 Save Current as Preset
            </button>
            <button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              onClick={exportPreset}
            >
              📤 Export to File
            </button>
            <label className="block w-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium py-2 rounded-lg transition-colors text-center cursor-pointer">
              📥 Import from File
              <input
                type="file"
                accept=".json"
                onChange={importPreset}
                className="hidden"
              />
            </label>
          </div>

          {/* Saved Presets List */}
          <div>
            <h4 className="text-xs font-semibold text-gray-600 mb-2">
              📁 Saved Presets ({snap.savedPresets.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {snap.savedPresets.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No saved presets yet.</p>
              ) : (
                snap.savedPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-xs font-medium text-gray-700">{preset.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(preset.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs rounded"
                        onClick={() => loadPreset(preset)}
                      >
                        Load
                      </button>
                      <button
                        className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 text-xs rounded"
                        onClick={() => deletePreset(preset.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LayerControls;
