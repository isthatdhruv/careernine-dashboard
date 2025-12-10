import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Calendly API credentials
    const apiKey = process.env.CALENDLY_API_KEY;
    
    if (!apiKey) {
      console.error('Calendly API key is not configured');
      return NextResponse.json({ error: 'Calendly API not configured' }, { status: 500 });
    }
    
    // First get the user
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!userResponse.ok) {
      console.error('Calendly API error:', await userResponse.text());
      return NextResponse.json({ error: 'Failed to fetch Calendly user' }, { status: userResponse.status });
    }
    
    const userData = await userResponse.json();
    const organizationUri = userData.resource.current_organization;
    
    // Get all scheduled events for the organization
    const eventsResponse = await fetch(
      `https://api.calendly.com/scheduled_events?organization=${organizationUri}&status=active&count=100&sort=start_time:desc`, 
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (!eventsResponse.ok) {
      console.error('Calendly API error:', await eventsResponse.text());
      return NextResponse.json({ error: 'Failed to fetch scheduled events' }, { status: eventsResponse.status });
    }
    
    const eventsData = await eventsResponse.json();
    
    // For each event, get the invitees to find the one with the matching email
    const events = eventsData.collection;
    const userMeetings = [];
    
    for (const event of events) {
      const inviteesResponse = await fetch(
        `https://api.calendly.com/scheduled_events/${event.uri.split('/').pop()}/invitees?count=100`, 
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      if (inviteesResponse.ok) {
        const inviteesData = await inviteesResponse.json();
        const matchingInvitee = inviteesData.collection.find(
          (invitee: any) => invitee.email.toLowerCase() === email.toLowerCase()
        );
        
        if (matchingInvitee) {
          userMeetings.push({
            event: event,
            invitee: matchingInvitee
          });
        }
      }
    }
    
    return NextResponse.json({ 
      meetings: userMeetings,
      hasMeetings: userMeetings.length > 0 
    });
  } catch (error) {
    console.error('Error fetching scheduled meetings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 