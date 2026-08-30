import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  url.pathname = '/api/mcp';
  return NextResponse.rewrite(url);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  url.pathname = '/api/mcp';
  return NextResponse.rewrite(url);
}
