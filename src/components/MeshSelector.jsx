import React from 'react';
import { useSnapshot } from 'valtio';
import state from '../store';

const MeshSelector = ({ onConfirm, onCancel }) => {
  const snap = useSnapshot(state);
  
  const meshParts = snap.hoodieMeshParts;
  const selectedIndices = snap.selectedMeshIndices;

  const toggleMeshSelection = (index) => {
    const current = [...state.selectedMeshIndices];
    const pos = current.indexOf(index);
    
    if (pos === -1) {
      // Add to selection
      current.push(index);
    } else {
      // Remove from selection (but keep at least one)
      if (current.length > 1) {
        current.splice(pos, 1);
      }
    }
    
    state.selectedMeshIndices = current;
  };

  const selectAll = () => {
    state.selectedMeshIndices = meshParts.map((_, i) => i);
  };

  const selectNone = () => {
    // Keep at least first mesh selected
    state.selectedMeshIndices = [0];
  };

  if (!snap.showMeshSelector) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          Chọn phần áo để áp dụng
        </h2>
        
        <p className="text-sm text-gray-600 mb-4">
          Hoodie có nhiều phần mesh. Chọn phần bạn muốn áp dụng texture/logo:
        </p>

        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {meshParts.map((mesh, index) => (
            <label
              key={index}
              className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                selectedIndices.includes(index)
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-gray-100 border-2 border-transparent hover:bg-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIndices.includes(index)}
                onChange={() => toggleMeshSelection(index)}
                className="w-5 h-5 mr-3 accent-blue-600"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-800">
                  {mesh.name || `Mesh ${index + 1}`}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  ({mesh.vertexCount?.toLocaleString() || '?'} vertices)
                </span>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={selectAll}
            className="flex-1 px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            Chọn tất cả
          </button>
          <button
            onClick={selectNone}
            className="flex-1 px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            Bỏ chọn
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 rounded-lg font-medium transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeshSelector;
