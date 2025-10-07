// src/app/api/earn/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { user_id, business_id, amount_cents } = await req.json();

    if (!user_id || !business_id || !amount_cents) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (amount_cents <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Get active program for this business
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('earn_rate_ppd, active')
      .eq('business_id', business_id)
      .eq('active', true)
      .single();

    if (programError || !program) {
      return NextResponse.json(
        { error: 'No active program found for this business' },
        { status: 404 }
      );
    }

    // Calculate points: floor(dollars * earn_rate)
    const dollars = amount_cents / 100;
    const pointsEarned = Math.floor(dollars * program.earn_rate_ppd);

    if (pointsEarned <= 0) {
      return NextResponse.json(
        { error: 'Amount too small to earn points' },
        { status: 400 }
      );
    }

    // Get staff user ID if authenticated
    const authHeader = req.headers.get('authorization');
    let staffUserId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: staffData } = await supabase
          .from('business_users')
          .select('id')
          .eq('email', user.email)
          .eq('business_id', business_id)
          .single();
        
        staffUserId = staffData?.id || null;
      }
    }

    // Insert into point ledger
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from('point_ledger')
      .insert({
        user_id,
        business_id,
        delta_points: pointsEarned,
        amount_cents,
        reason: 'earn',
        staff_user_id: staffUserId,
      })
      .select()
      .single();

    if (ledgerError) {
      console.error('Ledger error:', ledgerError);
      return NextResponse.json(
        { error: 'Failed to credit points' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      points_earned: pointsEarned,
      ledger_id: ledgerEntry.id,
      amount_cents,
    });
  } catch (error) {
    console.error('Error earning points:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}