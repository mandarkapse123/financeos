import { NextResponse } from 'next/server';
import { extractText } from 'unpdf';

export const dynamic = 'force-dynamic';

interface ParsedItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  totalAmount: number;
}

function categorizeItem(name: string): string {
  const n = name.toLowerCase();

  if (/coffee|tea|juice|soda|coke|beverage|water|nescafe|drink|red bull/i.test(n)) {
    return 'Beverages';
  }
  if (/milk|curd|dahi|paneer|butter|cheese|egg|chaas|buttermilk|cream|tofu/i.test(n)) {
    return 'Dairy & Eggs';
  }
  if (/apple|banana|mango|potato|onion|tomato|ginger|garlic|chilli|lemon|coriander|spinach|carrot|cucumber|capsicum|fruit|vegetable|sprout|matki|pomegranate|pear/i.test(n)) {
    return 'Fruits & Vegetables';
  }
  if (/protein|creatine|vitamin|multivitamin|supplement|omega|fish oil|zinc|biotin|collagen|glutamine/i.test(n)) {
    return 'Health & Supplements';
  }
  if (/peanuts|peanut|biscuit|cookie|chips|wafer|lays|kurkure|chocolate|namkeen|makhana|popcorn|snack|bhujia|sweet|ice cream/i.test(n)) {
    return 'Snacks & Munchies';
  }
  if (/oil|atta|flour|rice|dal|pulse|sugar|salt|ghee|masala|turmeric|cumin|mustard|spice|sauce|ketchup|pasta|noodle|maggi|oats|poha|besan/i.test(n)) {
    return 'Pantry & Staples';
  }
  if (/shampoo|soap|body wash|toothpaste|toothbrush|facewash|cream|lotion|deodorant|perfume|serum|shaving|razor/i.test(n)) {
    return 'Personal Care';
  }
  if (/detergent|surf|surf excel|ariel|vim|dishwash|harpic|colin|cleaner|garbage bag|trash bag|tissue|foil|broom|mop/i.test(n)) {
    return 'Cleaning & Household';
  }

  return 'Pantry & Staples';
}

function parseBlinkitInvoiceText(text: string): { orderId?: string; date?: string; totalAmount?: number; itemsTotal?: number; deliveryFee?: number; items: ParsedItem[] } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  let orderId = '';
  let date = '';
  let invoiceTotal = 0;

  // 1. Extract Order ID & Date
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const oM = l.match(/Order\s*Id\s*[:\-]?\s*([0-9a-zA-Z]+)/i);
    if (oM && !orderId) orderId = oM[1];

    if (/Invoice/i.test(l) && /Date/i.test(lines[i+1] || '')) {
      const nextL = lines[i+2] || '';
      const dM = nextL.match(/[:\-]?\s*([0-9a-zA-Z\-]+)/);
      if (dM && !date) date = dM[1];
    } else {
      const dM = l.match(/Invoice\s*Date\s*[:\-]?\s*([0-9a-zA-Z\-]+)/i);
      if (dM && !date) date = dM[1];
    }

    const tM = l.match(/^Total\s+(?:\d+\s+)*(?:[\d\.]+\s+)*(\d+\.\d{2})$/i);
    if (tM) {
      invoiceTotal += parseFloat(tM[1]) || 0;
    }
  }

  const items: ParsedItem[] = [];

  // 2. Parse Items via Multi-Line Table Matching
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is the table number row: e.g. "270.00 21.00 1 237.14 2.50 5.93 2.50 5.93 0.00 0.00 249.00"
    // Or "78.00 0.00 1 78.00 0.00 0.00 0.00 0.00 0.00 0.00 78.00"
    const numRowMatch = line.match(/^(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+)\s+[\d\.\s]+?(\d+\.\d{2})$/);
    if (numRowMatch) {
      const qty = parseInt(numRowMatch[3], 10) || 1;
      const totalAmount = parseFloat(numRowMatch[4]);

      // Collect item name from preceding lines
      const nameParts: string[] = [];
      let k = i - 1;
      while (k >= 0) {
        const prevLine = lines[k];
        // Stop if we hit a table header, section boundary, or another number row
        if (/^Tax Invoice|^Sold By|^Sr\. no|^Order Id|^Total|Delivery and other|\d+\.\d{2}\s+\d+\.\d{2}\s+\d+/i.test(prevLine)) {
          break;
        }
        // Skip UPC barcodes / single digit row numbers
        if (/^\d{1,4}$/.test(prevLine) || /^\d{8,16}$/.test(prevLine)) {
          if (/^\d{1,2}$/.test(prevLine)) {
            break;
          }
          k--;
          continue;
        }

        nameParts.unshift(prevLine);
        k--;
      }

      let fullName = nameParts.join(' ').replace(/\(HSN[^\)]*\)/gi, '').trim();
      fullName = fullName.replace(/^[\d\s]+/, '').trim();

      if (fullName && !fullName.toLowerCase().includes('delivery') && totalAmount > 0) {
        items.push({
          name: fullName,
          category: categorizeItem(fullName),
          quantity: qty,
          unit: fullName.match(/\b(\d+\s*(?:g|kg|ml|l|pcs|pack|cup|pouch|bottle))\b/i)?.[1] || 'pcs',
          price: totalAmount / qty,
          totalAmount: totalAmount,
        });
      }
    }
  }

  // Fallback if no multi-line table items found (single line format)
  if (items.length === 0) {
    for (const line of lines) {
      if (/^tax|blinkit|subtotal|gstin|pan|order|invoice|delivery/i.test(line)) continue;
      const m = line.match(/^([a-zA-Z0-9\s\(\)\-\,\+]{3,40})\s+.*?₹?\s*([\d,]+\.\d{2})$/);
      if (m) {
        const name = m[1].trim();
        const amt = parseFloat(m[2].replace(/,/g, ''));
        if (name && amt > 0 && !name.toLowerCase().includes('total')) {
          items.push({
            name,
            category: categorizeItem(name),
            quantity: 1,
            unit: name.match(/\b(\d+\s*(?:g|kg|ml|l|pcs|pack|cup|pouch|bottle))\b/i)?.[1] || 'pcs',
            price: amt,
            totalAmount: amt,
          });
        }
      }
    }
  }

  const calculatedTotal = items.reduce((sum, it) => sum + it.totalAmount, 0);
  const finalTotal = invoiceTotal > 0 ? invoiceTotal : calculatedTotal;

  return {
    orderId: orderId || `B_${Date.now().toString(36).toUpperCase()}`,
    date: date || new Date().toISOString().substring(0, 10),
    totalAmount: finalTotal,
    itemsTotal: calculatedTotal,
    deliveryFee: Math.max(0, Math.round((finalTotal - calculatedTotal) * 100) / 100),
    items,
  };
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let textContent = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const rawText = formData.get('text') as string | null;

      if (rawText) {
        textContent = rawText;
      } else if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = new Uint8Array(bytes);

        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          try {
            const { text } = await extractText(buffer, { mergePages: true });
            textContent = text || '';
          } catch (unpdfErr) {
            console.error('unpdf error:', unpdfErr);
          }
        } else {
          textContent = Buffer.from(bytes).toString('utf-8');
        }
      }
    } else {
      const body = await req.json();
      textContent = body.text || body.content || '';
    }

    if (!textContent || textContent.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No text could be extracted from this PDF. Please verify the document or paste text directly.',
      }, { status: 400 });
    }

    const parsed = parseBlinkitInvoiceText(textContent);

    return NextResponse.json({
      success: true,
      data: {
        orderId: parsed.orderId,
        date: parsed.date,
        totalAmount: parsed.totalAmount,
        itemsCount: parsed.items.length,
        items: parsed.items,
        rawPreview: textContent.substring(0, 400),
      }
    });
  } catch (err: any) {
    console.error('Parse invoice error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to parse invoice',
    }, { status: 500 });
  }
}
