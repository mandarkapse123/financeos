import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Global server memory store fallback
let cloudStateStore: any = null;
let lastUpdated: number = 0;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from('financeos_state')
        .select('*')
        .eq('id', 'global')
        .single();

      if (data && data.state) {
        return NextResponse.json({ success: true, state: data.state, updatedAt: data.updated_at });
      }
    } catch (e) {
      // fallback to memory store
    }
  }

  return NextResponse.json({
    success: true,
    state: cloudStateStore,
    updatedAt: lastUpdated
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const state = body.state || body.fullState || body;

    if (state && typeof state === 'object') {
      cloudStateStore = state;
      lastUpdated = Date.now();

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase
            .from('financeos_state')
            .upsert({ id: 'global', state: state, updated_at: new Date().toISOString() });
        } catch (e) {
          // ignore
        }
      }
    }

    return NextResponse.json({ success: true, updatedAt: lastUpdated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.toString() }, { status: 500 });
  }
}
