import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Calendly API credentials
    const apiKey = process.env.CALENDLY_API_KEY;
    
    if (!apiKey) {
      console.error('Calendly API key is not configured');
      return NextResponse.json({ error: 'Calendly API not configured' }, { status: 500 });
    }
    
    // Fetch the user profile
    const response = await fetch('https://api.calendly.com/users/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      console.error('Calendly API error:', await response.text());
      return NextResponse.json({ error: 'Failed to fetch user profile', status: response.status }, { status: response.status });
    }
    
    const data = await response.json();
    
    return NextResponse.json({ 
      success: true,
      message: 'Calendly API is working correctly',
      user: data.resource,
      apiKeyLength: apiKey.length
    });
  } catch (error) {
    console.error('Error testing Calendly API:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
} 