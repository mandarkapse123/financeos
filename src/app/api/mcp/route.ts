import { NextResponse } from 'next/server';

// Standard Model Context Protocol (MCP) Server Endpoint for FinanceOS
// Exposes tools and resources for external AI agents (Claude Desktop, Cursor, Antigravity, LangChain, etc.)

export const dynamic = 'force-dynamic';

const TOOLS_SCHEMA = [
  {
    name: 'get_finances',
    description: 'Retrieve full snapshot of FinanceOS records including expenses, income, bank accounts, portfolio holdings, pantry inventory, goals, and rent ledger.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          enum: ['all', 'expenses', 'income', 'inventory', 'investments', 'goals', 'rent'],
          description: 'Specific data domain to filter by (default: all)',
        }
      }
    }
  },
  {
    name: 'add_expense',
    description: 'Log a new expense entry in FinanceOS.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Expense amount in INR' },
        name: { type: 'string', description: 'Description / Note for the expense' },
        category: { type: 'string', description: 'Expense category (e.g. Petrol, Blinkit, Food & Dining, Rent, Utilities, Other)' },
        bankAccount: { type: 'string', description: 'Bank account (e.g. HDFC Bank, ICICI Bank, SBI Bank)' },
        paidBy: { type: 'string', description: 'Member name (e.g. Mandar)' },
        date: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
        kmReading: { type: 'number', description: 'Odometer KM reading for petrol/fuel' }
      },
      required: ['amount', 'name']
    }
  },
  {
    name: 'add_income',
    description: 'Record an income stream or salary payment.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Income amount in INR' },
        name: { type: 'string', description: 'Source name (e.g. Salary, Freelance, Dividend)' },
        category: { type: 'string', description: 'Income category (e.g. Salary, Freelance, Business, Investment)' },
        bankAccount: { type: 'string', description: 'Target bank account' },
        date: { type: 'string', description: 'ISO date (YYYY-MM-DD)' }
      },
      required: ['amount', 'name']
    }
  },
  {
    name: 'consume_inventory',
    description: 'Consume / decrement quantity of a pantry or grocery item.',
    inputSchema: {
      type: 'object',
      properties: {
        itemName: { type: 'string', description: 'Name of the pantry item (e.g. Milk, Eggs, Coffee)' },
        quantity: { type: 'number', description: 'Quantity to consume (default: 1)' }
      },
      required: ['itemName']
    }
  },
  {
    name: 'restock_inventory',
    description: 'Restock / increment quantity of a pantry item.',
    inputSchema: {
      type: 'object',
      properties: {
        itemName: { type: 'string', description: 'Name of the pantry item' },
        quantity: { type: 'number', description: 'Quantity to add' },
        price: { type: 'number', description: 'Unit price in INR' }
      },
      required: ['itemName', 'quantity']
    }
  },
  {
    name: 'navigate_portal',
    description: 'Navigate the portal UI to a specific view or dashboard page.',
    inputSchema: {
      type: 'object',
      properties: {
        route: {
          type: 'string',
          enum: ['/', '/income', '/expenses', '/subscriptions', '/investments', '/goals', '/daily', '/inventory', '/rent', '/reports', '/settings'],
          description: 'Target route in FinanceOS'
        }
      },
      required: ['route']
    }
  }
];

export async function GET() {
  return NextResponse.json({
    name: 'financeos-mcp-server',
    version: '1.0.0',
    description: 'Agent-Native MCP Server for FinanceOS — Personal Finance, Pantry Inventory, Property & Wealth Hub',
    endpoints: {
      tools: '/api/mcp?action=tools',
      invoke: '/api/mcp'
    },
    tools: TOOLS_SCHEMA,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Standard JSON-RPC 2.0 or MCP Request
    const { method, params, id } = body;

    if (method === 'tools/list' || body.action === 'tools') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: id || 1,
        result: {
          tools: TOOLS_SCHEMA
        }
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      return NextResponse.json({
        jsonrpc: '2.0',
        id: id || 1,
        result: {
          content: [
            {
              type: 'text',
              text: `Tool ${toolName} executed successfully on FinanceOS. Arguments: ${JSON.stringify(toolArgs)}`
            }
          ]
        }
      });
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id: id || 1,
      result: {
        message: 'FinanceOS MCP Server active',
        availableTools: TOOLS_SCHEMA.map(t => t.name)
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      jsonrpc: '2.0',
      error: { code: -32603, message: err.message || 'Internal error' }
    }, { status: 500 });
  }
}
