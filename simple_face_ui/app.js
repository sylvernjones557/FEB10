const apiUrlInput = document.getElementById('apiUrl');
const serverStatus = document.getElementById('serverStatus');
const authStatus = document.getElementById('authStatus');

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const pingBtn = document.getElementById('pingBtn');

const video = document.getElementById('video');
const preview = document.getElementById('preview');
const startCamBtn = document.getElementById('startCamBtn');
const stopCamBtn = document.getElementById('stopCamBtn');
const snapBtn = document.getElementById('snapBtn');

const studentIdInput = document.getElementById('studentId');
const registerBtn = document.getElementById('registerBtn');
const registerLog = document.getElementById('registerLog');
const angleButtons = document.querySelectorAll('.angleBtn');

const intervalMsInput = document.getElementById('intervalMs');
const maxWidthInput = document.getElementById('maxWidth');
const scanOnceBtn = document.getElementById('scanOnceBtn');
const toggleScanBtn = document.getElementById('toggleScanBtn');
const recognizeLog = document.getElementById('recognizeLog');
const results = document.getElementById('results');

let stream = null;
let token = localStorage.getItem('sp_token') || '';
let scanning = false;
let scanTimer = null;

function setBadge(el, state, text) {
  el.className = `badge ${state}`;
  el.textContent = text;
}

function setAuthBadge() {
  if (token) {
    setBadge(authStatus, 'ok', 'Auth: signed in');
  } else {
    setBadge(authStatus, 'idle', 'Auth: signed out');
  }
}

function log(el, msg) {
  const time = new Date().toLocaleTimeString();
  el.textContent = `[${time}] ${msg}\n` + el.textContent;
}

async function pingServer() {
  const base = apiUrlInput.value.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/stats/institutional`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status === 401) {
      setBadge(serverStatus, 'warn', 'Server: auth required');
      return;
    }
    if (!res.ok) throw new Error('Server not ready');
    setBadge(serverStatus, 'ok', 'Server: online');
  } catch (err) {
    setBadge(serverStatus, 'bad', 'Server: offline');
  }
}

async function login() {
  const base = apiUrlInput.value.replace(/\/$/, '');
  const params = new URLSearchParams();
  params.append('username', usernameInput.value || 'admin');
  params.append('password', passwordInput.value || 'admin');

  try {
    const res = await fetch(`${base}/login/access-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    token = data.access_token;
    localStorage.setItem('sp_token', token);
    setAuthBadge();
    log(registerLog, 'Login successful.');
  } catch (err) {
    log(registerLog, `Login failed: ${err.message}`);
  }
}

function logout() {
  token = '';
  localStorage.removeItem('sp_token');
  setAuthBadge();
  log(registerLog, 'Logged out.');
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 20, max: 30 },
      },
    });
    video.srcObject = stream;
  } catch (err) {
    log(registerLog, 'Camera error: ' + err.message);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

function captureFrame() {
  const maxWidth = parseInt(maxWidthInput.value || '512', 10);
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  const targetWidth = Math.min(width, maxWidth);
  const targetHeight = Math.max(1, Math.round((height / width) * targetWidth));

  preview.width = targetWidth;
  preview.height = targetHeight;
  const ctx = preview.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  return new Promise((resolve) => {
    preview.toBlob((blob) => resolve(blob), 'image/jpeg', 0.72);
  });
}

async function registerFace(label = '') {
  if (!token) {
    log(registerLog, 'Please login first.');
    return;
  }
  const studentId = studentIdInput.value.trim();
  if (!studentId) {
    log(registerLog, 'Student ID required.');
    return;
  }
  if (!video.srcObject) {
    log(registerLog, 'Camera not started.');
    return;
  }

  const base = apiUrlInput.value.replace(/\/$/, '');
  const blob = await captureFrame();
  if (!blob) {
    log(registerLog, 'Frame capture failed.');
    return;
  }

  const form = new FormData();
  form.append('student_id', studentId);
  form.append('file', blob, 'face.jpg');

  try {
    const res = await fetch(`${base}/recognition/register-face`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed');
    }

    const data = await res.json();
    const suffix = label ? ` (${label})` : '';
    log(registerLog, `Registered ${data.student_id}${suffix}`);
  } catch (err) {
    log(registerLog, `Register error: ${err.message}`);
  }
}

function renderResults(matches) {
  results.innerHTML = '';
  if (!matches || matches.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'result';
    empty.textContent = 'No faces recognized';
    results.appendChild(empty);
    return;
  }

  matches.forEach((m) => {
    const card = document.createElement('div');
    card.className = 'result';
    const name = document.createElement('strong');
    name.textContent = m.student_id || 'unknown';
    const conf = document.createElement('span');
    const confidence = Math.max(0, Math.min(100, Math.round((1 - m.distance) * 100)));
    conf.textContent = `Confidence: ${confidence}%`;
    card.appendChild(name);
    card.appendChild(conf);
    results.appendChild(card);
  });
}

async function recognizeOnce() {
  if (!token) {
    log(recognizeLog, 'Please login first.');
    return;
  }
  if (!video.srcObject) {
    log(recognizeLog, 'Camera not started.');
    return;
  }

  const base = apiUrlInput.value.replace(/\/$/, '');
  const blob = await captureFrame();
  if (!blob) {
    log(recognizeLog, 'Frame capture failed.');
    return;
  }

  const form = new FormData();
  form.append('file', blob, 'frame.jpg');

  try {
    const res = await fetch(`${base}/recognition/recognize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Recognition failed');
    }

    const data = await res.json();
    if (data.matches && data.matches.length > 0) {
      log(recognizeLog, `Recognized ${data.matches.length} face(s).`);
    } else {
      log(recognizeLog, 'No matches.');
    }
    renderResults(data.matches);
  } catch (err) {
    log(recognizeLog, `Recognition error: ${err.message}`);
  }
}

function toggleAutoScan() {
  scanning = !scanning;
  toggleScanBtn.textContent = scanning ? 'Stop Auto Scan' : 'Start Auto Scan';

  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = null;
  }

  if (scanning) {
    const interval = Math.max(300, parseInt(intervalMsInput.value || '1100', 10));
    scanTimer = setInterval(recognizeOnce, interval);
  }
}

pingBtn.addEventListener('click', pingServer);
loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);
startCamBtn.addEventListener('click', startCamera);
stopCamBtn.addEventListener('click', stopCamera);
snapBtn.addEventListener('click', async () => {
  const blob = await captureFrame();
  if (blob) log(registerLog, 'Frame captured.');
});
registerBtn.addEventListener('click', () => registerFace('single'));
angleButtons.forEach((btn) => {
  btn.addEventListener('click', () => registerFace(btn.dataset.angle));
});
scanOnceBtn.addEventListener('click', recognizeOnce);
toggleScanBtn.addEventListener('click', toggleAutoScan);

setAuthBadge();
pingServer();
