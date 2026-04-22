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

    // Find items expiring within 7 days
    const sevenDaysOut = new Date(today);
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
    const futureDate = sevenDaysOut.toISOString().split('T')[0];

    const { data: expiringItems, error } = await supabase
      .from('inventory_items')
      .select('id, name, user_id, expiration_date, category, created_at')
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
      // Electronics warranty reminders are handled separately below
      if (item.category === 'electronics') continue;

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

      // Dedup: check if already sent today
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

      if (existing && existing.length > 0) continue;

      const { error: insertError } = await supabase
        .from('notifications')
        .insert({ user_id: item.user_id, item_id: item.id, title, message });

      if (!insertError) notificationsCreated++;
      else console.error('Error creating notification:', insertError);
    }

    // === Snack & frozen expiry alerts: notify when expired but do NOT auto-remove ===
    const { data: expiredSnacksAndFrozen } = await supabase
      .from('inventory_items')
      .select('id, name, user_id, expiration_date, subcategory')
      .in('subcategory', ['snacks', 'frozen'])
      .not('expiration_date', 'is', null)
      .lt('expiration_date', todayStr)
      .gt('quantity', 0);

    let snackNotifications = 0;
    for (const item of expiredSnacksAndFrozen || []) {
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

      if (existing && existing.length > 0) continue;

      const expDate = new Date(item.expiration_date);
      const icon = item.subcategory === 'frozen' ? '🧊' : '🍿';
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: item.user_id,
          item_id: item.id,
          title: `${icon} ${item.name} has expired!`,
          message: `This ${item.subcategory} item expired on ${expDate.toLocaleDateString()}. Please review and remove it from your inventory if needed.`,
        });

      if (!insertError) snackNotifications++;
    }

    // === Warranty reminder alerts: notify before warranty expires for electronics ===
    // Reminders sent at 30, 14, 7, 3, and 1 days before warranty expiry, plus on expiry day
    const WARRANTY_REMINDER_DAYS = [30, 14, 7, 3, 1, 0];
    const maxReminder = Math.max(...WARRANTY_REMINDER_DAYS);
    const warrantyHorizon = new Date(today);
    warrantyHorizon.setDate(warrantyHorizon.getDate() + maxReminder);
    const warrantyHorizonStr = warrantyHorizon.toISOString().split('T')[0];

    const { data: warrantyItems } = await supabase
      .from('inventory_items')
      .select('id, name, user_id, expiration_date, category')
      .eq('category', 'electronics')
      .not('expiration_date', 'is', null)
      .gte('expiration_date', todayStr)
      .lte('expiration_date', warrantyHorizonStr);

    let warrantyNotifications = 0;
    for (const item of warrantyItems || []) {
      const expDate = new Date(item.expiration_date);
      const diffMs = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Only fire on exact reminder thresholds
      if (!WARRANTY_REMINDER_DAYS.includes(diffDays)) continue;

      const todayStart = new Date(todayStr + 'T00:00:00Z').toISOString();
      const todayEnd = new Date(todayStr + 'T23:59:59Z').toISOString();

      // Dedup: skip if any notification already exists today for this item
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('item_id', item.id)
        .eq('user_id', item.user_id)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .limit(1);

      if (existing && existing.length > 0) continue;

      let title: string;
      let message: string;
      if (diffDays === 0) {
        title = `🛡️ ${item.name} warranty expires today!`;
        message = `The warranty on this item ends today (${expDate.toLocaleDateString()}). Register any claims before it lapses.`;
      } else {
        title = `🛡️ ${item.name} warranty expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
        message = `Warranty ends ${expDate.toLocaleDateString()}. Review coverage or extend it while you still can.`;
      }

      const { error: insertError } = await supabase
        .from('notifications')
        .insert({ user_id: item.user_id, item_id: item.id, title, message });

      if (!insertError) warrantyNotifications++;
      else console.error('Error creating warranty notification:', insertError);
    }

    // === Produce auto-delete prompt: notify for produce items older than 10 days ===
    const tenDaysAgo = new Date(today);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const tenDaysAgoStr = tenDaysAgo.toISOString();

    const { data: oldProduce } = await supabase
      .from('inventory_items')
      .select('id, name, user_id, created_at')
      .eq('category', 'produce')
      .lt('created_at', tenDaysAgoStr)
      .gt('quantity', 0);

    let produceNotifications = 0;
    for (const item of oldProduce || []) {
      const ageMs = today.getTime() - new Date(item.created_at).getTime();
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

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

      if (existing && existing.length > 0) continue;

      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: item.user_id,
          item_id: item.id,
          title: `🥬 ${item.name} is ${ageDays} days old`,
          message: `This produce was added ${ageDays} days ago. Consider using it up or removing it from inventory.`,
        });

      if (!insertError) produceNotifications++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: expiringItems?.length || 0,
        notificationsCreated,
        snackNotifications,
        warrantyNotifications,
        produceNotifications,
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