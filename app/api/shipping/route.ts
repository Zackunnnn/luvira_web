import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { origin, destination, weight } = await request.json();

    if (!destination) {
      return NextResponse.json({ error: 'Destination is required' }, { status: 400 });
    }

    // Mock shipping data because we are simulating the aggregator
    const mockCouriers = [
      {
        courier: 'JNE',
        service: 'REG',
        description: 'Layanan Reguler',
        cost: 15000,
        etd: '2-3 hari',
      },
      {
        courier: 'JNE',
        service: 'YES',
        description: 'Yakin Esok Sampai',
        cost: 25000,
        etd: '1 hari',
      },
      {
        courier: 'Sicepat',
        service: 'REG',
        description: 'Sicepat Reguler',
        cost: 14000,
        etd: '2-3 hari',
      },
      {
        courier: 'Sicepat',
        service: 'BEST',
        description: 'Besok Sampai Tujuan',
        cost: 22000,
        etd: '1 hari',
      }
    ];

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return NextResponse.json({ success: true, data: mockCouriers }, { status: 200 });
  } catch (error) {
    console.error('[Shipping API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
