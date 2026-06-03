import { supabase } from '../services/supabaseClient.js';
import { ensureThemeLoaded, getCompanyName } from '../shared/theme.js';
import * as openpgp from 'openpgp';

const sacrraState = {
    view: 'overview',
    environment: 'PRODUCTION',
    loading: false,
    members: [],
    submissions: [],
    rejections: [],
    stats: {
        score: '0%',
        activeIssues: '0',
        totalRecords: '0',
        bureauAcceptance: {
            experian: 'PENDING',
            transunion: 'PENDING',
            xds: 'PENDING'
        }
    },
    exportSettings: {
        type: 'MONTHLY', 
        prefix: 'D'     
    }
};

export async function init(container) {
    const theme = await ensureThemeLoaded();
    const companyName = getCompanyName(theme) || 'Company';
    const logoUrl = (theme?.company_logo_url || '').trim();
    const logoMarkup = logoUrl
        ? `<img src="${logoUrl}" alt="${companyName}" class="h-12 w-auto object-contain mb-2">`
        : `<div class="text-base font-black text-slate-900 uppercase tracking-tight mb-2">${companyName}</div>`;

    container.innerHTML = `
        <div id="sacrra-portal" class="flex min-h-screen bg-[#f5f3ff] font-sans text-slate-800">
            <aside id="sacrra-sidebar" class="fixed left-0 top-0 h-full w-[280px] z-40 bg-white border-r border-slate-200 shadow-[20px_0_40px_rgba(0,0,0,0.02)] flex flex-col py-8">
                <div class="px-8 mb-10">
                    ${logoMarkup}
                    <div class="flex items-center gap-2 px-1">
                        <span class="w-2 h-2 rounded-full" style="background-color:var(--color-primary)"></span>
                        <p class="text-[10px] font-black uppercase tracking-[0.2em]" style="color:var(--color-primary)">Compliance Engine</p>
                    </div>
                </div>

                <div class="px-4 mb-8">
                    <button onclick="window.location.href='/admin/dashboard'" class="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-500 hover:bg-slate-50 transition-all group">
                        <span class="material-symbols-outlined group-hover:text-slate-900">home</span>
                        <span class="font-black text-xs uppercase tracking-widest group-hover:text-slate-900">Return Home</span>
                    </button>
                </div>

                <nav id="sacrra-nav" class="flex-1 px-4 space-y-2"></nav>
                <div class="px-6 pt-6 border-t border-slate-100 mt-auto">
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">System Status</p>
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span class="text-xs font-bold text-slate-700">700v2 Engine Live</span>
                        </div>
                    </div>
                </div>
            </aside>

            <main class="flex-1 ml-[280px] min-h-screen flex flex-col">
                <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-10 py-6 flex justify-between items-center">
                    <div id="sacrra-header-title">
                        <h2 class="text-2xl font-black text-slate-900 tracking-tight">Compliance Dashboard</h2>
                        <p class="text-sm font-medium text-slate-500">Fixed-Width Formatting Engine</p>
                    </div>
                    <div class="flex items-center gap-4">
                        <button onclick="window.refreshSacrraData()" class="p-3 bg-slate-50 text-slate-600 hover:bg-white hover:shadow-md rounded-xl transition-all">
                            <span class="material-symbols-outlined ${sacrraState.loading ? 'animate-spin' : ''}">refresh</span>
                        </button>
                        <button onclick="window.showExportModal()" class="flex items-center gap-2 px-6 py-3 bg-[#a04100] text-white rounded-xl font-bold shadow-lg shadow-[var(--color-primary)]/20 hover:translate-y-[-2px] transition-all">
                            <span class="material-symbols-outlined text-lg">ios_share</span>
                            Generate Compliance File
                        </button>
                    </div>
                </header>

                <div id="sacrra-canvas" class="p-10 flex-1"></div>
            </main>
        </div>

        <div id="export-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm hidden opacity-0 transition-all duration-300">
            <div class="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 transform scale-95 transition-all">
                <div class="flex justify-between items-center mb-8">
                    <h3 class="text-2xl font-black text-slate-900">Export Parameters</h3>
                    <button onclick="window.hideExportModal()" class="text-slate-400 hover:text-slate-900 transition-all">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="space-y-6">
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Submission Type</label>
                        <div class="grid grid-cols-2 gap-4">
                            <button onclick="window.setExportType('MONTHLY')" id="btn-monthly" class="p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2">
                                <span class="material-symbols-outlined text-3xl">calendar_month</span>
                                <span class="font-bold text-slate-900">Monthly</span>
                            </button>
                            <button onclick="window.setExportType('DAILY')" id="btn-daily" class="p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2">
                                <span class="material-symbols-outlined text-3xl">timer</span>
                                <span class="font-bold text-slate-900">Daily</span>
                            </button>
                        </div>
                    </div>
                    <!-- Backdating: reporting period override -->
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                            Reporting Period
                            <span class="ml-1 font-normal text-slate-400 normal-case tracking-normal">(leave blank for current month)</span>
                        </label>
                        <input type="month" id="sacrra-backdate-month"
                            class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:outline-none bg-white"
                            style="--tw-ring-color:var(--color-primary)"
                            title="Select a past month to generate a backdated SACRRA submission">
                        <p class="text-[10px] text-slate-400 mt-1.5">Used for backdating submissions to correct prior-period data.</p>
                    </div>

                    <div id="daily-options" class="hidden">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Record Prefix</label>
                        <div class="flex gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                            <button onclick="window.setExportPrefix('R')" id="prefix-r" class="flex-1 py-3 rounded-xl font-bold text-xs">R (Registration)</button>
                            <button onclick="window.setExportPrefix('C')" id="prefix-c" class="flex-1 py-3 rounded-xl font-bold text-xs">C (Correction)</button>
                            <button onclick="window.setExportPrefix('D')" id="prefix-d" class="flex-1 py-3 rounded-xl font-bold text-xs">D (Data)</button>
                        </div>
                    </div>
                </div>
                <div class="mt-12 flex gap-4">
                    <button onclick="window.hideExportModal()" class="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                    <button onclick="window.generateSacrraFile()" class="flex-1 py-4 bg-[#a04100] text-white font-black rounded-2xl shadow-xl shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-95 transition-all">Download .TXT</button>
                </div>
            </div>
        </div>
    `;
    
    setupGlobalHandlers();

    try {
        await fetchData();
        renderView();
    } catch (e) {
        console.error("SACRRA Initialization Failed:", e);
    }
}

function setupGlobalHandlers() {
    window.switchSacrraView = (view) => { sacrraState.view = view; renderView(); };
    window.refreshSacrraData = async () => { await fetchData(); renderView(); };
    window.setExportType = (type) => { 
        sacrraState.exportSettings.type = type; 
        renderExportModalUI(); 
    };
    window.setExportPrefix = (prefix) => { 
        sacrraState.exportSettings.prefix = prefix; 
        renderExportModalUI(); 
    };
    window.showExportModal = () => { 
        const modal = document.getElementById('export-modal');
        modal.classList.remove('hidden');
        renderExportModalUI();
        setTimeout(() => { 
            modal.classList.remove('opacity-0'); 
            modal.children[0].classList.remove('scale-95'); 
        }, 10);
    };
    window.hideExportModal = () => {
        const modal = document.getElementById('export-modal');
        modal.classList.add('opacity-0');
        modal.children[0].classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    };

    window.resolveRejection = async (id) => {
        if (!confirm('Mark this rejection as resolved?')) return;
        await supabase.from('sacrra_rejections').update({
            resolved: true,
            resolved_at: new Date().toISOString()
        }).eq('id', id);
        await fetchData();
        renderView();
    };

    window.processBureauFile = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            const lines = content.split('\n');
            const newRejections = [];
            
            for (const line of lines) {
                if (line.startsWith('R') || line.startsWith('E')) { // Error/Rejection markers
                    const matchKey = line.substring(1, 41).trim();
                    const errorCode = line.substring(41, 45).trim();
                    const errorMessage = line.substring(45, 100).trim();
                    
                    if (matchKey && errorCode) {
                        newRejections.push({
                            match_key: matchKey,
                            error_code: errorCode,
                            error_message: errorMessage
                        });
                    }
                }
            }
            
            if (newRejections.length > 0) {
                await supabase.from('sacrra_rejections').insert(newRejections);
                alert(`Successfully parsed ${newRejections.length} bureau rejections.`);
                await fetchData();
                renderView();
            } else {
                alert("No rejection codes found in file.");
            }
        };
        reader.readAsText(file);
    };
}

async function fetchData() {
    sacrraState.loading = true;
    try {
        const [membersRes, historyRes, rejectionsRes] = await Promise.all([
            supabase.from('sacrra_700_view').select('*'),
            supabase.from('sacrra_submissions').select('*').order('created_at', { ascending: false }).limit(10),
            supabase.from('sacrra_rejections').select('*').eq('resolved', false)
        ]);
        
        if (membersRes.error) throw membersRes.error;
        
        sacrraState.members = (membersRes.data || []).map(m => ({
            ...m,
            isValidId: validateSAID(m.f10_id_number),
            // Match key = SRN (6 chars) + Account Number — used for bureau rejection linking
            matchKey: (m.f02_supplier_ref?.trim() || '').slice(0, 6).padEnd(6, ' ')
                    + (m.f40_account_number || m.internal_id || '').replace(/\s/g, '')
        }));
        
        sacrraState.submissions = historyRes.data || [];
        sacrraState.rejections = rejectionsRes.data || [];
        
        const total = sacrraState.members.length;
        const issues = sacrraState.members.filter(m => !m.isValidId).length;
        
        sacrraState.stats = {
            score: total > 0 ? `${(((total - issues) / total) * 100).toFixed(1)}%` : '100%',
            activeIssues: issues.toString(),
            totalRecords: total.toString(),
            bureauAcceptance: {
                experian:   sacrraState.submissions.some(s => s.status === 'ACCEPTED') ? 'VERIFIED' : 'PENDING',
                transunion: 'PENDING',
                xds:        'PENDING'
            }
        };
    } catch (e) {
        console.error("Data Load Error", e);
    } finally {
        sacrraState.loading = false;
    }
}

function validateSAID(id) {
    if (!id || id.trim().length !== 13) return false;
    let nCheck = 0, bEven = false;
    for (let n = id.trim().length - 1; n >= 0; n--) {
        let nDigit = parseInt(id.trim().charAt(n), 10);
        if (bEven && (nDigit *= 2) > 9) nDigit -= 9;
        nCheck += nDigit;
        bEven = !bEven;
    }
    return (nCheck % 10) === 0;
}

function renderView() {
    const nav = document.getElementById('sacrra-nav');
    const canvas = document.getElementById('sacrra-canvas');
    if (!nav || !canvas) return;

    nav.innerHTML = `
        <div class="px-6 mb-10">
            <div class="flex items-center gap-3 mb-8">
                <div class="w-10 h-10 bg-[#a04100] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[var(--color-primary)]/20">
                    <span class="material-symbols-outlined fill-1">account_balance</span>
                </div>
                <div>
                    <h1 class="text-sm font-black text-slate-900 uppercase tracking-tighter" id="sacrra-company-name"></h1>
                    <p class="text-[9px] font-bold uppercase tracking-widest" style="color:var(--color-primary)">Compliance Engine</p>
                </div>
            </div>
            <a href="index.html" class="w-full flex items-center gap-4 px-6 py-3 bg-slate-900 text-white rounded-xl shadow-xl shadow-slate-900/20 hover:scale-[1.02] transition-all mb-4">
                <span class="material-symbols-outlined text-sm">home</span>
                <span class="font-black text-[10px] uppercase tracking-widest">Return Home</span>
            </a>
        </div>
        ${renderNavItem('overview', 'dashboard', 'Dashboard')}
        ${renderNavItem('pipeline', 'account_tree', 'Submissions')}
        ${renderNavItem('parser', 'error', 'Rejections')}
    `;

    // Populate company name from theme (avoids hardcoding)
    const nameEl = document.getElementById('sacrra-company-name');
    if (nameEl) {
        ensureThemeLoaded().then(t => { nameEl.textContent = getCompanyName(t) || ''; });
    }

    switch (sacrraState.view) {
        case 'overview': renderOverview(canvas); break;
        case 'pipeline': renderPipeline(canvas); break;
        case 'parser': renderParser(canvas); break;
        default: renderOverview(canvas);
    }
}

function renderNavItem(view, icon, label) {
    const active = sacrraState.view === view;
    return `
        <button onclick="window.switchSacrraView('${view}')" class="w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? 'bg-[var(--color-primary)/10] text-[#a04100] shadow-sm shadow-[var(--color-primary)]/5' : 'text-slate-500 hover:bg-slate-50'}">
            <span class="material-symbols-outlined ${active ? 'fill-1' : ''}">${icon}</span>
            <span class="font-black text-xs uppercase tracking-widest">${label}</span>
            ${active ? '<div class="ml-auto w-1.5 h-1.5 rounded-full bg-[#a04100]"></div>' : ''}
        </button>
    `;
}

function renderOverview(container) {
    const total  = Number(sacrraState.stats.totalRecords) || 0;
    const issues = Number(sacrraState.stats.activeIssues) || 0;
    const clean  = total - issues;
    const scorePct = total > 0 ? Math.round((clean / total) * 100) : 100;
    // SVG donut: r=54 → circumference = 2π×54 ≈ 339.3
    const CIRC = 339.3;
    const dash = (scorePct / 100) * CIRC;

    container.innerHTML = `
        <div class="grid grid-cols-12 gap-8 mb-10">

            <!-- Compliance score ring -->
            <div class="col-span-12 lg:col-span-4 bg-gradient-to-br from-[#a04100] to-[#6a2b00] p-8 rounded-[32px] shadow-2xl shadow-[var(--color-primary)]/20 text-white relative overflow-hidden">
                <p class="text-white/70 font-bold uppercase tracking-widest text-[10px] mb-6">Compliance Score</p>
                <div class="flex items-center gap-6">
                    <div class="relative w-32 h-32 shrink-0">
                        <svg viewBox="0 0 120 120" class="w-full h-full -rotate-90">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="10"/>
                            <circle id="score-ring" cx="60" cy="60" r="54" fill="none"
                                stroke="white" stroke-width="10"
                                stroke-linecap="round"
                                stroke-dasharray="${CIRC}"
                                stroke-dashoffset="${CIRC}"
                                style="transition: stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)"/>
                        </svg>
                        <div class="absolute inset-0 flex flex-col items-center justify-center">
                            <span id="score-pct" class="text-2xl font-black text-white">0%</span>
                        </div>
                    </div>
                    <div>
                        <div class="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Clean records</div>
                        <div id="count-clean" class="text-4xl font-black">0</div>
                        <div class="text-white/60 text-xs mt-2">${issues} issue${issues !== 1 ? 's' : ''} detected</div>
                        <div class="flex items-center gap-2 text-white/80 text-xs font-bold mt-3">
                            <span class="material-symbols-outlined text-sm">verified</span>
                            Layout 700v2 · v2.8
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bureau health bars -->
            <div class="col-span-12 md:col-span-6 lg:col-span-4 bg-white p-8 rounded-[32px] border border-slate-200/60 shadow-sm">
                <div class="flex justify-between items-start mb-6">
                    <div class="w-12 h-12 bg-[var(--color-primary)/10] text-[#a04100] rounded-2xl flex items-center justify-center">
                        <span class="material-symbols-outlined">account_balance</span>
                    </div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Bureau Health</span>
                </div>
                <div class="space-y-5">
                    ${renderBureauStatus('Experian',   sacrraState.stats.bureauAcceptance.experian,   scorePct)}
                    ${renderBureauStatus('TransUnion', sacrraState.stats.bureauAcceptance.transunion, scorePct)}
                    ${renderBureauStatus('XDS',        sacrraState.stats.bureauAcceptance.xds,        scorePct)}
                </div>
            </div>

            <!-- Live records count-up -->
            <div class="col-span-12 md:col-span-6 lg:col-span-4 bg-white p-8 rounded-[32px] border border-slate-200/60 shadow-sm flex flex-col justify-between">
                <div>
                    <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                        <span class="material-symbols-outlined">database</span>
                    </div>
                    <p class="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Live Records</p>
                    <h3 id="count-total" class="text-5xl font-black text-slate-900">0</h3>
                </div>
                <div class="mt-6">
                    <div class="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        <span>Clean</span><span>Issues</span>
                    </div>
                    <div class="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div id="split-bar" class="h-full bg-emerald-400 rounded-full"
                             style="width:0%; transition: width 1.2s cubic-bezier(0.22,1,0.36,1)"></div>
                    </div>
                    <div class="flex justify-between text-[10px] font-bold text-slate-500 mt-1">
                        <span>${clean}</span><span>${issues}</span>
                    </div>
                </div>
            </div>
        </div>

        <div id="sacrra-issue-workspace" class="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div class="px-8 py-8 border-b border-slate-50 flex justify-between items-center">
                <div>
                    <h3 class="text-xl font-black text-slate-900 tracking-tight">Issue Workspace</h3>
                    <p class="text-xs font-medium text-slate-500 mt-1">High-priority records requiring institutional correction</p>
                </div>
            </div>
            <div id="issue-list-container"></div>
        </div>
    `;

    renderIssueList();

    // Animate after paint
    requestAnimationFrame(() => setTimeout(() => {
        // Ring
        const ring = document.getElementById('score-ring');
        if (ring) ring.style.strokeDashoffset = String(CIRC - dash);

        // Score % count-up
        animateCount('score-pct', 0, scorePct, 1400, v => v + '%');

        // Clean records count-up
        animateCount('count-clean', 0, clean, 1400);

        // Total count-up
        animateCount('count-total', 0, total, 1200);

        // Split bar
        const bar = document.getElementById('split-bar');
        if (bar) bar.style.width = (total > 0 ? (clean / total) * 100 : 100) + '%';

        // Bureau bar animations (staggered)
        document.querySelectorAll('.bureau-bar-fill').forEach((el, i) => {
            setTimeout(() => { el.style.width = el.dataset.target; }, i * 150);
        });
    }, 60));
}

function animateCount(id, from, to, duration, fmt = v => String(v)) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = performance.now();
    function step(now) {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 4);
        el.textContent = fmt(Math.round(from + (to - from) * ease));
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function renderBureauStatus(name, status, scorePct = 0) {
    const isVerified = status === 'VERIFIED';
    const barPct = isVerified ? scorePct : Math.round(scorePct * 0.6);
    const barColor = isVerified ? 'bg-emerald-400' : 'bg-slate-200';
    const textColor = isVerified ? 'text-emerald-600' : 'text-slate-400';
    return `
        <div>
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-bold text-slate-700">${name}</span>
                <span class="text-[9px] font-black uppercase tracking-widest ${textColor}">${status}</span>
            </div>
            <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="bureau-bar-fill h-full ${barColor} rounded-full"
                     data-target="${barPct}%"
                     style="width:0%; transition: width 1s cubic-bezier(0.22,1,0.36,1)"></div>
            </div>
        </div>
    `;
}

function renderIssueList() {
    const container = document.getElementById('issue-list-container');
    if (!container) return;
    
    // DETECT DEEP COMPLIANCE ISSUES (Layout 700v2)
    const issues = sacrraState.members.filter(m => {
        m.issues = [];
        if (!m.isValidId)                                       m.issues.push('ID_LUHN_FAIL');
        if (!m.f10_id_number?.trim())                           m.issues.push('EMPTY_IDENTITY');
        if (!m.f06_surname?.trim())                             m.issues.push('MISSING_SURNAME');
        if (!m.f07_first_names?.trim())                         m.issues.push('MISSING_FIRST_NAME');
        if (!m.f13_address_1?.trim())                           m.issues.push('MISSING_ADDRESS');
        if (!m.f41_opening_balance || m.f41_opening_balance === '000000000000') m.issues.push('MISSING_OPENING_BALANCE');
        if (!m.f43_date_opened || m.f43_date_opened === '00000000') m.issues.push('MISSING_DATE_OPENED');
        // Status code '00' and 'X' are invalid in v2.8
        const sc = (m.f50_status_code || '').trim();
        if (!VALID_STATUS_CODES.has(sc))                        m.issues.push(`INVALID_STATUS_CODE:${sc || 'BLANK'}`);
        // Account number must exist and have no spaces
        const acct = (m.f40_account_number || '').trim();
        if (!acct)                                              m.issues.push('MISSING_ACCOUNT_NUMBER');
        else if (/\s/.test(acct))                               m.issues.push('ACCOUNT_NUMBER_HAS_SPACES');
        return m.issues.length > 0;
    });
    
    if (issues.length === 0) {
        container.innerHTML = `
            <div class="p-20 flex flex-col items-center justify-center text-center">
                <div class="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                    <span class="material-symbols-outlined text-4xl">check_circle</span>
                </div>
                <h4 class="text-lg font-black text-slate-900">Zero Integrity Issues</h4>
                <p class="text-slate-500 text-sm max-w-xs mt-2">All identity records are bureau-compliant and pass the Deep Compliance audit.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="w-full text-left">
            <thead>
                <tr class="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                    <th class="px-8 py-5">Record Member</th>
                    <th class="px-6 py-5">Detected Integrity Issues</th>
                    <th class="px-8 py-5 text-right">Surgical Action</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
                ${issues.map(i => `
                    <tr class="hover:bg-slate-50/80 transition-colors group">
                        <td class="px-8 py-6">
                            <div class="font-bold text-slate-900 text-sm">${i.f07_first_names.trim()} ${i.f06_surname.trim()}</div>
                            <div class="text-[10px] font-mono text-slate-400 mt-1">${i.f10_id_number || 'NO ID'}</div>
                        </td>
                        <td class="px-6 py-6">
                            <div class="flex flex-wrap gap-2">
                                ${i.issues.map(issue => `
                                    <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${issue.includes('MISSING') ? 'bg-[var(--color-primary)/15] text-[var(--color-primary)]' : 'bg-red-100 text-red-700'}">
                                        ${issue.replace(/_/g, ' ')}
                                    </span>
                                `).join('')}
                            </div>
                        </td>
                        <td class="px-8 py-6 text-right">
                            <button onclick="window.showSurgicalFix('${i.internal_id}')" class="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase hover:scale-[1.05] active:scale-95 shadow-lg shadow-slate-900/10 transition-all">Surgical Fix</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

window.showSurgicalFix = async (loanId) => {
    const member = sacrraState.members.find(m => m.internal_id === loanId);
    if (!member) return;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6';
    modal.innerHTML = `
        <div class="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div class="flex justify-between items-start mb-8">
                <div>
                    <h2 class="text-2xl font-black text-slate-900 tracking-tight">Surgical Correction</h2>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Refining record: ${member.f07_first_names.trim()} ${member.f06_surname.trim()}</p>
                </div>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <div class="grid grid-cols-2 gap-6">
                <div class="col-span-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Full Residential Address</label>
                    <input id="fix-address" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none" value="${member.f13_address_1.trim()}" placeholder="1 Main Street">
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Employer Name</label>
                    <input id="fix-employer" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none" value="${member.f35_employer.trim()}" placeholder="Oscorp">
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Occupation</label>
                    <input id="fix-occupation" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none" value="${member.f36_occupation.trim()}" placeholder="Clerk">
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">ID Number</label>
                    <input id="fix-id" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none" value="${member.f10_id_number.trim()}">
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Middle Name</label>
                    <input id="fix-middle" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none" value="${member.f09_middle_names.trim()}" placeholder="Batman">
                </div>
            </div>

            <div class="mt-10 flex gap-4">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl">Cancel</button>
                <button id="save-fix-btn" class="flex-1 py-4 bg-[#a04100] text-white font-black rounded-2xl shadow-xl shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-95 transition-all">Save Changes</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('save-fix-btn').onclick = async () => {
        const btn = document.getElementById('save-fix-btn');
        btn.disabled = true;
        btn.innerText = 'Syncing...';

        try {
            // Find the profile ID from the loan record
            const { data: loan } = await supabase.from('loans').select('user_id').eq('id', loanId).single();
            
            await supabase.from('profiles').update({
                address_line_1: document.getElementById('fix-address').value,
                employer_name: document.getElementById('fix-employer').value,
                occupation: document.getElementById('fix-occupation').value,
                id_number: document.getElementById('fix-id').value,
                middle_name: document.getElementById('fix-middle').value
            }).eq('id', loan.user_id);

            modal.remove();
            await fetchData();
            renderView();
        } catch (err) {
            alert('Failed to save correction.');
            btn.disabled = false;
            btn.innerText = 'Save Changes';
        }
    };
};

function renderPipeline(container) {
    const history = sacrraState.submissions || [];
    container.innerHTML = `
        <div class="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div class="px-8 py-8 border-b border-slate-50 flex justify-between items-center">
                <div>
                    <h3 class="text-xl font-black text-slate-900 tracking-tight">Submission Pipeline</h3>
                    <p class="text-xs font-medium text-slate-500 mt-1">Audit trail of bureau file transmissions</p>
                </div>
                <span class="px-4 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full uppercase">${history.length} Recent Files</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead>
                        <tr class="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                            <th class="px-8 py-5">File Name</th>
                            <th class="px-6 py-5">Type</th>
                            <th class="px-6 py-5">Records</th>
                            <th class="px-6 py-5">Status</th>
                            <th class="px-8 py-5 text-right">Submitted At</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${history.map(s => `
                            <tr>
                                <td class="px-8 py-6 font-bold text-slate-900 text-sm">${s.file_name}</td>
                                <td class="px-6 py-6"><span class="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase">${s.submission_type}</span></td>
                                <td class="px-6 py-6 font-black text-slate-700">${s.record_count}</td>
                                <td class="px-6 py-6">
                                    <div class="flex items-center gap-2">
                                        <span class="w-1.5 h-1.5 rounded-full ${s.status === 'ACCEPTED' ? 'bg-emerald-500' : 'bg-[var(--color-primary)]'}"></span>
                                        <span class="text-xs font-bold ${s.status === 'ACCEPTED' ? 'text-emerald-600' : 'text-[var(--color-primary)]'}">${s.status}</span>
                                    </div>
                                </td>
                                <td class="px-8 py-6 text-right text-xs font-bold text-slate-400">${new Date(s.created_at).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderParser(container) {
    container.innerHTML = `
        <div class="flex flex-col gap-8">
            <div class="bg-white p-12 rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center text-center relative group overflow-hidden">
                <input type="file" onchange="window.processBureauFile(event)" class="absolute inset-0 opacity-0 cursor-pointer z-10">
                <div class="w-24 h-24 bg-[var(--color-primary)/10] text-[#a04100] rounded-[32px] flex items-center justify-center mb-8 shadow-xl shadow-[var(--color-primary)]/10 group-hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined text-4xl">upload_file</span>
                </div>
                <h3 class="text-2xl font-black text-slate-900 tracking-tight">Rejection Parser</h3>
                <p class="text-slate-500 max-w-sm mt-2 font-medium">Drop the .TXT file provided by the Bureau here to automatically map and resolve rejection codes.</p>
                <div class="mt-8 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Select Bureau File</div>
            </div>
            
            <div id="rejection-results" class="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div class="px-8 py-8 border-b border-slate-50">
                    <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Bureau Rejections</h4>
                </div>
                ${sacrraState.rejections.length === 0 ? `
                    <div class="p-12 text-center text-slate-300 font-bold text-xs uppercase tracking-widest">No active rejections found</div>
                ` : `
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                <th class="px-8 py-5">Match Key</th>
                                <th class="px-6 py-5">Error Code</th>
                                <th class="px-6 py-5">Message</th>
                                <th class="px-8 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${sacrraState.rejections.map(r => `
                                <tr>
                                    <td class="px-8 py-6 font-mono text-[10px] font-black text-slate-900">${r.match_key}</td>
                                    <td class="px-6 py-6 font-black text-red-600 text-xs">${r.error_code}</td>
                                    <td class="px-6 py-6 text-slate-500 text-xs font-medium">${r.error_message}</td>
                                    <td class="px-8 py-6 text-right">
                                        <button onclick="window.resolveRejection(${r.id})" class="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">Resolve</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>
    `;
}

function renderExportModalUI() {
    const settings = sacrraState.exportSettings;
    const btnMonthly = document.getElementById('btn-monthly');
    const btnDaily = document.getElementById('btn-daily');
    const dailyOptions = document.getElementById('daily-options');
    
    if (settings.type === 'MONTHLY') {
        btnMonthly.classList.add('border-[#a04100]', 'bg-[var(--color-primary)/10]/50');
        btnMonthly.querySelector('.material-symbols-outlined').classList.add('text-[#a04100]');
        btnDaily.classList.remove('border-[#a04100]', 'bg-[var(--color-primary)/10]/50');
        btnDaily.querySelector('.material-symbols-outlined').classList.remove('text-[#a04100]');
        dailyOptions.classList.add('hidden');
    } else {
        btnDaily.classList.add('border-[#a04100]', 'bg-[var(--color-primary)/10]/50');
        btnDaily.querySelector('.material-symbols-outlined').classList.add('text-[#a04100]');
        btnMonthly.classList.remove('border-[#a04100]', 'bg-[var(--color-primary)/10]/50');
        btnMonthly.querySelector('.material-symbols-outlined').classList.remove('text-[#a04100]');
        dailyOptions.classList.remove('hidden');
    }

    ['R', 'C', 'D'].forEach(p => {
        const btn = document.getElementById(`prefix-${p.toLowerCase()}`);
        if (btn) {
            if (settings.prefix === p) {
                btn.classList.add('bg-white', 'shadow-sm', 'text-[#a04100]');
                btn.classList.remove('text-slate-500');
            } else {
                btn.classList.remove('bg-white', 'shadow-sm', 'text-[#a04100]');
                btn.classList.add('text-slate-500');
            }
        }
    });
}

// Valid Layout 700v2 status codes — '00' and 'X' were removed in v2.8
const VALID_STATUS_CODES = new Set(['C','D','E','I','J','L','P','T','V','W','Z']);

function pad(val, len, char = ' ') {
    return String(val || '').slice(0, len).padEnd(len, char);
}
function zeroPad(val, len) {
    return String(val || '').slice(0, len).padStart(len, '0');
}

// ── Derive title from gender ──────────────────────────────────────────
function deriveTitle(gender) {
    const g = (gender || '').toUpperCase().trim();
    if (g === 'F') return 'MS';
    return 'MR';
}

// ── Build the fixed-width 700-char file content ───────────────────────
function buildSacrraFileContent(settings) {
    // Support backdating: if admin selected a past month, use that period end
    const backdateInput = document.getElementById('sacrra-backdate-month')?.value; // 'YYYY-MM'
    let reportingDate;
    if (backdateInput && backdateInput.length === 7) {
        const [yr, mo] = backdateInput.split('-').map(Number);
        reportingDate  = new Date(yr, mo, 0); // last day of selected month
        console.log(`[SACRRA] Backdated submission for ${backdateInput}`);
    } else {
        reportingDate = new Date(); // current date, last day calculated below
    }

    const now      = reportingDate;
    const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthEnd = lastDay.toISOString().slice(0, 10).replace(/-/g, '');
    const dateStr  = now.toISOString().slice(0, 10).replace(/-/g, '');
    const srn      = (sacrraState.members[0]?.f02_supplier_ref || 'ZFS001').trim().slice(0, 6).padEnd(6, ' ');

    // Header: H + SRN(6) + monthEnd(8) + 'L702' + spaces to 700
    let content = ('H' + srn + monthEnd + 'L702').padEnd(700, ' ') + '\r\n';

    sacrraState.members.forEach(m => {
        const recordType = settings.type === 'DAILY' ? settings.prefix : (m.f01_record_type || 'R');
        const statusCode = (m.f50_status_code || 'L').trim().slice(0, 1);
        const accountNo  = (m.f40_account_number || m.internal_id || '').replace(/\s/g, '');
        // Account type: P = personal loan (all terms), never 'M' which is non-standard
        const accountType = (m.f03_account_type || 'P').slice(0, 1) === 'M' ? 'P' : (m.f03_account_type || 'P');
        const gender     = (m.f11_gender || 'M').slice(0, 1).toUpperCase();
        const title      = deriveTitle(gender);

        // Financial fields: zero out for closed/positive statuses
        const isPositive = ['C', 'E', 'P', 'T'].includes(statusCode);
        const balance    = isPositive ? '000000000000' : zeroPad((m.f44_current_balance || '0').replace(/\D/g, ''), 12);
        const instalment = isPositive ? '000000000000' : zeroPad((m.f45_installment    || '0').replace(/\D/g, ''), 12);
        const arrears    = isPositive ? '000000000000' : zeroPad((m.f49_arrears_amount  || '0').replace(/\D/g, ''), 12);
        const mthsArr    = isPositive ? '00' : zeroPad(m.f53_months_in_arrears, 2);

        let line = '';
        line += recordType.slice(0, 1);                                      // 1:      Record type
        line += pad(accountNo, 20);                                          // 2–21:   Account number
        line += pad(m.f02_supplier_ref, 6);                                  // 22–27:  SRN
        line += accountType.slice(0, 1);                                     // 28:     Account type (P)
        line += statusCode;                                                  // 29:     Status code
        line += pad(m.f51_status_date || dateStr, 8);                        // 30–37:  Status date YYYYMMDD
        line += pad(m.f43_date_opened || '00000000', 8);                     // 38–45:  Date opened YYYYMMDD
        line += zeroPad((m.f41_opening_balance || '0').replace(/\D/g, ''), 12); // 46–57: Opening balance (cents)
        line += balance;                                                     // 58–69:  Current balance
        line += instalment;                                                  // 70–81:  Instalment
        line += arrears;                                                     // 82–93:  Arrears
        line += mthsArr;                                                     // 94–95:  Months in arrears
        line += pad(m.f46_first_payment_date || '00000000', 8);              // 96–103: First payment date
        line += pad((m.f10_id_number || '').trim(), 13);                     // 104–116: SA ID (13 digits)
        line += '  ';                                                        // 117–118: Non-SA ID type (blank)
        line += pad('', 20);                                                 // 119–138: Non-SA ID number
        line += gender;                                                      // 139:    Gender (M/F)
        line += pad(m.f12_date_of_birth || '00000000', 8);                   // 140–147: DOB YYYYMMDD
        line += pad(title, 5);                                               // 148–152: Title (MR/MS derived)
        line += pad((m.f06_surname    || '').toUpperCase(), 30);             // 153–182: Surname
        line += pad((m.f07_first_names || '').toUpperCase(), 30);            // 183–212: First names
        line += pad((m.f09_middle_names || '').toUpperCase(), 15);           // 213–227: Middle names
        line += pad(m.f13_address_1, 30);                                    // 228–257: Address 1
        line += pad(m.f14_address_2, 30);                                    // 258–287: Address 2
        line += pad(m.f15_city, 30);                                         // 288–317: City/Suburb
        line += pad(m.f16_province || '', 30);                               // 318–347: Province
        line += pad(m.f17_postal, 10);                                       // 348–357: Postal code
        line += pad(m.f31_mobile, 15);                                       // 358–372: Mobile
        line += pad(m.f32_work, 15);                                         // 373–387: Work phone
        line += pad(m.f35_employer, 50);                                     // 388–437: Employer
        line += pad(m.f36_occupation, 30);                                   // 438–467: Occupation

        content += line.padEnd(700, ' ').slice(0, 700) + '\r\n';
    });

    // Trailer: T + zero-padded record count (10) + spaces to 700
    content += ('T' + zeroPad(sacrraState.members.length, 10)).padEnd(700, ' ') + '\r\n';

    return content;
}

window.generateSacrraFile = async () => {
    if (sacrraState.members.length === 0) return alert("No data found.");

    // Pre-flight validation
    const invalidStatus = sacrraState.members.filter(m => !VALID_STATUS_CODES.has((m.f50_status_code || '').trim()));
    const invalidId     = sacrraState.members.filter(m => !m.isValidId);
    if (invalidStatus.length > 0 || invalidId.length > 0) {
        const msg = [];
        if (invalidId.length)     msg.push(`${invalidId.length} records with invalid SA ID (Luhn fail)`);
        if (invalidStatus.length) msg.push(`${invalidStatus.length} records with invalid status code`);
        if (!confirm(`⚠️ Compliance issues detected:\n• ${msg.join('\n• ')}\n\nThese records will likely be rejected by the bureaux. Generate file anyway?`)) return;
    }

    const settings  = sacrraState.exportSettings;
    const dateStr   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const plainName = `SACRRA_${settings.type}_${dateStr}.txt`;
    const pgpName   = `SACRRA_${settings.type}_${dateStr}.pgp`;

    // Build fixed-width content
    const fileContent = buildSacrraFileContent(settings);

    // ── PGP encryption ────────────────────────────────────────────────
    // Load bureau public key from Supabase system_settings.sacrra_bureau_public_key
    // Falls back to the test key if not configured (UAT mode)
    let downloadName = plainName;
    let downloadContent;
    let downloadType = 'text/plain';

    try {
        const { data: settingsRow } = await supabase
            .from('system_settings')
            .select('sacrra_bureau_public_key')
            .limit(1)
            .single();

        const armoredKey = settingsRow?.sacrra_bureau_public_key?.trim();

        if (armoredKey && armoredKey.includes('BEGIN PGP PUBLIC KEY')) {
            const publicKey   = await openpgp.readKey({ armoredKey });
            const message     = await openpgp.createMessage({ text: fileContent });
            const encrypted   = await openpgp.encrypt({ message, encryptionKeys: publicKey });

            downloadName    = pgpName;
            downloadContent = encrypted;
            downloadType    = 'application/octet-stream';

            console.log('[SACRRA] File PGP-encrypted successfully.');
        } else {
            // No bureau key configured — download plain .txt with a warning
            console.warn('[SACRRA] No bureau public key found in system_settings — downloading plain .TXT (UAT/debug mode).');
            downloadContent = fileContent;
        }
    } catch (pgpErr) {
        console.error('[SACRRA] PGP encryption failed:', pgpErr);
        if (!confirm('PGP encryption failed. Download unencrypted .TXT for debugging?')) return;
        downloadContent = fileContent;
    }

    // Log submission to sacrra_submissions
    await supabase.from('sacrra_submissions').insert([{
        file_name:       downloadName,
        submission_type: settings.type,
        record_count:    sacrraState.members.length,
        status:          'PENDING'
    }]);

    // Trigger download
    const blob = new Blob([downloadContent], { type: downloadType });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href  = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    window.hideExportModal();

    // ── Transmit to MOVEit ────────────────────────────────────────────
    if (confirm(`File downloaded. Transmit "${downloadName}" to Experian MOVEit now?`)) {
        await transmitToMoveIt(downloadName, downloadContent);
    }

    setTimeout(() => window.refreshSacrraData(), 1000);
};

async function transmitToMoveIt(fileName, fileContent) {
    const statusEl = showTransmitStatus('Authenticating with MOVEit...');

    try {
        // Step 1: Authenticate
        const authRes = await fetch('/api/moveit/auth', { method: 'POST' });
        const authData = await authRes.json();

        let accessToken;

        if (authData.requiresMfa) {
            // MFA required — prompt for OTP
            updateTransmitStatus(statusEl, 'MFA required — check your email for the OTP code.');
            const otp = prompt('Enter the OTP code sent to your email:');
            if (!otp) { updateTransmitStatus(statusEl, 'Transmission cancelled.', 'warn'); return; }

            const mfaRes  = await fetch('/api/moveit/auth/mfa', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ mfaToken: authData.mfaToken, otpCode: otp }),
            });
            const mfaData = await mfaRes.json();
            if (!mfaData.success) {
                updateTransmitStatus(statusEl, `MFA failed: ${mfaData.error}`, 'error'); return;
            }
            accessToken = mfaData.accessToken;
        } else if (authData.success) {
            accessToken = authData.accessToken;
        } else {
            updateTransmitStatus(statusEl, `Auth failed: ${authData.error}`, 'error'); return;
        }

        // Step 2: Upload
        updateTransmitStatus(statusEl, `Uploading ${fileName} to Experian MOVEit...`);
        const contentBase64 = typeof fileContent === 'string'
            ? btoa(unescape(encodeURIComponent(fileContent)))
            : btoa(String.fromCharCode(...new Uint8Array(await fileContent.arrayBuffer())));

        const uploadRes  = await fetch('/api/moveit/upload', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ accessToken, fileName, fileContent: contentBase64 }),
        });
        const uploadData = await uploadRes.json();

        if (uploadData.success) {
            updateTransmitStatus(statusEl, `✅ Transmitted successfully — File ID: ${uploadData.fileId || 'confirmed'}`, 'success');
        } else {
            updateTransmitStatus(statusEl, `Upload failed: ${uploadData.error}`, 'error');
        }

    } catch (err) {
        updateTransmitStatus(statusEl, `Transmission error: ${err.message}`, 'error');
        console.error('[MOVEit]', err);
    }
}

function showTransmitStatus(message) {
    const el = document.createElement('div');
    el.id = 'moveit-status';
    el.className = 'fixed bottom-6 right-6 z-[200] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-3 transition-all';
    el.innerHTML = `<span class="material-symbols-outlined animate-spin text-[var(--color-primary)]">sync</span><span id="moveit-status-text">${message}</span>`;
    document.body.appendChild(el);
    return el;
}

function updateTransmitStatus(el, message, type = 'loading') {
    if (!el) return;
    const icon = el.querySelector('.material-symbols-outlined');
    const text = el.querySelector('#moveit-status-text');
    if (text) text.textContent = message;
    if (icon) {
        icon.classList.remove('animate-spin', 'text-[var(--color-primary)]', 'text-emerald-400', 'text-red-400', 'text-yellow-400');
        if (type === 'success') { icon.textContent = 'check_circle'; icon.classList.add('text-emerald-400'); }
        else if (type === 'error') { icon.textContent = 'error'; icon.classList.add('text-red-400'); }
        else if (type === 'warn')  { icon.textContent = 'warning'; icon.classList.add('text-yellow-400'); }
        else { icon.textContent = 'sync'; icon.classList.add('animate-spin', 'text-[var(--color-primary)]'); }
    }
    if (type !== 'loading') setTimeout(() => el.remove(), 5000);
}
