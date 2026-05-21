const { parse } = require('node-html-parser');
const fs = require('fs');

require('dotenv').config(); // Pour les tests locaux

// --- 1. Parse update.html ---
const html = fs.readFileSync('update.html', 'utf-8');
const root = parse(html);

const entries = root.querySelectorAll('.update-entry');
if (!entries.length) {
  console.error('No entries found in update.html');
  process.exit(1);
}

const latest = entries[0];
const version = latest.querySelector('.update-version')?.text?.trim() ?? 'N/A';
const date = latest.querySelector('.update-date')?.text?.trim() ?? '';

const sections = [];
latest.querySelectorAll('.change-section').forEach(section => {
  const title = section.querySelector('.change-section-title')?.text?.trim() ?? '';
  const items = [];
  section.querySelectorAll('.change-item').forEach(item => {
    const category = item.querySelector('.change-category')?.text?.trim() ?? '';
    const rawText = item.text.replace(category, '').trim();
    items.push({ category, text: rawText });
  });
  if (items.length) sections.push({ title, items });
});

console.log('=== Detected version:', version, '===');

// --- 2. Formatting ---
const categoryEmoji = { New: '🆕', Fix: '🔧', Update: '⚡', Design: '🎨', WIP: '🚧' };

const allCategories = sections.flatMap(s => s.items.map(i => i.category));
const hasNew = allCategories.includes('New');
const hasFix = allCategories.includes('Fix');
const embedColor = hasNew ? 0x6C63FF : hasFix ? 0xF0A500 : 0x5865F2;

const newCount = allCategories.filter(c => c === 'New').length;
const fixCount = allCategories.filter(c => c === 'Fix').length;
const updateCount = allCategories.filter(c => c === 'Update').length;

const summaryParts = [];
if (newCount) summaryParts.push(`**${newCount}** new feature${newCount > 1 ? 's' : ''}`);
if (fixCount) summaryParts.push(`**${fixCount}** fix${fixCount > 1 ? 'es' : ''}`);
if (updateCount) summaryParts.push(`**${updateCount}** update${updateCount > 1 ? 's' : ''}`);

const summary = summaryParts.join(', ');

// Role ping
const roleId = process.env.DISCORD_ROLE_ID;
const ping = roleId ? `<@&${roleId}> ` : '';

const fields = sections.slice(0, 5).map(s => ({
  name: s.title,
  value: s.items.slice(0, 6).map(i => {
    const emoji = categoryEmoji[i.category] ?? '•';
    return `${emoji} ${i.text}`;
  }).join('\n') + (s.items.length > 6 ? `\n*...and ${s.items.length - 6} more*` : ''),
  inline: false
}));

// --- 3. Discord Payload ---
const payload = {
  content: `${ping}🎮 **Unite Tools ${version}** has just been released! ${summary ? `Here's what's new: ${summary}.` : ''}\n🔗 https://unite-tools.com/update.html`,
  
  embeds: [{
    title: `Changelog — ${version}`,
    url: 'https://unite-tools.com/update.html',
    color: embedColor,
    fields,
    footer: { text: `Released on ${date} • unite-tools.com` }
  }]
};

// --- 4. Send to Discord ---
async function run() {
  const res = await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    console.log('✅ Discord message posted successfully!');
  } else {
    const err = await res.text();
    console.error('❌ Discord error:', err);
    process.exit(1);
  }
}

run().catch(e => { 
  console.error(e); 
  process.exit(1); 
});