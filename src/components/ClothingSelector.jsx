import React from 'react';
import { useSnapshot } from 'valtio';
import state, { clothingModels } from '../store';

const ClothingSelector = () => {
  const snap = useSnapshot(state);

  return (
    <div className="absolute left-full ml-3 bg-white rounded-lg shadow-lg p-4 w-64">
      <h3 className="text-sm font-bold text-gray-800 mb-3">👕 Select Clothing</h3>
      
      <div className="space-y-2">
        {clothingModels.map((clothing) => (
          <button
            key={clothing.id}
            className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
              snap.selectedClothing === clothing.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            onClick={() => {
              state.selectedClothing = clothing.id;
            }}
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
              {clothing.id === 'tshirt' ? '👕' : '🧥'}
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-800">{clothing.name}</p>
              <p className="text-xs text-gray-500">{clothing.file}</p>
            </div>
            {snap.selectedClothing === clothing.id && (
              <div className="ml-auto text-blue-500">✓</div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500">
          💡 Tip: Different clothing may need different layer adjustments
        </p>
      </div>
    </div>
  );
};

export default ClothingSelector;
