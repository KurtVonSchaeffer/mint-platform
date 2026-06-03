// src/modules/credit-rules.js — Credit Rules Engine Admin UI
import { initLayout } from '../shared/layout.js';

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let organizations = [];
let currentOrgId  = null;
let bands         = [];
let rules         = [];
let editingBandId = null;

// ─────────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await initLayout({
        pageTitle: 'Credit Rules',
        activeNav: 'credit-rules'
    });
    await loadOrganizations();
    render();
});

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────
async function loadOrganizations() {
    const res = await fetch('/api/organizations');
    const json = await res.json();
    organizations = json.data || [];
    if (organizations.length) currentOrgId = organizations[0].id;
}

async function loadRules() {
    if (!currentOrgId) return;
    const res = await fetch(`/api/credit-rules/${currentOrgId}`);
    const json = await res.json();
    bands = json.bands || [];
    rules = json.rules || [];
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────
async function render() {
    await loadRules();
    const shell = document.getElementById('app-shell');
    const main  = shell.querySelector('main') || shell;
    const content = main.querySelector('#cr-content') || (() => {
        const d = document.createElement('div');
        d.id = 'cr-content';
        d.className = 'p-6 max-w-6xl mx-auto';
        main.appendChild(d);
        return d;
    })();

    content.innerHTML = `
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Credit Rules</h1>
          <p class="text-sm text-gray-500 mt-1">Configure per-client score bands and eligibility criteria</p>
        </div>
        ${organizations.length > 1 ? `
        <select id="orgSelector" onchange="switchOrg(this.value)"
          class="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium bg-white shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none">
          ${organizations.map(o => `<option value="${o.id}" ${o.id===currentOrgId?'selected':''}>${o.name}</option>`).join('')}
        </select>` : `<span class="text-sm font-semibold text-gray-700">${organizations[0]?.name || ''}</span>`}
      </div>

      <!-- Score Bands -->
      <section class="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-[var(--color-primary)/10] flex items-center justify-center">
              <i class="fas fa-layer-group text-[var(--color-primary)] text-sm"></i>
            </div>
            <div>
              <h2 class="font-semibold text-gray-900">Credit Score Bands</h2>
              <p class="text-xs text-gray-400">Define risk levels, max loan amounts and interest rates per score range</p>
            </div>
          </div>
          <button onclick="openBandModal()"
            class="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            <i class="fas fa-plus text-xs"></i> Add Band
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                <th class="px-6 py-3 text-left">Band</th>
                <th class="px-6 py-3 text-left">Score Range</th>
                <th class="px-6 py-3 text-left">Risk</th>
                <th class="px-6 py-3 text-right">Max Loan</th>
                <th class="px-6 py-3 text-right">Rate (p.a.)</th>
                <th class="px-6 py-3 text-right">Max Term</th>
                <th class="px-6 py-3 text-center">Decision</th>
                <th class="px-6 py-3 text-center">1st Loan Term</th>
                <th class="px-6 py-3 text-center">Active</th>
                <th class="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              ${bands.map(b => `
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4">
                  <span class="inline-flex items-center gap-2 font-semibold text-gray-800">
                    <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${b.color}"></span>
                    ${b.label}
                  </span>
                </td>
                <td class="px-6 py-4 text-gray-600 font-mono text-xs">${b.min_score} – ${b.max_score}</td>
                <td class="px-6 py-4">
                  <span class="px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wide"
                    style="background:${b.color}20;color:${b.color}">
                    ${b.risk_level}
                  </span>
                </td>
                <td class="px-6 py-4 text-right font-semibold text-gray-800">R ${Number(b.max_loan_amount).toLocaleString()}</td>
                <td class="px-6 py-4 text-right text-gray-600">${b.interest_rate_pa}%</td>
                <td class="px-6 py-4 text-right text-gray-600">${b.max_term_months} mo</td>
                <td class="px-6 py-4 text-center">
                  <span class="px-2 py-1 rounded-lg text-xs font-bold uppercase ${
                    b.auto_decision==='approve' ? 'bg-green-50 text-green-700' :
                    b.auto_decision==='decline' ? 'bg-red-50 text-red-600'    :
                    'bg-yellow-50 text-yellow-700'
                  }">
                    ${b.auto_decision}
                  </span>
                </td>
                <td class="px-6 py-4 text-center">
                  ${b.first_loan_max_term_months
                    ? `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                        <i class="fas fa-star text-xs"></i> ${b.first_loan_max_term_months} mo
                       </span>`
                    : `<span class="text-gray-300 text-xs">—</span>`}
                </td>
                <td class="px-6 py-4 text-center">
                  <button onclick="toggleBand('${b.id}', ${!b.is_active})"
                    class="relative w-10 h-6 rounded-full transition-colors duration-200 ${b.is_active ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}">
                    <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${b.is_active ? 'translate-x-4' : ''}"></span>
                  </button>
                </td>
                <td class="px-6 py-4 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <button onclick="openBandModal('${b.id}')"
                      class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-[var(--color-primary)/10] hover:text-[var(--color-primary)] text-gray-500 transition-colors flex items-center justify-center">
                      <i class="fas fa-pen text-xs"></i>
                    </button>
                    <button onclick="deleteBand('${b.id}')"
                      class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 transition-colors flex items-center justify-center">
                      <i class="fas fa-trash text-xs"></i>
                    </button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
          ${!bands.length ? `<div class="text-center py-12 text-gray-400">No bands configured yet. <button onclick="openBandModal()" class="text-[var(--color-primary)] font-semibold">Add your first band</button>.</div>` : ''}
        </div>
      </section>

      <!-- Eligibility Rules -->
      <section class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div class="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
            <i class="fas fa-shield-check text-purple-500 text-sm"></i>
          </div>
          <div>
            <h2 class="font-semibold text-gray-900">Eligibility Rules</h2>
            <p class="text-xs text-gray-400">Hard pass/fail criteria checked before score bands</p>
          </div>
        </div>

        <div class="divide-y divide-gray-50">
          ${rules.map(r => `
          <div class="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
            <button onclick="toggleRule('${r.id}', ${!r.is_active})"
              class="mt-0.5 relative w-10 h-6 flex-shrink-0 rounded-full transition-colors duration-200 ${r.is_active ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}">
              <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${r.is_active ? 'translate-x-4' : ''}"></span>
            </button>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 flex-wrap">
                <span class="font-semibold text-gray-900 ${!r.is_active ? 'opacity-40' : ''}">${r.rule_label}</span>
                ${r.threshold_value ? `
                <span class="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                  ${r.operator === 'gte' ? '≥' : r.operator === 'lte' ? '≤' : '='} ${r.threshold_value}${r.rule_key.includes('pct') ? '%' : r.rule_key.includes('income') || r.rule_key.includes('amount') ? '' : ''}
                </span>` : ''}
                <span class="text-xs font-bold px-2 py-0.5 rounded-lg ${r.fail_action==='decline' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-700'}">
                  Fail → ${r.fail_action.toUpperCase()}
                </span>
              </div>
              ${r.description ? `<p class="text-xs text-gray-400 mt-0.5">${r.description}</p>` : ''}
              ${r.decline_reason ? `<p class="text-xs text-gray-500 mt-1 italic">"${r.decline_reason}"</p>` : ''}
            </div>
            <button onclick="openRuleEditor('${r.id}')"
              class="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-gray-100 hover:bg-[var(--color-primary)/10] hover:text-[var(--color-primary)] text-gray-400 transition-all flex items-center justify-center flex-shrink-0">
              <i class="fas fa-pen text-xs"></i>
            </button>
          </div>`).join('')}
        </div>
      </section>

      <!-- Band Modal -->
      <div id="bandModal" class="hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900" id="bandModalTitle">Add Score Band</h3>
            <button onclick="closeBandModal()" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
          <form id="bandForm" onsubmit="saveBand(event)" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Band Label</label>
                <input name="label" required placeholder="e.g. Excellent"
                  class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Min Score</label>
                <input name="min_score" type="number" min="0" max="999" required placeholder="300"
                  class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Max Score</label>
                <input name="max_score" type="number" min="0" max="999" required placeholder="999"
                  class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Risk Level</label>
                <select name="risk_level" class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Auto Decision</label>
                <select name="auto_decision" class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-white">
                  <option value="approve">Approve</option>
                  <option value="review">Manual Review</option>
                  <option value="decline">Decline</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Max Loan Amount (R)</label>
                <input name="max_loan_amount" type="number" min="0" step="500" placeholder="10000"
                  class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Interest Rate p.a. (%)</label>
                <input name="interest_rate_pa" type="number" min="0" max="100" step="0.5" placeholder="22.00"
                  class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Max Term (months)</label>
                <input name="max_term_months" type="number" min="1" max="84" placeholder="12"
                  class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Monthly Service Fee (R)</label>
                <input name="monthly_service_fee" type="number" min="0" step="5" placeholder="69"
                  class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Band Colour</label>
                <div class="flex items-center gap-2">
                  <input name="color" type="color" value="#10b981"
                    class="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5">
                  <span class="text-xs text-gray-400">Shown in UI badges</span>
                </div>
              </div>
              <div class="col-span-2 border-t border-gray-100 pt-4">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-star text-blue-500 text-xs"></i>
                  </div>
                  <span class="text-xs font-semibold text-gray-700 uppercase tracking-wide">First Loan Restrictions</span>
                </div>
                <div class="bg-blue-50 rounded-xl p-4 space-y-3">
                  <div>
                    <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                      Max Term — First Loan Only (months)
                    </label>
                    <input name="first_loan_max_term_months" type="number" min="1" max="24" placeholder="1"
                      class="w-full border border-blue-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white">
                    <p class="text-xs text-gray-400 mt-1.5">
                      Leave blank to allow full term from day one. Set to <strong>1</strong> to require first-time borrowers repay within 1 month before longer terms unlock.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" onclick="closeBandModal()"
                class="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                Cancel
              </button>
              <button type="submit" id="bandSaveBtn"
                class="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                Save Band
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Rule Editor Modal -->
      <div id="ruleModal" class="hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900">Edit Rule</h3>
            <button onclick="closeRuleModal()" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
          <form id="ruleForm" onsubmit="saveRule(event)" class="space-y-4">
            <input type="hidden" name="rule_id">
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Rule</label>
              <input name="rule_label" readonly class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-500">
            </div>
            <div id="thresholdGroup">
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Threshold Value</label>
              <input name="threshold_value"
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">If Fails</label>
              <select name="fail_action" class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-white">
                <option value="decline">Decline immediately</option>
                <option value="review">Send to manual review</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Message shown to applicant</label>
              <textarea name="decline_reason" rows="2" placeholder="Reason displayed to the borrower..."
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none resize-none"></textarea>
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" onclick="closeRuleModal()"
                class="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                Cancel
              </button>
              <button type="submit"
                class="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                Save Rule
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Expose actions to window
    window.switchOrg      = switchOrg;
    window.openBandModal  = openBandModal;
    window.closeBandModal = closeBandModal;
    window.saveBand       = saveBand;
    window.deleteBand     = deleteBand;
    window.toggleBand     = toggleBand;
    window.toggleRule     = toggleRule;
    window.openRuleEditor = openRuleEditor;
    window.closeRuleModal = closeRuleModal;
    window.saveRule       = saveRule;
}

// ─────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────
async function switchOrg(id) {
    currentOrgId = id;
    await render();
}

function openBandModal(bandId = null) {
    editingBandId = bandId;
    const modal = document.getElementById('bandModal');
    const form  = document.getElementById('bandForm');
    const title = document.getElementById('bandModalTitle');
    form.reset();

    if (bandId) {
        const band = bands.find(b => b.id === bandId);
        if (band) {
            title.textContent = 'Edit Score Band';
            Object.entries(band).forEach(([k, v]) => {
                const el = form.elements[k];
                if (el && v !== null && v !== undefined) el.value = v;
            });
        }
    } else {
        title.textContent = 'Add Score Band';
    }
    modal.classList.remove('hidden');
}

function closeBandModal() {
    document.getElementById('bandModal').classList.add('hidden');
    editingBandId = null;
}

async function saveBand(e) {
    e.preventDefault();
    const btn  = document.getElementById('bandSaveBtn');
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    data.organization_id     = currentOrgId;
    data.min_score           = parseInt(data.min_score);
    data.max_score           = parseInt(data.max_score);
    data.max_loan_amount     = parseFloat(data.max_loan_amount || 0);
    data.interest_rate_pa    = parseFloat(data.interest_rate_pa || 0);
    data.max_term_months     = parseInt(data.max_term_months || 12);
    data.monthly_service_fee = parseFloat(data.monthly_service_fee || 0);
    data.first_loan_max_term_months = data.first_loan_max_term_months
        ? parseInt(data.first_loan_max_term_months)
        : null;

    btn.textContent = 'Saving…';
    btn.disabled    = true;

    try {
        const url    = editingBandId ? `/api/credit-bands/${editingBandId}` : '/api/credit-bands';
        const method = editingBandId ? 'PUT' : 'POST';
        const res    = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
        if (!res.ok) throw new Error(await res.text());
        closeBandModal();
        await render();
    } catch (err) {
        alert('Error saving band: ' + err.message);
    } finally {
        btn.textContent = 'Save Band';
        btn.disabled    = false;
    }
}

async function deleteBand(id) {
    if (!confirm('Delete this score band? This cannot be undone.')) return;
    await fetch(`/api/credit-bands/${id}`, { method: 'DELETE' });
    await render();
}

async function toggleBand(id, active) {
    await fetch(`/api/credit-bands/${id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ is_active: active })
    });
    await render();
}

async function toggleRule(id, active) {
    await fetch(`/api/eligibility-rules/${id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ is_active: active })
    });
    await render();
}

function openRuleEditor(ruleId) {
    const rule  = rules.find(r => r.id === ruleId);
    if (!rule) return;
    const modal = document.getElementById('ruleModal');
    const form  = document.getElementById('ruleForm');
    form.elements['rule_id'].value       = rule.id;
    form.elements['rule_label'].value    = rule.rule_label;
    form.elements['threshold_value'].value = rule.threshold_value || '';
    form.elements['fail_action'].value   = rule.fail_action;
    form.elements['decline_reason'].value = rule.decline_reason || '';

    // Hide threshold for boolean rules
    document.getElementById('thresholdGroup').style.display =
        ['is_true','is_false'].includes(rule.operator) ? 'none' : 'block';

    modal.classList.remove('hidden');
}

function closeRuleModal() {
    document.getElementById('ruleModal').classList.add('hidden');
}

async function saveRule(e) {
    e.preventDefault();
    const form = e.target;
    const id   = form.elements['rule_id'].value;
    const data = {
        threshold_value: form.elements['threshold_value'].value,
        fail_action:     form.elements['fail_action'].value,
        decline_reason:  form.elements['decline_reason'].value
    };
    const res = await fetch(`/api/eligibility-rules/${id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
    });
    if (!res.ok) { alert('Save failed'); return; }
    closeRuleModal();
    await render();
}
