#!/usr/bin/env node

/**
 * Smart Classroom Migration Script
 * This script sets up the complete Smart Classroom feature in Supabase
 */

const supabaseUrl = 'https://johjozwgysymxqnzubnz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvaGpvendneXN5bXhxbnp1Ym56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NDYzODcsImV4cCI6MjA4MjQyMjM4N30.YiEA0Gv10i44BuOX91XIBGbbUGuZ64y32wsKA7x9BHM';

console.log(`
════════════════════════════════════════════════════════════════
  🎓 RIT Smart Classroom Feature Setup
════════════════════════════════════════════════════════════════

⚠️  IMPORTANT: Database migrations require admin access.

The anon key cannot create tables or run raw SQL.
You need to manually run the SQL in your Supabase Dashboard.

STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Open your Supabase Dashboard:
   👉 https://supabase.com/dashboard

2️⃣  Navigate to SQL Editor (left sidebar)

3️⃣  Click "New Query"

4️⃣  Copy & Paste the SQL from:
   📄 supabase/15_smart_classroom.sql
   (Creates tables and RLS policies)

5️⃣  Click "RUN" button

6️⃣  Create another new query and paste:
   📄 supabase/16_smart_classroom_seed.sql
   (Creates sample block/floor/classroom data)

7️⃣  Click "RUN" button again

8️⃣  Refresh your app at:
   👉 http://localhost:8080

DONE! ✨

Your Smart Classroom feature will be ready to use!

════════════════════════════════════════════════════════════════
`);

// Open the SQL files for reference
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sqlFile1 = path.join(__dirname, 'supabase', '15_smart_classroom.sql');
const sqlFile2 = path.join(__dirname, 'supabase', '16_smart_classroom_seed.sql');

try {
  const sql1 = fs.readFileSync(sqlFile1, 'utf-8');
  const sql2 = fs.readFileSync(sqlFile2, 'utf-8');

  console.log('\n📋 Step 4 SQL (Copy this into Supabase SQL Editor):');
  console.log('━'.repeat(70));
  console.log(sql1);
  console.log('\n');
  console.log('📋 Step 6 SQL (Copy this into a new Supabase query):');
  console.log('━'.repeat(70));
  console.log(sql2);
} catch (e) {
  console.log('Could not read SQL files. Please run the SQL manually from files.');
}
