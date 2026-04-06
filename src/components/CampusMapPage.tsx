import React, { useState } from 'react';
import { Room, Building } from '@/types/campus';
import { CampusVisualizer } from '@/components/CampusVisualizer';
import { CampusNavigator } from '@/components/CampusNavigator';

interface CampusMapPageProps {
  userRole: 'student' | 'staff';
}

export const CampusMapPage: React.FC<CampusMapPageProps> = ({ userRole }) => {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [highlightedRoom, setHighlightedRoom] = useState<Room | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  return (
    <div className="flex h-screen bg-gray-900 gap-4 p-4">
      {/* 3D Visualizer - Main Content */}
      <div className="flex-1 bg-gradient-to-b from-sky-300 to-sky-100 rounded-lg overflow-hidden shadow-2xl">
        <CampusVisualizer
          onRoomSelect={setSelectedRoom}
          onBuildingSelect={setSelectedBuilding}
          highlightedRoom={highlightedRoom}
        />
      </div>

      {/* Navigation Panel */}
      <CampusNavigator
        selectedRoom={selectedRoom}
        onRoomSelect={setSelectedRoom}
        onRoomHighlight={setHighlightedRoom}
        userRole={userRole}
        selectedBuildingId={selectedBuilding?.id ?? null}
      />
    </div>
  );
};

export default CampusMapPage;

