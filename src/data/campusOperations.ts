import { supabase } from '@/lib/supabase';
import { Room, Building } from '@/types/campus';
import { campusData } from './campusData';

/**
 * Search for staff member in the system and get their location
 */
export const searchStaffByName = async (searchQuery: string) => {
  if (!searchQuery.trim()) return null;

  try {
    // Search in staff table
    const { data: staffData, error } = await supabase
      .from('staff')
      .select('*')
      .ilike('name', `%${searchQuery}%`)
      .limit(1);

    if (error) {
      console.error('Error searching staff:', error);
      return null;
    }

    if (!staffData || staffData.length === 0) {
      return null;
    }

    const staff = staffData[0];

    // Get staff assignment (classroom/office location)
    const { data: assignmentData } = await supabase
      .from('staff_assignments')
      .select('*')
      .eq('staff_id', staff.id)
      .eq('is_active', true)
      .limit(1);

    if (assignmentData && assignmentData.length > 0) {
      const assignment = assignmentData[0];

      // Find the room in campus data
      const building = campusData.buildings.find(b => b.id === assignment.building_id);
      const floor = building?.floors.find(f => f.number === assignment.floor_number);
      const room = floor?.rooms.find(r => r.id === assignment.room_id);

      if (room) {
        return {
          staffId: staff.id,
          staffName: staff.name,
          staffEmail: staff.email,
          department: staff.department,
          buildingId: assignment.building_id,
          buildingName: building?.name || 'Unknown',
          floorNumber: assignment.floor_number,
          room: room,
          roomName: room.name,
          roomType: room.type,
          assignmentStartDate: assignment.assignment_date,
          assignmentEndDate: assignment.end_date
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error in searchStaffByName:', error);
    return null;
  }
};

/**
 * Get all available rooms of a specific type
 */
export const getAvailableRooms = (roomType: Room['type']) => {
  const availableRooms: Array<{ id: string; name: string; type: Room['type']; position: { x: number; z: number; y: number }; occupancyStatus: string }> = [];;

  campusData.buildings.forEach(building => {
    building.floors.forEach(floor => {
      floor.rooms.forEach(room => {
        if (room.type === roomType && room.occupancyStatus === 'empty') {
          availableRooms.push({
            ...room,
            buildingId: building.id,
            buildingName: building.name,
            floorNumber: floor.number
          });
        }
      });
    });
  });

  return availableRooms;
};

/**
 * Book a classroom (staff only)
 */
export const bookClassroom = async (
  userId: string,
  roomId: string,
  startTime: string,
  endTime: string,
  purpose: string
) => {
  try {
    const { data, error } = await supabase
      .from('classroom_bookings')
      .insert({
        staff_id: userId,
        room_id: roomId,
        start_time: startTime,
        end_time: endTime,
        purpose: purpose,
        booking_status: 'confirmed',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      bookingId: data?.id,
      message: 'Classroom booked successfully'
    };
  } catch (error) {
    console.error('Error booking classroom:', error);
    return {
      success: false,
      message: 'Failed to book classroom'
    };
  }
};

/**
 * Get booking history for a room
 */
export const getRoomBookings = async (roomId: string, date: string) => {
  try {
    const { data, error } = await supabase
      .from('classroom_bookings')
      .select('*')
      .eq('room_id', roomId)
      .ilike('start_time', `${date}%`)
      .eq('booking_status', 'confirmed')
      .order('start_time', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching room bookings:', error);
    return [];
  }
};

/**
 * Check if a room is available for a specific time slot
 */
export const isRoomAvailable = async (
  roomId: string,
  startTime: string,
  endTime: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('classroom_bookings')
      .select('*')
      .eq('room_id', roomId)
      .eq('booking_status', 'confirmed')
      .lte('start_time', endTime)
      .gte('end_time', startTime);

    if (error) throw error;

    return (data?.length || 0) === 0; // No conflicts = available
  } catch (error) {
    console.error('Error checking room availability:', error);
    return false;
  }
};

/**
 * Get room details with occupancy info
 */
export const getRoomDetails = async (roomId: string) => {
  try {
    // Get room from campus data
    let targetRoom: Room | null = null;
    let buildingName = '';

    campusData.buildings.forEach(building => {
      building.floors.forEach(floor => {
        const room = floor.rooms.find(r => r.id === roomId);
        if (room) {
          targetRoom = room;
          buildingName = building.name;
        }
      });
    });

    if (!targetRoom) {
      return null;
    }

    // Get today's bookings
    const today = new Date().toISOString().split('T')[0];
    const bookings = await getRoomBookings(roomId, today);

    return {
      room: targetRoom,
      buildingName,
      todaysBookings: bookings,
      occupancyStatus: targetRoom.occupancyStatus,
      capacity: targetRoom.capacity
    };
  } catch (error) {
    console.error('Error getting room details:', error);
    return null;
  }
};

/**
 * Update room occupancy status
 */
export const updateRoomOccupancy = async (
  roomId: string,
  status: 'empty' | 'occupied' | 'maintenance'
) => {
  try {
    // This would update in a database if rooms were stored there
    // For now, we update the in-memory campusData
    campusData.buildings.forEach(building => {
      building.floors.forEach(floor => {
        const room = floor.rooms.find(r => r.id === roomId);
        if (room) {
          room.occupancyStatus = status;
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating room occupancy:', error);
    return { success: false };
  }
};

/**
 * Get building occupancy statistics
 */
export const getBuildingStats = (buildingId: string) => {
  const building = campusData.buildings.find(b => b.id === buildingId);
  if (!building) return null;

  let totalRooms = 0;
  let occupiedRooms = 0;
  let availableRooms = 0;
  let maintenanceRooms = 0;
  let totalCapacity = 0;

  building.floors.forEach(floor => {
    floor.rooms.forEach(room => {
      totalRooms++;
      totalCapacity += room.capacity || 0;

      if (room.occupancyStatus === 'occupied') {
        occupiedRooms++;
      } else if (room.occupancyStatus === 'empty') {
        availableRooms++;
      } else if (room.occupancyStatus === 'maintenance') {
        maintenanceRooms++;
      }
    });
  });

  return {
    buildingId,
    buildingName: building.name,
    totalRooms,
    occupiedRooms,
    availableRooms,
    maintenanceRooms,
    totalCapacity,
    occupancyRate: ((occupiedRooms / totalRooms) * 100).toFixed(2)
  };
};

/**
 * Get all buildings statistics
 */
export const getAllBuildingsStats = () => {
  return campusData.buildings.map(building => getBuildingStats(building.id));
};
