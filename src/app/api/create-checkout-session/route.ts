import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    
    const companyName = formData.get('companyName') as string;
    const websiteUrl = formData.get('websiteUrl') as string;
    const durationId = formData.get('durationId') as string;
    const durationName = formData.get('durationName') as string;
    const price = parseInt(formData.get('price') as string);
    const headerImage = formData.get('headerImage') as File;
    
    if (!companyName || !websiteUrl || !durationId || !price || !headerImage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Upload image to Supabase Storage
    const buffer = await headerImage.arrayBuffer();
    const fileName = `${Date.now()}-${headerImage.name}`;
    const filePath = `ads/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('advertisements')
      .upload(filePath, buffer, {
        contentType: headerImage.type,
        cacheControl: '3600',
      });
    
    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }
    
    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('advertisements')
      .getPublicUrl(filePath);
    
    // Create a temporary record in Supabase
    const { data: adData, error: adError } = await supabase
      .from('advertisements')
      .insert({
        company_name: companyName,
        website_url: websiteUrl,
        duration_id: durationId,
        duration_name: durationName,
        price: price,
        image_url: publicUrl,
        status: 'pending',
      })
      .select()
      .single();
    
    if (adError) {
      console.error('Error creating advertisement record:', adError);
      return NextResponse.json(
        { error: 'Failed to create advertisement record' },
        { status: 500 }
      );
    }
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Advertisement - ${durationName}`,
              description: `${companyName} - Website Advertisement for ${durationName}`,
              images: [publicUrl],
            },
            unit_amount: price * 100, // Convert to cents/pence
          },
          quantity: 1,
        },
      ],
      metadata: {
        advertisementId: adData.id,
      },
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/advertise/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/advertise?canceled=true`,
    });
    
    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 