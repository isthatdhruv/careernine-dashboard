import { NextRequest, NextResponse } from 'next/server';

interface CalendlyResponse {
  data: any;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { uri } = body;
    
    if (!uri) {
      return NextResponse.json({ error: 'No appointment URI provided' }, { status: 400 });
    }
    
    // Get the appointment ID from the URI
    const uriParts = uri.split('/');
    const appointmentId = uriParts[uriParts.length - 1];
    
    // Calendly API credentials
    const apiKey = process.env.CALENDLY_API_KEY;
    
    if (!apiKey) {
      console.error('Calendly API key is not configured');
      return NextResponse.json({ error: 'Calendly API not configured' }, { status: 500 });
    }
    
    // Fetch the appointment details
    const response = await fetch(`https://api.calendly.com/scheduled_events/${appointmentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      console.error('Calendly API error:', await response.text());
      return NextResponse.json({ error: 'Failed to fetch appointment details' }, { status: response.status });
    }
    
    const data = await response.json();
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching Calendly appointment details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 