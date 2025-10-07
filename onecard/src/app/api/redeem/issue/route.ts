// src/app/api/redeem/issue/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { user_id, reward_id } = await req.json();

    if (!user_id || !reward_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get reward details
    const { data: reward, error: rewardError } = await supabase
      .from('rewards_catalog')
      .select('business_id, cost_points, active')
      .eq('id', reward_id)
      .single();

    if (rewardError || !reward) {
      return NextResponse.json(
        { error: 'Reward not found' },
        { status: 404 }
      );
    }

    if (!reward.active) {
      return NextResponse.json(
        { error: 'Reward is no longer available' },
        { status: 400 }
      );
    }

    // Check user's balance
    const { data: balance } = await supabase
      .from('v_balances')
      .select('balance')
      .eq('user_id', user_id)
      .eq('business_id', reward.business_id)
      .single();

    if (!balance || balance.balance < reward.cost_points) {
      return NextResponse.json(
        { error: 'Insufficient points' },
        { status: 400 }
      );
    }

    // Generate unique token
    const redeemToken = crypto.randomBytes(16).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(redeemToken)
      .digest('hex');

    // Create redemption record (expires in 2 minutes)
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    const { data: redemption, error: insertError } = await supabase
      .from('redemptions')
      .insert({
        user_id,
        business_id: reward.business_id,
        reward_id,
        status: 'issued',
        redeem_token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create redemption' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      redeem_token: redeemToken,
      expires_at: expiresAt.toISOString(),
      redemption_id: redemption.id,
    });
  } catch (error) {
    console.error('Error issuing redeem token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}