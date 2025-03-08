import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Check if Supabase is initialized
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }
    
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }
    
    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }
    
    // Get the advertisement ID from the session metadata
    const advertisementId = session.metadata?.advertisementId;
    
    if (!advertisementId) {
      return NextResponse.json(
        { error: 'Advertisement ID not found in session metadata' },
        { status: 400 }
      );
    }
    
    // Update the advertisement status in Supabase
    const { error: updateError } = await supabase
      .from('advertisements')
      .update({ 
        status: 'active',
        payment_id: session.id,
        payment_amount: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents/pence
        payment_date: new Date().toISOString()
      })
      .eq('id', advertisementId);
    
    if (updateError) {
      console.error('Error updating advertisement status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update advertisement status' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 