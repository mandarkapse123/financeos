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

function parseTextLines(text: string): { orderId?: string; date?: string; totalAmount?: number; items: ParsedItem[] } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: ParsedItem[] = [];

  let orderId: string | undefined;
  let date: string | undefined;
  let totalAmount: number | undefined;

  // 1. Find Order ID, Date & Total
  for (const line of lines) {
    const orderMatch = line.match(/(?:Order\s*(?:Id|#|no\.?)|Invoice\s*(?:no\.?|#))\s*[:\-]?\s*([a-zA-Z0-9_\-]+)/i);
    if (orderMatch && !orderId) {
      orderId = orderMatch[1];
    }

    const dateMatch = line.match(/Invoice\s*Date\s*:\s*([0-9a-zA-Z\-]+)/i) ||
      line.match(/(\d{1,2}[\/\-\.](?:\d{1,2}|[a-zA-Z]{3,})[\/\-\.]\d{2,4})/);
    if (dateMatch && !date) {
      date = dateMatch[1];
    }

    const totalMatch = line.match(/(?:Total(?:\s*paid|\s*amount|\s*bill)?|Grand\s*Total|Amount\s*in\s*Words)\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/i);
    if (totalMatch && !totalAmount) {
      const num = parseFloat(totalMatch[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) totalAmount = num;
    }
  }

  // 2. Parse Items
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Filter out common header/footer / delivery charges
    if (/^tax\s*invoice|blink\s*commerce|delivery and other charges|handling charge|gstin|fssai|cin|pan|authorized signatory|whether the tax is payable/i.test(line)) {
      continue;
    }

    // Pattern 1: Exact Blinkit Table Format
    // "1 8901030935220 Bru Instant Coffee (100 g)(Pouch) (HSN-21011120) 270.00 21.00 1 237.14 2.50 5.93 2.50 5.93 0.00 0.00 249.00"
    // Or "1 8906009501024 Chitale Full Cream Milk(Pouch) (HSN-04014000) 78.00 0.00 1 78.00 0.00 0.00 0.00 0.00 0.00 0.00 78.00"
    const blinkitMatch = line.match(/^\d+\s+(?:\d{4,16}\s+)?(.*?)(?:\s*\(HSN[^\)]*\))?\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+)\s+.*?(\d+\.\d{2})$/i);
    if (blinkitMatch) {
      let rawName = blinkitMatch[1].trim();
      rawName = rawName.replace(/\(HSN[^\)]*\)/gi, '').trim();
      const qty = parseInt(blinkitMatch[4], 10) || 1;
      const total = parseFloat(blinkitMatch[5]);

      if (rawName && !rawName.toLowerCase().includes('delivery') && total > 0) {
        items.push({
          name: rawName,
          category: categorizeItem(rawName),
          quantity: qty,
          unit: rawName.match(/\b(\d+\s*(?:g|kg|ml|l|pcs|pack|cup|pouch|bottle))\b/i)?.[1] || 'pcs',
          price: total / qty,
          totalAmount: total,
        });
        continue;
      }
    }

    // Pattern 2: Generic "Item Name ... Qty: 2 ... Price: 50" or "Amul Milk 2 x ₹28 ₹56"
    const genericMatch = line.match(/^(?:(?:\d+[\.\)]\s*)?([a-zA-Z0-9\s\(\)\-\,\.\+]+?))\s+(?:qty:?\s*)?(\d+)\s*(?:x\s*|@\s*)?₹?\s*([\d,]+\.?\d*)\s*(?:=\s*₹?\s*([\d,]+\.?\d*))?$/i);
    if (genericMatch) {
      const rawName = genericMatch[1].trim();
      const qty = parseInt(genericMatch[2], 10) || 1;
      const p1 = parseFloat(genericMatch[3].replace(/,/g, ''));
      const p2 = genericMatch[4] ? parseFloat(genericMatch[4].replace(/,/g, '')) : (p1 * qty);
      const total = p2 || (p1 * qty);

      if (rawName && rawName.length > 2 && !rawName.toLowerCase().includes('total') && total > 0) {
        items.push({
          name: rawName,
          category: categorizeItem(rawName),
          quantity: qty,
          unit: rawName.match(/\b(\d+\s*(?:g|kg|ml|l|pcs|pack|cup|pouch|bottle))\b/i)?.[1] || 'pcs',
          price: total / qty,
          totalAmount: total,
        });
      }
    }
  }

  // Fallback if no items matched via strict patterns
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

  return {
    orderId: orderId || `B_${Date.now().toString(36).toUpperCase()}`,
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
        const buffer = new Uint8Array(bytes);

        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          try {
            // 1. Try high-performance unpdf text extraction across all PDF pages
            const { text } = await extractText(buffer, { mergePages: true });
            textContent = text || '';
          } catch (unpdfErr) {
            console.error('unpdf error:', unpdfErr);
          }

          // 2. Fallback to @firecrawl/anydoc markdown converter if unpdf produced empty output
          if (!textContent || textContent.trim().length === 0) {
            try {
              const anydoc = require('@firecrawl/anydoc');
              if (typeof anydoc.toMarkdownBytes === 'function') {
                const md = await anydoc.toMarkdownBytes(buffer);
                textContent = md || '';
              }
            } catch (anydocErr) {
              console.error('anydoc error:', anydocErr);
            }
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

    const parsed = parseTextLines(textContent);

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
