import { NextResponse } from 'next/server';
import { pullStateFromSupabase, pushStateToSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await pullStateFromSupabase();
  return NextResponse.json({
    success: true,
    state: state,
    updatedAt: Date.now()
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const state = body.state || body.fullState || body;

    if (state && typeof state === 'object') {
      await pushStateToSupabase(state);
    }

    return NextResponse.json({ success: true, updatedAt: Date.now() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.toString() }, { status: 500 });
  }
}
