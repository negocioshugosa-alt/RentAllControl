// update_trial.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Updating companies with missing trial ends at...");
  
  // Update the handle_new_user function in the database using raw SQL via RPC or just executing it
  // Since we can't easily execute raw DDL from client, I will write the SQL and tell the user to run it.
  
  // But for existing users, I can just fetch them and update them via the API!
  const { data: companies, error: fetchError } = await supabase
    .from('companies')
    .select('id, created_at')
    .is('subscription_trial_ends_at', null);
    
  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }
  
  console.log(`Found ${companies.length} companies missing trial expiration.`);
  
  for (const company of companies) {
    const trialEndsAt = new Date(new Date(company.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`Updating company ${company.id} trial to ${trialEndsAt}`);
    
    await supabase
      .from('companies')
      .update({ subscription_trial_ends_at: trialEndsAt })
      .eq('id', company.id);
  }
  
  console.log("Existing companies updated successfully.");
}

run();
