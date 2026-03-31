import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Find items expiring within 7 days (covers the 3-day warning window + already expired)
    const sevenDaysOut = new Date(today);
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
    const futureDate = sevenDaysOut.toISOString().split('T')[0];

    const { data: expiringItems, error } = await supabase
      .from('inventory_items')
      .select('id, name, user_id, expiration_date, category')
      .not('expiration_date', 'is', null)
      .lte('expiration_date', futureDate)
      .order('expiration_date', { ascending: true });

    if (error) {
      console.error('Error fetching expiring items:', error);
      return new Response(JSON.stringify({ error: 'Failed to check expirations' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let notificationsCreated = 0;

    for (const item of expiringItems || []) {
      const expDate = new Date(item.expiration_date);
      const diffMs = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Only notify for: expired, today, or within 3 days
      if (diffDays > 3) continue;

      let title: string;
      let message: string;

      if (diffDays < 0) {
        title = `⚠️ ${item.name} has expired!`;
        message = `Expired ${Math.abs(diffDays)} day(s) ago on ${expDate.toLocaleDateString()}.`;
      } else if (diffDays === 0) {
        title = `⚠️ ${item.name} expires today!`;
        message = `This item expires today. Please check and take action.`;
      } else {
        title = `🔴 ${item.name} expires in ${diffDays} day(s)`;
        message = `Expiring on ${expDate.toLocaleDateString()}. Use it soon!`;
      }

      // Check if we already sent a notification for this item TODAY (daily dedup)
      const todayStart = new Date(todayStr + 'T00:00:00Z').toISOString();
      const todayEnd = new Date(todayStr + 'T23:59:59Z').toISOString();

      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('item_id', item.id)
        .eq('user_id', item.user_id)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .limit(1);

      if (existing && existing.length > 0) {
        continue; // Already notified today
      }

      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: item.user_id,
          item_id: item.id,
          title,
          message,
        });

      if (!insertError) {
        notificationsCreated++;
      } else {
        console.error('Error creating notification:', insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: expiringItems?.length || 0,
        notificationsCreated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Check expirations error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
