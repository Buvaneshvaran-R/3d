import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Building2 } from 'lucide-react';
import { FloorVisualizer } from '@/components/FloorVisualizer';
import { campusData } from '@/data/campusData';

const ClassroomLocator: React.FC = () => {
  const [selectedBuilding, setSelectedBuilding] = useState('A');
  const [selectedFloor, setSelectedFloor] = useState(0);

  const building = campusData.buildings.find(b => b.id === selectedBuilding);
  const maxFloors = building ? Math.max(...building.floors.map(f => f.number)) : 0;

  const goToNextFloor = () => {
    if (selectedFloor < maxFloors) {
      setSelectedFloor(selectedFloor + 1);
    }
  };

  const goToPreviousFloor = () => {
    if (selectedFloor > 0) {
      setSelectedFloor(selectedFloor - 1);
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={28} />
            <h1 className="text-2xl font-bold">3D Floor Detection</h1>
          </div>
          <div className="text-sm text-blue-200">
            Building {selectedBuilding} • Floor {selectedFloor}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4">
        {/* 3D Visualizer */}
        <div className="flex-1 bg-white rounded-lg overflow-hidden shadow-xl">
          <FloorVisualizer buildingId={selectedBuilding} floorNumber={selectedFloor} />
        </div>

        {/* Control Panel */}
        <div className="w-64 flex flex-col gap-4">
          {/* Building Selection */}
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <h3 className="font-semibold text-gray-800 mb-3">Select Building</h3>
            <div className="grid grid-cols-3 gap-2">
              {campusData.buildings.map(b => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBuilding(b.id);
                    setSelectedFloor(0);
                  }}
                  className={`py-2 px-3 rounded font-semibold transition ${
                    selectedBuilding === b.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Block {b.id}
                </button>
              ))}
            </div>
          </div>

          {/* Floor Navigation */}
          <div className="bg-white rounded-lg p-4 shadow-lg flex flex-col">
            <h3 className="font-semibold text-gray-800 mb-4">Floor Navigation</h3>
            
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-4 text-center mb-4">
              <div className="text-4xl font-bold">{selectedFloor}</div>
              <div className="text-sm text-blue-100">Current Floor</div>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={goToNextFloor}
                disabled={selectedFloor >= maxFloors}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                <ChevronUp size={20} /> Up
              </button>
              <button
                onClick={goToPreviousFloor}
                disabled={selectedFloor <= 0}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                <ChevronDown size={20} /> Down
              </button>
            </div>

            <div className="text-xs text-gray-600">
              <p>Total Floors: {maxFloors + 1}</p>
              <p className="mt-1">Rooms on this floor: {building?.floors.find(f => f.number === selectedFloor)?.rooms.length || 0}</p>
            </div>
          </div>

          {/* Building Info */}
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <h3 className="font-semibold text-gray-800 mb-2">{building?.name}</h3>
            <p className="text-xs text-gray-600 mb-3">{building?.type === 'academic' ? '🏫 Academic Building' : building?.type}</p>
            <div className="text-xs space-y-1 text-gray-700">
              <p><strong>Total Floors:</strong> {maxFloors + 1}</p>
              <p><strong>Total Rooms:</strong> {building?.floors.reduce((sum, f) => sum + f.rooms.length, 0)}</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-gray-700">
              <strong>💡 Tip:</strong> Use Up/Down buttons to navigate between floors. Hover over rooms to see details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomLocator;
