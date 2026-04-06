import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://johjozwgysymxqnzubnz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvaGpvendneXN5bXhxbnp1Ym56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NDYzODcsImV4cCI6MjA4MjQyMjM4N30.YiEA0Gv10i44BuOX91XIBGbbUGuZ64y32wsKA7x9BHM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigrations() {
  try {
    console.log('🚀 Starting Smart Classroom migrations...\n');

    // Note: Direct SQL execution requires admin key
    // The anon key won't work for raw SQL
    console.log('⚠️  Note: Using anon key - some operations may be restricted.');
    console.log('For full migration support, use Supabase dashboard SQL editor.\n');

    // Create blocks
    console.log('📁 Creating blocks...');
    const { error: blockError } = await supabase
      .from('blocks')
      .insert([
        { name: 'Block A', shape: 'square', description: 'Square shaped building with 3 floors' },
        { name: 'Block B', shape: 'rectangle', description: 'Long rectangle shaped building with 3 floors' },
        { name: 'Block C', shape: 'rectangle', description: 'Long rectangle shaped building with 7 floors' },
      ])
      .select();

    if (blockError && !blockError.message.includes('duplicate')) {
      throw blockError;
    }
    console.log('✅ Blocks created\n');

    // Get block IDs
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('id, name');

    if (blocksError) throw blocksError;

    const blockMap = blocks.reduce((acc, b) => ({ ...acc, [b.name]: b.id }), {});

    // Create floors
    console.log('🏢 Creating floors...');
    const floorsToInsert = [];

    // Block A: 3 floors
    for (let i = 1; i <= 3; i++) {
      floorsToInsert.push({ block_id: blockMap['Block A'], floor_number: i });
    }

    // Block B: 3 floors
    for (let i = 1; i <= 3; i++) {
      floorsToInsert.push({ block_id: blockMap['Block B'], floor_number: i });
    }

    // Block C: 7 floors
    for (let i = 1; i <= 7; i++) {
      floorsToInsert.push({ block_id: blockMap['Block C'], floor_number: i });
    }

    const { error: floorError } = await supabase
      .from('floors')
      .insert(floorsToInsert)
      .select();

    if (floorError && !floorError.message.includes('duplicate')) {
      throw floorError;
    }
    console.log('✅ Floors created\n');

    // Get floors
    const { data: floors, error: floorsError } = await supabase
      .from('floors')
      .select('id, block_id, floor_number');

    if (floorsError) throw floorsError;

    // Create classrooms
    console.log('🏫 Creating classrooms...');
    const classroomsToInsert = [];

    // Block A: 8 classrooms per floor
    const blockAFloors = floors.filter(f => f.block_id === blockMap['Block A']);
    blockAFloors.forEach(floor => {
      for (let i = 1; i <= 8; i++) {
        classroomsToInsert.push({
          floor_id: floor.id,
          block_id: floor.block_id,
          floor_number: floor.floor_number,
          classroom_number: i,
          capacity: 30,
          status: 'available',
        });
      }
    });

    // Block B: 7 classrooms per floor
    const blockBFloors = floors.filter(f => f.block_id === blockMap['Block B']);
    blockBFloors.forEach(floor => {
      for (let i = 1; i <= 7; i++) {
        classroomsToInsert.push({
          floor_id: floor.id,
          block_id: floor.block_id,
          floor_number: floor.floor_number,
          classroom_number: i,
          capacity: 30,
          status: 'available',
        });
      }
    });

    // Block C: 7 classrooms per floor
    const blockCFloors = floors.filter(f => f.block_id === blockMap['Block C']);
    blockCFloors.forEach(floor => {
      for (let i = 1; i <= 7; i++) {
        classroomsToInsert.push({
          floor_id: floor.id,
          block_id: floor.block_id,
          floor_number: floor.floor_number,
          classroom_number: i,
          capacity: 30,
          status: 'available',
        });
      }
    });

    const { error: classroomError } = await supabase
      .from('classrooms')
      .insert(classroomsToInsert)
      .select();

    if (classroomError && !classroomError.message.includes('duplicate')) {
      throw classroomError;
    }
    console.log(`✅ ${classroomsToInsert.length} classrooms created\n`);

    // Verify the data
    const { data: finalBlocks } = await supabase.from('blocks').select('*');
    const { data: finalFloors } = await supabase.from('floors').select('*');
    const { data: finalClassrooms } = await supabase.from('classrooms').select('*');

    console.log('📊 Final Statistics:');
    console.log(`   Blocks: ${finalBlocks?.length || 0}`);
    console.log(`   Floors: ${finalFloors?.length || 0}`);
    console.log(`   Classrooms: ${finalClassrooms?.length || 0}`);
    console.log('\n✨ All migrations completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

runMigrations();
