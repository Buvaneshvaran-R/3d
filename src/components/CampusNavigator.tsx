import React, { useState, useEffect } from 'react';
import { Building, Floor, Room } from '@/types/campus';
import { campusData, findStaffLocation, findTeacherByRoomId } from '@/data/campusData';
import { Search, ChevronRight, MapPin, Users } from 'lucide-react';

interface CampusNavigatorProps {
  selectedRoom?: Room | null;
  onRoomSelect?: (room: Room) => void;
  onRoomHighlight?: (room: Room | null) => void;
  userRole?: 'student' | 'staff';
  selectedBuildingId?: string | null;
}

export const CampusNavigator: React.FC<CampusNavigatorProps> = ({
  selectedRoom,
  onRoomSelect,
  onRoomHighlight,
  userRole = 'student',
  selectedBuildingId,
}) => {
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>('A');
  const [expandedFloor, setExpandedFloor] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; building: string }>>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'search' | 'available'>('browse');

  // Auto-expand the building when clicked in the 3D view
  useEffect(() => {
    if (!selectedBuildingId) return;
    setExpandedBuilding(selectedBuildingId);
    setActiveTab('browse');
  }, [selectedBuildingId]);

  // Handle staff search
  const handleStaffSearch = (query: string) => {
    setSearchQuery(query);

    if (query.trim().length === 0) {
      setSearchResults([]);
      onRoomHighlight?.(null);
      return;
    }

    // Search for staff
    const staffLocation = findStaffLocation(query);
    if (staffLocation) {
      const building = campusData.buildings.find(b => b.id === staffLocation.buildingId);
      const floor = building?.floors.find(f => f.number === staffLocation.floorNumber);
      const room = floor?.rooms.find(r => r.id === staffLocation.roomId);

      setSearchResults([
        {
          type: 'staff',
          staffName: staffLocation.staffName,
          staffId: staffLocation.staffId,
          building: building?.name,
          floor: staffLocation.floorNumber,
          room: room,
          roomName: staffLocation.roomName
        }
      ]);

      if (room) {
        onRoomHighlight?.(room);
      }
    } else {
      setSearchResults([
        {
          type: 'not-found',
          query: query
        }
      ]);
      onRoomHighlight?.(null);
    }
  };

  // Handle room booking (students and staff)
  const handleBookRoom = (room: Room) => {
    const bookingId = Math.random().toString(36).substr(2, 9);
    const userType = userRole === 'staff' ? 'Staff' : 'Student';
    alert(`${userType} has booked: ${room.name}\nBooking ID: ${bookingId}\nCapacity: ${room.capacity} students`);
  };

  const getRoomTypeColor = (type: Room['type']) => {
    const colors: Record<Room['type'], string> = {
      classroom: 'bg-blue-100 text-blue-900',
      staff_room: 'bg-purple-100 text-purple-900',
      office: 'bg-indigo-100 text-indigo-900',
      seminar_hall: 'bg-pink-100 text-pink-900',
      exam_center: 'bg-orange-100 text-orange-900',
      storage: 'bg-gray-100 text-gray-900',
      service: 'bg-cyan-100 text-cyan-900'
    };
    return colors[type] || colors.classroom;
  };

  const getRoomTypeLabel = (type: Room['type']) => {
    const labels: Record<Room['type'], string> = {
      classroom: 'Classroom',
      staff_room: 'Staff Room',
      office: 'Office',
      seminar_hall: 'Seminar Hall',
      exam_center: 'Exam Center',
      storage: 'Storage',
      service: 'Service'
    };
    return labels[type] || 'Room';
  };

  return (
    <div className="w-80 h-full bg-white shadow-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MapPin size={20} />
          Campus Navigator
        </h2>
        <p className="text-xs text-blue-100 mt-1">
          {userRole === 'staff' ? 'Staff View' : 'Student View'} - Browse & book available rooms
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-2 bg-gray-50 border-b">
        <button
          onClick={() => setActiveTab('browse')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded transition ${
            activeTab === 'browse'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Browse
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded transition ${
            activeTab === 'search'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Find Teacher
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded transition ${
            activeTab === 'available'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Available Rooms
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'search' ? (
          <div className="p-4 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Find teacher (e.g., Dr. Kumar, Prof. Singh)..."
                value={searchQuery}
                onChange={(e) => handleStaffSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Search Results */}
            <div className="space-y-3">
              {searchResults.length > 0 ? (
                searchResults.map((result, idx) =>
                  result.type === 'staff' ? (
                    <div
                      key={idx}
                      className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg"
                    >
                      <h3 className="font-semibold text-blue-900">{result.staffName}</h3>
                      <p className="text-xs text-blue-700 mt-1">Staff ID: {result.staffId}</p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Building:</span> {result.building}
                        </p>
                        <p>
                          <span className="font-medium">Floor:</span> {result.floor}
                        </p>
                        <p>
                          <span className="font-medium">Room:</span> {result.roomName}
                        </p>
                      </div>
                      {result.room && (
                        <div className="mt-3 space-y-2">
                          <span
                            className={`inline-block px-3 py-1 rounded text-xs font-medium ${getRoomTypeColor(
                              result.room.type
                            )}`}
                          >
                            {getRoomTypeLabel(result.room.type)}
                          </span>
                          {userRole === 'staff' && result.room.type === 'classroom' && (
                            <button
                              onClick={() => handleBookRoom(result.room)}
                              className="w-full mt-2 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition text-sm font-medium"
                            >
                              Book This Room
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={idx} className="p-3 bg-red-50 border border-red-300 rounded-lg">
                      <p className="text-red-900 text-sm font-medium">Teacher/Staff Not Found</p>
                      <p className="text-red-700 text-xs mt-1">
                        "{result.query}" is not in the system. Try searching for:
                      </p>
                      <ul className="text-red-700 text-xs mt-2 list-disc list-inside">
                        <li>Dr. Kumar</li>
                        <li>Prof. Singh</li>
                        <li>Dr. Sharma</li>
                        <li>Prof. Patel</li>
                        <li>Dr. Gupta</li>
                        <li>Prof. Nair</li>
                        <li>Dr. Rao</li>
                        <li>Prof. Menon</li>
                        <li>Dr. Iyer</li>
                        <li>Prof. Reddy</li>
                      </ul>
                    </div>
                  )
                )
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  {searchQuery ? `No teacher/staff found matching "${searchQuery}"` : 'Enter a teacher or staff name to locate them on campus'}
                </p>
              )}
            </div>
          </div>
        ) : activeTab === 'available' ? (
          <div className="p-4 space-y-3">
            <div className="bg-green-50 border border-green-300 rounded-lg p-3">
              <h3 className="font-bold text-green-900 mb-2">Available Classrooms</h3>
              <p className="text-xs text-green-700 mb-3">Click a room to book it</p>
              
              {campusData.buildings.map(building => (
                <div key={building.id} className="mb-3 pb-3 border-b border-green-200 last:border-0">
                  <p className="font-semibold text-green-800 mb-2 text-sm">{building.name}</p>
                  {building.floors.map(floor => {
                    const availableRooms = floor.rooms.filter(r => r.type === 'classroom' && r.occupancyStatus === 'empty');
                    if (availableRooms.length === 0) return null;
                    
                    return (
                      <div key={floor.number} className="ml-2 mb-2">
                        <p className="text-xs font-medium text-green-700 mb-1">Floor {floor.number}:</p>
                        <div className="space-y-1">
                          {availableRooms.map(room => (
                            <button
                              key={room.id}
                              onClick={() => {
                                onRoomSelect?.(room);
                                onRoomHighlight?.(room);
                                handleBookRoom(room);
                              }}
                              className="w-full text-left p-2 bg-green-100 hover:bg-green-200 text-green-900 rounded text-xs font-medium transition"
                            >
                              {room.name} (Cap: {room.capacity})
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {/* Building List */}
            {campusData.buildings.map(building => (
              <div key={building.id}>
                <button
                  onClick={() =>
                    setExpandedBuilding(expandedBuilding === building.id ? null : building.id)
                  }
                  className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition flex items-center justify-between font-semibold text-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{
                        backgroundColor: `rgb(${Math.round(building.color.r * 255)}, ${Math.round(
                          building.color.g * 255
                        )}, ${Math.round(building.color.b * 255)})`
                      }}
                    />
                    <span>{building.name}</span>
                  </div>
                  <ChevronRight
                    size={18}
                    className={`transform transition ${expandedBuilding === building.id ? 'rotate-90' : ''}`}
                  />
                </button>

                {/* Floor List */}
                {expandedBuilding === building.id && (
                  <div className="ml-4 space-y-1 mt-2">
                    {building.floors.map(floor => (
                      <div key={floor.number}>
                        <button
                          onClick={() =>
                            setExpandedFloor(expandedFloor === floor.number ? null : floor.number)
                          }
                          className="w-full text-left p-2 hover:bg-gray-100 rounded transition flex items-center justify-between text-gray-700 text-sm"
                        >
                          <span>
                            Floor {floor.number} ({floor.rooms.length} rooms)
                          </span>
                          <ChevronRight
                            size={16}
                            className={`transform transition ${expandedFloor === floor.number ? 'rotate-90' : ''}`}
                          />
                        </button>

                        {/* Room List */}
                        {expandedFloor === floor.number && building.id === expandedBuilding && (
                          <div className="ml-4 space-y-1 mt-1">
                            {floor.rooms.map(room => (
                              <div
                                key={room.id}
                                onClick={() => {
                                  onRoomSelect?.(room);
                                  onRoomHighlight?.(room);
                                }}
                                className={`p-2 rounded text-xs cursor-pointer transition ${getRoomTypeColor(
                                  room.type
                                )} border-2 ${
                                  selectedRoom?.id === room.id
                                    ? 'border-blue-600 bg-blue-200'
                                    : 'border-transparent hover:border-gray-400'
                                }`}
                              >
                                <div className="font-semibold">{room.name}</div>
                                <div className="text-xs opacity-75">
                                  {getRoomTypeLabel(room.type)}
                                </div>
                                {room.staffAssigned && (
                                  <div className="mt-1 flex items-center gap-1">
                                    <Users size={12} />
                                    <span>{room.staffAssigned}</span>
                                  </div>
                                )}
                                {userRole === 'staff' && room.type === 'classroom' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBookRoom(room);
                                    }}
                                    className="w-full mt-1 bg-green-600 text-white py-1 rounded hover:bg-green-700 transition text-xs font-medium"
                                  >
                                    Book
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campus Statistics */}
      <div className="border-t bg-gray-50 p-3">
        {(() => {
          const allRooms = campusData.buildings.flatMap(b => b.floors.flatMap(f => f.rooms));
          const classrooms = allRooms.filter(r => r.type === 'classroom');
          const availableCount = classrooms.filter(r => r.occupancyStatus === 'empty').length;
          const bookedCount = classrooms.filter(r => r.occupancyStatus === 'occupied').length;
          const maintenanceCount = classrooms.filter(r => r.occupancyStatus === 'maintenance').length;
          
          return (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-green-100 rounded p-2">
                <div className="font-bold text-green-900">{availableCount}</div>
                <div className="text-green-700 text-xs">Available</div>
              </div>
              <div className="bg-red-100 rounded p-2">
                <div className="font-bold text-red-900">{bookedCount}</div>
                <div className="text-red-700 text-xs">Booked</div>
              </div>
              <div className="bg-yellow-100 rounded p-2">
                <div className="font-bold text-yellow-900">{maintenanceCount}</div>
                <div className="text-yellow-700 text-xs">Maintenance</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Selected Room Info */}
      {selectedRoom && (
        <div className="border-t p-4 bg-blue-50">
          <h3 className="font-bold text-gray-800 mb-2">{selectedRoom.name}</h3>
          <div className="space-y-1 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Type:</span> {getRoomTypeLabel(selectedRoom.type)}
            </p>
            <p>
              <span className="font-semibold">Building:</span>{' '}
              {campusData.buildings.find(b => b.id === selectedRoom.buildingId)?.name}
            </p>
            <p>
              <span className="font-semibold">Floor:</span> {selectedRoom.floorNumber}
            </p>
            {selectedRoom.capacity && (
              <p>
                <span className="font-semibold">Capacity:</span> {selectedRoom.capacity} students
              </p>
            )}
            {(() => {
              const teacher = findTeacherByRoomId(selectedRoom.id);
              return (
                <>
                  {teacher ? (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="flex items-center gap-2 font-semibold text-blue-900">
                        <Users size={14} />
                        Teacher Occupying
                      </p>
                      <div className="mt-2 p-2 bg-white rounded border border-blue-300">
                        <p className="font-semibold text-blue-900">{teacher.staffName}</p>
                        <p className="text-xs text-gray-600">ID: {teacher.staffId}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="flex items-center gap-2 font-semibold text-gray-600">
                        <Users size={14} />
                        No teacher assigned
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
