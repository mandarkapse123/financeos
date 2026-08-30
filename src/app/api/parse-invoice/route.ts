import { NextResponse } from 'next/server';

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

  if (/milk|curd|dahi|paneer|butter|cheese|egg|chaas|buttermilk|cream|tofu/i.test(n)) {
    return 'Dairy & Eggs';
  }
  if (/protein|creatine|vitamin|multivitamin|supplement|omega|fish oil|zinc|biotin|collagen|glutamine/i.test(n)) {
    return 'Health & Supplements';
  }
  if (/apple|banana|mango|potato|onion|tomato|ginger|garlic|chilli|lemon|coriander|spinach|carrot|cucumber|capsicum|fruit|vegetable/i.test(n)) {
    return 'Fruits & Vegetables';
  }
  if (/oil|atta|flour|rice|dal|pulse|sugar|salt|ghee|masala|turmeric|cumin|mustard|spice|sauce|ketchup|pasta|noodle|maggi|oats|poha|besan/i.test(n)) {
    return 'Pantry & Staples';
  }
  if (/biscuit|cookie|chips|wafer|lays|kurkure|chocolate|namkeen|makhana|popcorn|snack|bhujia|sweet|ice cream/i.test(n)) {
    return 'Snacks & Munchies';
  }
  if (/coke|pepsi|sprite|fanta|soda|juice|water|tea|coffee|nescafe|red bull|monster|drink|beverage|tonic/i.test(n)) {
    return 'Beverages';
  }
  if (/shampoo|soap|body wash|toothpaste|toothbrush|facewash|cream|lotion|deodorant|perfume|serum|shaving|razor/i.test(n)) {
    return 'Personal Care';
  }
  if (/detergent|surf|surf excel|ariel|vim|dishwash|harpic|colin|cleaner|garbage bag|trash bag|tissue|foil|broom|mop/i.test(n)) {
    return 'Cleaning & Household';
  }

  return 'Pantry & Staples';
}

function parseTextLines(text: string): { orderId?: string; date?: string; totalAmount?: number; items: ParsedItem[] } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: ParsedItem[] = [];

  let orderId: string | undefined;
  let date: string | undefined;
  let totalAmount: number | undefined;

  // Find Order ID
  for (const line of lines) {
    const orderMatch = line.match(/(?:order\s*(?:id|#|no\.?)|invoice\s*(?:no\.?|#))\s*[:\-]?\s*([a-zA-Z0-9_\-]+)/i);
    if (orderMatch && !orderId) {
      orderId = orderMatch[1];
    }

    const dateMatch = line.match(/(\d{1,2}[\/\-\.](?:\d{1,2}|[a-zA-Z]{3,})[\/\-\.]\d{2,4})/);
    if (dateMatch && !date) {
      date = dateMatch[1];
    }

    const totalMatch = line.match(/(?:total(?:\s*paid|\s*amount|\s*bill)?|grand\s*total)\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/i);
    if (totalMatch && !totalAmount) {
      const num = parseFloat(totalMatch[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) totalAmount = num;
    }
  }

  // Parse Item Lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Filter out common header/footer strings
    if (/^tax\s*invoice|blinkit|customer|gstin|fssai|subtotal|delivery fee|handling fee|total amount|authorized signatory/i.test(line)) {
      continue;
    }

    // Pattern 1: "Amul Taaza Milk 500ml 2 x ₹28 ₹56" or "Item Name 1 pc ₹120"
    const pattern1 = /^(.*?)\s+(\d+)\s*(?:x\s*|pcs?\s*|pack\s*|kg\s*|g\s*|l\s*|ml\s*)?₹?\s*([\d,]+\.?\d*)\s+₹?\s*([\d,]+\.?\d*)$/i;
    // Pattern 2: "1. Item Name ... Qty: 2 ... Price: 50"
    const pattern2 = /^(?:\d+[\.\)]\s*)?(.*?)\s+(?:qty|quantity)?:?\s*(\d+)\s*(?:x\s*|@\s*)?₹?\s*([\d,]+\.?\d*)$/i;

    const m1 = line.match(pattern1);
    if (m1) {
      const name = m1[1].replace(/^\d+[\.\)]\s*/, '').trim();
      const qty = parseInt(m1[2], 10) || 1;
      const p1 = parseFloat(m1[3].replace(/,/g, ''));
      const p2 = parseFloat(m1[4].replace(/,/g, ''));
      const price = p1 || (p2 / qty);
      const total = p2 || (price * qty);

      if (name && name.length > 2 && total > 0) {
        items.push({
          name,
          category: categorizeItem(name),
          quantity: qty,
          unit: name.match(/\b(\d+\s*(?:ml|g|kg|l|pcs|pack))\b/i)?.[1] || 'pcs',
          price,
          totalAmount: total,
        });
        continue;
      }
    }

    const m2 = line.match(pattern2);
    if (m2 && !m2[1].toLowerCase().includes('total')) {
      const name = m2[1].trim();
      const qty = parseInt(m2[2], 10) || 1;
      const price = parseFloat(m2[3].replace(/,/g, ''));
      if (name && name.length > 2 && price > 0) {
        items.push({
          name,
          category: categorizeItem(name),
          quantity: qty,
          unit: name.match(/\b(\d+\s*(?:ml|g|kg|l|pcs|pack))\b/i)?.[1] || 'pcs',
          price: price / qty,
          totalAmount: price,
        });
      }
    }
  }

  // Fallback: If no structured items found via strict regex, use heuristic line scanning
  if (items.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const priceMatch = line.match(/₹\s*([\d,]+\.?\d*)/);
      if (priceMatch) {
        const amt = parseFloat(priceMatch[1].replace(/,/g, ''));
        const cleanName = line.replace(/₹\s*[\d,]+\.?\d*/g, '').replace(/^\d+[\.\)]\s*/, '').trim();
        if (cleanName.length > 3 && amt > 0 && !cleanName.toLowerCase().includes('total')) {
          items.push({
            name: cleanName,
            category: categorizeItem(cleanName),
            quantity: 1,
            unit: 'pcs',
            price: amt,
            totalAmount: amt,
          });
        }
      }
    }
  }

  const calculatedTotal = items.reduce((sum, it) => sum + it.totalAmount, 0);
  if (!totalAmount && calculatedTotal > 0) {
    totalAmount = calculatedTotal;
  }

  return {
    orderId,
    date: date || new Date().toISOString().substring(0, 10),
    totalAmount: totalAmount || calculatedTotal,
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
        const buffer = Buffer.from(bytes);

        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          try {
            // Lazy load pdf-parse
            // @ts-ignore
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(buffer);
            textContent = data.text || '';
          } catch (pdfErr: any) {
            console.error('PDF parsing error:', pdfErr);
            // Fallback: extract visible ascii text from raw buffer
            textContent = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r]/g, ' ');
          }
        } else {
          textContent = buffer.toString('utf-8');
        }
      }
    } else {
      const body = await req.json();
      textContent = body.text || body.content || '';
    }

    if (!textContent || textContent.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No text or PDF content could be extracted from the invoice.',
      }, { status: 400 });
    }

    const parsed = parseTextLines(textContent);

    return NextResponse.json({
      success: true,
      data: {
        orderId: parsed.orderId || `ORD_${Date.now().toString(36).toUpperCase()}`,
        date: parsed.date,
        totalAmount: parsed.totalAmount,
        itemsCount: parsed.items.length,
        items: parsed.items,
        rawPreview: textContent.substring(0, 500),
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
