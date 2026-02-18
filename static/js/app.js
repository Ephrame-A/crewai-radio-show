/**
 * The Daily Signal — Dashboard JavaScript
 * =========================================
 * Handles pipeline control, polling, and UI updates.
 */

// --- State ---
let pollingInterval = null;
let isRunning = false;

// --- Clock ---
function updateClock() {
    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', options);
    document.getElementById('clock').textContent = `${dateStr} • ${timeStr}`;
}
setInterval(updateClock, 1000);
updateClock();

// --- Pipeline Control ---
async function startPipeline() {
    const topicInput = document.getElementById('topicInput');
    const topic = topicInput.value.trim();

    if (!topic) {
        showToast('⚠️', 'Please enter a show topic!');
        topicInput.focus();
        return;
    }

    if (isRunning) {
        showToast('⏳', 'Pipeline is already running!');
        return;
    }

    const btn = document.getElementById('generateBtn');
    btn.disabled = true;
    btn.classList.add('loading');
    isRunning = true;

    // Reset UI
    resetPipelineUI();
    clearScript();
    clearAudio();

    try {
        const response = await fetch('/api/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to start pipeline');
        }

        showToast('🚀', `Pipeline started for "${topic}"`);
        startPolling();

    } catch (error) {
        showToast('❌', error.message);
        btn.disabled = false;
        btn.classList.remove('loading');
        isRunning = false;
    }
}

// --- Polling ---
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(pollStatus, 2000);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

async function pollStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        updateGlobalStatus(data.status);
        updatePipelineSteps(data.steps);

        if (data.status === 'complete') {
            stopPolling();
            isRunning = false;
            resetButton();
            showToast('🎉', 'Show generated successfully!');
            loadScript();
            loadAudio();
        } else if (data.status === 'error') {
            stopPolling();
            isRunning = false;
            resetButton();
            showToast('❌', `Error: ${data.error}`);
        }

    } catch (error) {
        console.error('Polling error:', error);
    }
}

// --- UI Updates ---
function updateGlobalStatus(status) {
    const badge = document.getElementById('globalStatus');
    const text = badge.querySelector('.status-text');

    badge.className = 'status-badge';

    switch (status) {
        case 'running':
            badge.classList.add('running');
            text.textContent = 'Generating...';
            break;
        case 'complete':
            text.textContent = 'Complete';
            break;
        case 'error':
            badge.classList.add('error');
            text.textContent = 'Error';
            break;
        default:
            text.textContent = 'Ready';
    }
}

function updatePipelineSteps(steps) {
    const stepElements = document.querySelectorAll('.pipeline-step');

    steps.forEach((step, index) => {
        if (stepElements[index]) {
            const el = stepElements[index];
            const pill = el.querySelector('.pill');

            // Reset classes
            el.classList.remove('active', 'complete', 'error');

            switch (step.status) {
                case 'running':
                    el.classList.add('active');
                    pill.className = 'pill running';
                    pill.textContent = 'Running';
                    break;
                case 'complete':
                    el.classList.add('complete');
                    pill.className = 'pill complete';
                    pill.textContent = 'Done';
                    break;
                case 'error':
                    el.classList.add('error');
                    pill.className = 'pill error';
                    pill.textContent = 'Error';
                    break;
                default:
                    pill.className = 'pill pending';
                    pill.textContent = 'Pending';
            }
        }
    });
}

function resetPipelineUI() {
    const stepElements = document.querySelectorAll('.pipeline-step');
    stepElements.forEach(el => {
        el.classList.remove('active', 'complete', 'error');
        const pill = el.querySelector('.pill');
        pill.className = 'pill pending';
        pill.textContent = 'Pending';
    });
}

function resetButton() {
    const btn = document.getElementById('generateBtn');
    btn.disabled = false;
    btn.classList.remove('loading');
}

// --- Script Display ---
async function loadScript() {
    try {
        const response = await fetch('/api/script');
        const data = await response.json();

        if (data.script) {
            renderScript(data.script);
        }
    } catch (error) {
        console.error('Failed to load script:', error);
    }
}

function renderScript(scriptText) {
    const container = document.getElementById('scriptContainer');
    container.innerHTML = '';

    const lines = scriptText.split('\n');
    let renderedAny = false;

    lines.forEach((line, index) => {
        line = line.trim();
        if (!line) return;

        const alexMatch = line.match(/^Alex\s*:\s*(.+)/i);
        const samMatch = line.match(/^Sam\s*:\s*(.+)/i);

        if (alexMatch) {
            const div = createScriptLine('Alex', alexMatch[1], 'alex', index);
            container.appendChild(div);
            renderedAny = true;
        } else if (samMatch) {
            const div = createScriptLine('Sam', samMatch[1], 'sam', index);
            container.appendChild(div);
            renderedAny = true;
        }
    });

    if (!renderedAny) {
        // If no Alex/Sam lines found, show raw text
        const div = document.createElement('div');
        div.style.padding = '16px';
        div.style.color = 'var(--text-secondary)';
        div.style.fontSize = '0.85rem';
        div.style.whiteSpace = 'pre-wrap';
        div.style.fontFamily = "'JetBrains Mono', monospace";
        div.textContent = scriptText;
        container.appendChild(div);
    }
}

function createScriptLine(speaker, text, className, index) {
    const div = document.createElement('div');
    div.className = `script-line ${className}`;
    div.style.animationDelay = `${index * 0.05}s`;

    div.innerHTML = `
        <span class="speaker-tag">${speaker}</span>
        <span class="script-text">${escapeHtml(text)}</span>
    `;

    return div;
}

function clearScript() {
    const container = document.getElementById('scriptContainer');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🎭</div>
            <h3>Generating Script...</h3>
            <p>The agents are working on your show</p>
        </div>
    `;
}

// --- Audio Player ---
async function loadAudio() {
    try {
        const response = await fetch('/api/audio', { method: 'HEAD' });
        if (!response.ok) {
            clearAudio();
            return;
        }

        const container = document.getElementById('audioPlayerContainer');
        const audioUrl = `/api/audio?t=${Date.now()}`;

        container.innerHTML = `
            <div class="audio-player-wrapper bounce-in">
                <audio controls preload="auto" id="audioPlayer" style="width: 100%; border-radius: 12px; margin-bottom: 12px;">
                    <source src="${audioUrl}" type="audio/mpeg">
                    <source src="${audioUrl}" type="audio/wav">
                    Your browser does not support the audio element.
                </audio>
                <div style="text-align: center; margin-bottom: 15px;">
                    <a href="${audioUrl}" download="daily_show_the_signal.wav" class="btn-icon-sm" style="display: inline-flex; width: auto; padding: 0 16px; gap: 8px; text-decoration: none; font-size: 0.8rem; color: var(--text-primary);">
                        <span>📥</span> Download Audio File
                    </a>
                </div>
                <div class="audio-meta">
                    <span>🎙️ The Daily Signal — Today's Show</span>
                    <span id="audioDate">${new Date().toLocaleTimeString()}</span>
                </div>
            </div>
        `;

        // Automatically try to play if possible
        const player = document.getElementById('audioPlayer');
        player.play().catch(() => console.log('Autoplay blocked by browser policy'));
    } catch (e) {
        clearAudio();
    }
}

function clearAudio() {
    const container = document.getElementById('audioPlayerContainer');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🔇</div>
            <h3>No Audio Yet</h3>
            <p>Wait for the generation to finish</p>
        </div>
    `;
}

// --- Copy Script ---
async function copyScript() {
    try {
        const response = await fetch('/api/script');
        const data = await response.json();

        if (data.script) {
            await navigator.clipboard.writeText(data.script);
            showToast('✅', 'Script copied to clipboard!');
        } else {
            showToast('⚠️', 'No script available to copy');
        }
    } catch (error) {
        showToast('❌', 'Failed to copy script');
    }
}

// --- Toast ---
function showToast(icon, message) {
    const toast = document.getElementById('toast');
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMsg = document.getElementById('toastMessage');

    toastIcon.textContent = icon;
    toastMsg.textContent = message;

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- Utility ---
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Allow Enter to start pipeline
    document.getElementById('topicInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startPipeline();
    });

    // Check if there's already a script from a previous run
    fetch('/api/script')
        .then(r => r.json())
        .then(data => {
            if (data.script) renderScript(data.script);
        })
        .catch(() => { });

    // Check if there's already audio
    fetch('/api/audio', { method: 'HEAD' })
        .then(r => {
            if (r.ok) loadAudio();
        })
        .catch(() => { });
});
