const API_URL = 'https://unite-tools-api.vercel.app/api/feedback';

const LABELS = {
  bug:        ['bug'],
  suggestion: ['enhancement'],
  other:      ['feedback']
};

let selectedType = 'bug';

// ── Type selector ──
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedType = btn.dataset.type;
  });
});

// ── Form submit ──
document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('feedbackTitle').value.trim();
  const body  = document.getElementById('feedbackBody').value.trim();
  const btn   = document.getElementById('submitBtn');

  if (!title || !body) {
    showStatus('error', t('feedback_error_empty'));
    return;
  }

  btn.disabled    = true;
  btn.textContent = t('feedback_sending');
  clearStatus();

  const typeLabel    = t('feedback_type_' + selectedType);
  const submittedVia = t('feedback_submitted_via');
  const fullBody     = `**Type :** ${typeLabel}\n\n---\n\n${body}\n\n---\n*${submittedVia}*`;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body: fullBody,
        labels: LABELS[selectedType]
      })
    });

    if (res.ok) {
      showStatus('success', t('feedback_success'));
      document.getElementById('feedbackForm').reset();
      resetTypeSelector();
    } else {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || t('feedback_error_generic'));
    }
  } catch (err) {
    showStatus('error', err.message || t('feedback_error_generic'));
  }

  btn.disabled    = false;
  btn.textContent = t('feedback_submit_btn');
});

function showStatus(type, msg) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.className   = `status-msg ${type}`;
}

function clearStatus() {
  const el = document.getElementById('statusMsg');
  el.className     = 'status-msg';
  el.style.display = 'none';
}

function resetTypeSelector() {
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-type="bug"]').classList.add('active');
  selectedType = 'bug';
}

// ── Helper t() local (utilise window.translations chargé par navbar.js) ──
function t(key) {
  const lang = localStorage.getItem('lang') || 'fr';
  return window.translations?.[lang]?.[key] ?? key;
}