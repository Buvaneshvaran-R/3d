import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://johjozwgysymxqnzubnz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvaGpvendneXN5bXhxbnp1Ym56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NDYzODcsImV4cCI6MjA4MjQyMjM4N30.YiEA0Gv10i44BuOX91XIBGbbUGuZ64y32wsKA7x9BHM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type-safe database types (will be generated later)
export type Database = Record<string, unknown>
