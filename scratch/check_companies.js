// scratch/check_companies.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Checking companies in database...");
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, slug, created_at, subscription_status');

  if (error) {
    console.error("Error fetching companies:", error);
    return;
  }

  console.log("Total companies:", companies.length);
  companies.forEach(c => {
    console.log(`- ID: ${c.id} | Name: ${c.name} | Slug: ${c.slug} | Status: ${c.subscription_status}`);
  });
}

run();
