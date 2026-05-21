const { parse } = require('node-html-parser');
const fs = require('fs');

// --- 1. Parse update.html ---
const html = fs.readFileSync('update.html', 'utf-8');
const root = parse(html);

const entries = root.querySelectorAll('.update-entry');
if (!entries.length) {
  console.error('Aucune entrée trouvée dans update.html');
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

console.log('=== Version détectée:', version, '===');

// --- 2. Formatage des champs Discord ---
const categoryEmoji = { New: '🆕', Fix: '🔧', Update: '⚡', Design: '🎨', WIP: '🚧' };

const allCategories = sections.flatMap(s => s.items.map(i => i.category));
const hasNew = allCategories.includes('New');
const hasFix = allCategories.includes('Fix');
const embedColor = hasNew ? 0x6C63FF : hasFix ? 0xF0A500 : 0x5865F2;

const newCount = allCategories.filter(c => c === 'New').length;
const fixCount = allCategories.filter(c => c === 'Fix').length;
const updateCount = allCategories.filter(c => c === 'Update').length;

// Résumé automatique sans IA
const summaryParts = [];
if (newCount) summaryParts.push(`**${newCount}** nouveauté${newCount > 1 ? 's' : ''}`);
if (fixCount) summaryParts.push(`**${fixCount}** correction${fixCount > 1 ? 's' : ''}`);
if (updateCount) summaryParts.push(`**${updateCount}** mise${updateCount > 1 ? 's' : ''} à jour`);
const summary = summaryParts.join(', ');

const fields = sections.slice(0, 5).map(s => ({
  name: s.title,
  value: s.items.slice(0, 6).map(i => {
    const emoji = categoryEmoji[i.category] ?? '•';
    return `${emoji} ${i.text}`;
  }).join('\n') + (s.items.length > 6 ? `\n*...et ${s.items.length - 6} de plus*` : ''),
  inline: false
}));

// --- 3. Payload Discord ---
const payload = {
  content: `🎮 **Unite Tools ${version}** vient de sortir ! ${summary ? `Au programme : ${summary}.` : ''}\n🔗 https://unite-tools.com/update.html`,
  embeds: [{
    title: `Changelog — ${version}`,
    url: 'https://unite-tools.com/update.html',
    color: embedColor,
    fields,
    footer: { text: `Publié le ${date} • unite-tools.com` }
  }]
};

// --- 4. Post sur Discord ---
async function run() {
  const res = await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    console.log('✅ Message Discord posté avec succès !');
  } else {
    const err = await res.text();
    console.error('❌ Erreur Discord:', err);
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });