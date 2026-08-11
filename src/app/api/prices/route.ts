import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tickers } = await request.json();
    
    if (!tickers || !Array.isArray(tickers)) {
      return NextResponse.json({ error: 'Invalid tickers array' }, { status: 400 });
    }

    const prices = await Promise.all(
      tickers.map(async (ticker: any) => {
        try {
          if (ticker.type === 'mutual_fund') {
            const res = await fetch(`https://api.mfapi.in/mf/${ticker.symbol}/latest`, { next: { revalidate: 300 } });
            if (!res.ok) throw new Error('Failed to fetch MF');
            const data = await res.json();
            return { id: ticker.id, price: parseFloat(data.data[0].nav) };
          } else if (ticker.type === 'crypto') {
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ticker.symbol}&vs_currencies=inr`, { next: { revalidate: 300 } });
            if (!res.ok) throw new Error('Failed to fetch crypto');
            const data = await res.json();
            return { id: ticker.id, price: data[ticker.symbol]?.inr || null };
          } else if (ticker.type === 'stock') {
            // TODO: implement stock fetching
            return { id: ticker.id, price: ticker.currentPrice || null };
          }
          return { id: ticker.id, price: null };
        } catch (e) {
          console.error('Error fetching price for', ticker.symbol, e);
          return { id: ticker.id, price: null };
        }
      })
    );

    return NextResponse.json({ prices }, { headers: { 'Cache-Control': 'max-age=300' } });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
