import React, { useState } from 'react';
import { useSnapshot } from 'valtio';

import state from '../store';

const LogoControls = () => {
  const snap = useSnapshot(state);
  const [activeTab, setActiveTab] = useState('front'); // 'front' or 'back'

  // Position handlers
  const handlePositionChange = (type, index, value) => {
    if (type === 'front') {
      state.frontLogoPosition[index] = value;
    } else {
      state.backLogoPosition[index] = value;
    }
  };

  // Rotation handlers (in degrees for UI, converted to radians)
  const handleRotationChange = (type, index, value) => {
    if (type === 'front') {
      state.frontLogoRotation[index] = value;
    } else {
      state.backLogoRotation[index] = value;
    }
  };

  // Scale handlers (separate X, Y, Z)
  const handleScaleChange = (type, index, value) => {
    if (type === 'front') {
      state.frontLogoScale[index] = value;
    } else {
      state.backLogoScale[index] = value;
    }
  };

  // Uniform scale (all axes)
  const handleUniformScaleChange = (type, value) => {
    if (type === 'front') {
      state.frontLogoScale[0] = value;
      state.frontLogoScale[1] = value;
      state.frontLogoScale[2] = value;
    } else {
      state.backLogoScale[0] = value;
      state.backLogoScale[1] = value;
      state.backLogoScale[2] = value;
    }
  };

  // Depth handlers
  const handleDepthChange = (type, value) => {
    if (type === 'front') {
      state.frontLogoDepth = value;
    } else {
      state.backLogoDepth = value;
    }
  };

  const currentType = activeTab;
  const position = currentType === 'front' ? snap.frontLogoPosition : snap.backLogoPosition;
  const rotation = currentType === 'front' ? snap.frontLogoRotation : snap.backLogoRotation;
  const scale = currentType === 'front' ? snap.frontLogoScale : snap.backLogoScale;
  const depth = currentType === 'front' ? snap.frontLogoDepth : snap.backLogoDepth;

  const SliderRow = ({ label, value, onChange, min = -1, max = 1, step = 0.01 }) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="text-gray-700 text-xs font-medium">{label}</span>
        <span className="text-gray-500 text-xs">{value.toFixed(3)}</span>
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
    <div className="absolute left-full ml-3 bg-white rounded-lg shadow-lg p-4 w-72 max-h-[80vh] overflow-y-auto">
      <h3 className="text-sm font-bold text-gray-800 mb-3">🎯 Logo Projection Controls</h3>
      
      {/* Tab switcher */}
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
            activeTab === 'front' 
              ? 'bg-white shadow text-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('front')}
        >
          Front Logo
        </button>
        <button
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
            activeTab === 'back' 
              ? 'bg-white shadow text-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('back')}
        >
          Back Logo
        </button>
      </div>

      {/* Position Section */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
          📍 Position
        </h4>
        <div className="space-y-2 bg-gray-50 rounded-lg p-2">
          <SliderRow
            label="X (Left/Right)"
            value={position[0]}
            onChange={(v) => handlePositionChange(currentType, 0, v)}
            min={-0.5}
            max={0.5}
          />
          <SliderRow
            label="Y (Up/Down)"
            value={position[1]}
            onChange={(v) => handlePositionChange(currentType, 1, v)}
            min={-0.3}
            max={0.3}
          />
          <SliderRow
            label="Z (Front/Back)"
            value={position[2]}
            onChange={(v) => handlePositionChange(currentType, 2, v)}
            min={-0.3}
            max={0.3}
          />
        </div>
      </div>

      {/* Rotation Section */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
          🔄 Rotation (radians)
        </h4>
        <div className="space-y-2 bg-gray-50 rounded-lg p-2">
          <SliderRow
            label="Rot X (Tilt)"
            value={rotation[0]}
            onChange={(v) => handleRotationChange(currentType, 0, v)}
            min={-Math.PI}
            max={Math.PI}
            step={0.05}
          />
          <SliderRow
            label="Rot Y (Turn)"
            value={rotation[1]}
            onChange={(v) => handleRotationChange(currentType, 1, v)}
            min={-Math.PI}
            max={Math.PI}
            step={0.05}
          />
          <SliderRow
            label="Rot Z (Spin)"
            value={rotation[2]}
            onChange={(v) => handleRotationChange(currentType, 2, v)}
            min={-Math.PI}
            max={Math.PI}
            step={0.05}
          />
        </div>
      </div>

      {/* Scale Section */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
          📐 Scale
        </h4>
        <div className="space-y-2 bg-gray-50 rounded-lg p-2">
          <SliderRow
            label="Uniform Scale"
            value={scale[0]}
            onChange={(v) => handleUniformScaleChange(currentType, v)}
            min={0.01}
            max={0.5}
            step={0.01}
          />
          <div className="border-t border-gray-200 pt-2 mt-2">
            <span className="text-xs text-gray-500 mb-1 block">Individual Axes:</span>
            <SliderRow
              label="Scale X (Width)"
              value={scale[0]}
              onChange={(v) => handleScaleChange(currentType, 0, v)}
              min={0.01}
              max={0.5}
            />
            <SliderRow
              label="Scale Y (Height)"
              value={scale[1]}
              onChange={(v) => handleScaleChange(currentType, 1, v)}
              min={0.01}
              max={0.5}
            />
            <SliderRow
              label="Scale Z (Depth)"
              value={scale[2]}
              onChange={(v) => handleScaleChange(currentType, 2, v)}
              min={0.01}
              max={0.5}
            />
          </div>
        </div>
      </div>

      {/* Depth Section */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
          🎚️ Projection Depth
        </h4>
        <div className="bg-gray-50 rounded-lg p-2">
          <SliderRow
            label="Depth"
            value={depth}
            onChange={(v) => handleDepthChange(currentType, v)}
            min={0.1}
            max={3}
            step={0.1}
          />
        </div>
      </div>

      {/* Reset Button */}
      <button
        className="w-full bg-red-500 hover:bg-red-600 text-white text-xs font-medium py-2 rounded-lg transition-colors"
        onClick={() => {
          if (currentType === 'front') {
            state.frontLogoPosition = [0, 0.04, 0.15];
            state.frontLogoRotation = [0, 0, 0];
            state.frontLogoScale = [0.15, 0.15, 0.15];
            state.frontLogoDepth = 1;
          } else {
            state.backLogoPosition = [0, 0.04, -0.15];
            state.backLogoRotation = [0, Math.PI, 0];
            state.backLogoScale = [0.15, 0.15, 0.15];
            state.backLogoDepth = 1;
          }
        }}
      >
        🔄 Reset {currentType === 'front' ? 'Front' : 'Back'} Logo
      </button>

      {/* Current Values Display */}
      <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
        <div><strong>Position:</strong> [{position.map(v => v.toFixed(3)).join(', ')}]</div>
        <div><strong>Rotation:</strong> [{rotation.map(v => v.toFixed(3)).join(', ')}]</div>
        <div><strong>Scale:</strong> [{scale.map(v => v.toFixed(3)).join(', ')}]</div>
      </div>
    </div>
  );
};

export default LogoControls;
