const API_URL = 'https://unite-tools-api.vercel.app/api/feedback';

const LABELS = {
  bug:        ['bug'],
  suggestion: ['enhancement'],
  other:      ['feedback']
};

let selectedType  = 'bug';
let uploadedImages = []; // { name, dataUrl }

// ── Type selector ──
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedType = btn.dataset.type;
  });
});

// ── Image upload ──
const dropZone   = document.getElementById('dropZone');
const imageInput = document.getElementById('imageInput');

if (dropZone && imageInput) {
  dropZone.addEventListener('click', () => imageInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
  });

  imageInput.addEventListener('change', () => {
    handleFiles(Array.from(imageInput.files));
    imageInput.value = '';
  });
}

function handleFiles(files) {
  const MAX_SIZE = 20 * 1024 * 1024; // 20 Mo max avant compression
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_SIZE) return;
    if (uploadedImages.length >= 5) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      compressImage(e.target.result, file.name, (compressed) => {
        uploadedImages.push({ name: file.name, dataUrl: compressed });
        renderPreviews();
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Redimensionne et compresse via Canvas.
 * Max 1280px, JPEG 75% → ~100-300 Ko typiquement.
 * Les PNG sont repassés en JPEG si encore trop lourds après redimensionnement.
 */
function compressImage(dataUrl, filename, callback) {
  const img = new Image();
  img.onload = () => {
    const MAX_DIM = 1280;
    let { width, height } = img;

    if (width > MAX_DIM || height > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
      width  = Math.round(width  * ratio);
      height = Math.round(height * ratio);
    }

    const canvas  = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);

    // Essai PNG d'abord pour les screenshots nets
    const isPng = filename.toLowerCase().endsWith('.png');
    let result   = isPng
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', 0.75);

    // > ~400 Ko en base64 → forcer JPEG 75%
    if (result.length > 550_000) {
      result = canvas.toDataURL('image/jpeg', 0.75);
    }

    // Encore trop lourd → JPEG 60%
    if (result.length > 550_000) {
      result = canvas.toDataURL('image/jpeg', 0.60);
    }

    callback(result);
  };
  img.src = dataUrl;
}

function renderPreviews() {
  const container = document.getElementById('imagePreviews');
  if (!container) return;
  container.innerHTML = '';
  uploadedImages.forEach((img, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'preview-item';
    wrap.innerHTML = `
      <img src="${img.dataUrl}" alt="${img.name}" title="${img.name}">
      <button class="preview-remove" data-idx="${i}" type="button">×</button>
    `;
    wrap.querySelector('.preview-remove').addEventListener('click', () => {
      uploadedImages.splice(i, 1);
      renderPreviews();
    });
    container.appendChild(wrap);
  });
}

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

  const fullBody = `**Type :** ${typeLabel}\n\n---\n\n${body}\n\n---\n*${submittedVia}*`;

  // Les images sont envoyées séparément — l'API les upload sur GitHub Assets
  // et les intègre comme vraies URLs dans l'issue
  const payload = {
    title,
    body: fullBody,
    labels: LABELS[selectedType],
    images: uploadedImages.map(img => ({ name: img.name, dataUrl: img.dataUrl }))
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showStatus('success', t('feedback_success'));
      document.getElementById('feedbackForm').reset();
      uploadedImages = [];
      renderPreviews();
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