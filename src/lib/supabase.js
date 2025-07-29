import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yswjmkygdqjrzgwqeuse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlzd2pta3lnZHFqcnpnd3FldXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMTc1MTQsImV4cCI6MjA2ODg5MzUxNH0.ytqkLZZGyPwQRZvn1CXxaQjwyoKR4nbNAF60ukkFPf0';

if (SUPABASE_URL === 'https://<PROJECT-ID>.supabase.co' || SUPABASE_ANON_KEY === '<ANON_KEY>') {
  throw new Error('Missing Supabase variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export default supabase;