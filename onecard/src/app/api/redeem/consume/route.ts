// src/app/api/redeem/consume/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { redeem_token, business_id } = await req.json();

    if (!redeem_token || !business_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Hash the token to look it up
    const tokenHash = crypto
      .createHash('sha256')
      .update(redeem_token)
      .digest('hex');

    // Find the redemption
    const { data: redemption, error: redemptionError } = await supabase
      .from('redemptions')
      .select(`
        id,
        user_id,
        business_id,
        reward_id,
        status,
        expires_at,
        rewards_catalog (
          label,
          cost_points
        )
      `)
      .eq('redeem_token_hash', tokenHash)
      .single();

    if (redemptionError || !redemption) {
      return NextResponse.json(
        { error: 'Invalid redeem code' },
        { status: 404 }
      );
    }

    // Verify business matches
    if (redemption.business_id !== business_id) {
      return NextResponse.json(
        { error: 'Redeem code not valid for this business' },
        { status: 400 }
      );
    }

    // Check if already consumed
    if (redemption.status === 'consumed') {
      return NextResponse.json(
        { error: 'Redeem code already used' },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(redemption.expires_at) < new Date()) {
      // Mark as void
      await supabase
        .from('redemptions')
        .update({ status: 'void' })
        .eq('id', redemption.id);

      return NextResponse.json(
        { error: 'Redeem code expired' },
        { status: 400 }
      );
    }

    // Check user's balance
    const { data: balance } = await supabase
      .from('v_balances')
      .select('balance')
      .eq('user_id', redemption.user_id)
      .eq('business_id', business_id)
      .single();

    const costPoints = redemption.rewards_catalog?.cost_points || 0;

    if (!balance || balance.balance < costPoints) {
      return NextResponse.json(
        { error: 'Insufficient points' },
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

    // Deduct points in ledger
    const { error: ledgerError } = await supabase
      .from('point_ledger')
      .insert({
        user_id: redemption.user_id,
        business_id,
        delta_points: -costPoints,
        reason: 'redeem',
        staff_user_id: staffUserId,
        notes: `Redeemed: ${redemption.rewards_catalog?.label}`,
      });

    if (ledgerError) {
      console.error('Ledger error:', ledgerError);
      return NextResponse.json(
        { error: 'Failed to deduct points' },
        { status: 500 }
      );
    }

    // Mark redemption as consumed
    const { error: updateError } = await supabase
      .from('redemptions')
      .update({
        status: 'consumed',
        consumed_at: new Date().toISOString(),
        staff_user_id: staffUserId,
      })
      .eq('id', redemption.id);

    if (updateError) {
      console.error('Update error:', updateError);
      // Points already deducted, but marking failed - log this
    }

    return NextResponse.json({
      success: true,
      reward_label: redemption.rewards_catalog?.label,
      points_deducted: costPoints,
    });
  } catch (error) {
    console.error('Error consuming redeem token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}