import { initLayout } from '../shared/layout.js';
import { formatCurrency, formatDate } from '../shared/utils.js';
import { 
  fetchPayments, 
  fetchAnalyticsData
} from '../services/dataService.js';

// --- State ---
let allPayments = [];
let analyticsData = [];
let activeTab = '30days'; 
let searchTerm = '';
let currentPage = 1;
const itemsPerPage = 15;

/**
 * Main Page Rendering
 * Implements the brand guide layout: 3 Cards -> Table (Left) & Analytics (Right)
 */
function renderPageContent() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div id="recovery-dashboard" class="flex flex-col h-full animate-fade-in space-y-6">
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-card p-8 rounded-2xl flex items-center justify-between relative overflow-hidden group">
            <div class="z-10">
                <p class="text-[11px] font-semibold uppercase tracking-widest text-outline">Total Recoveries (MTD)</p>
                <h2 id="stat-mtd-recoveries" class="text-3xl font-black text-on-surface mt-2">R 0.00</h2>
                <p id="stat-mtd-count" class="text-xs text-green-600 font-bold mt-1 flex items-center gap-1"></p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shadow-sm z-10">
                <span class="material-symbols-outlined">payments</span>
            </div>
        </div>

        <div class="glass-card p-8 rounded-2xl flex items-center justify-between relative overflow-hidden">
            <div class="z-10">
                <p class="text-[11px] font-semibold uppercase tracking-widest text-outline">Realized Profit (MTD)</p>
                <h2 id="stat-revenue-yield" class="text-3xl font-black text-indigo-900 mt-2">R 0.00</h2>
                <p class="text-xs text-indigo-400 font-bold mt-1 tracking-tight">Contractual Fees & Interest</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm z-10">
                <span class="material-symbols-outlined">donut_large</span>
            </div>
        </div>

        <div class="glass-card p-8 rounded-2xl flex items-center justify-between relative overflow-hidden">
            <div class="z-10">
                <p class="text-[11px] font-semibold uppercase tracking-widest text-outline">Active Payers</p>
                <h2 id="stat-active-payers" class="text-3xl font-black text-on-surface mt-2">0</h2>
                <p class="text-xs text-outline font-bold mt-1">Unique clients this period</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-surface-container text-outline flex items-center justify-center shadow-sm z-10">
                <span class="material-symbols-outlined">group</span>
            </div>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        <div class="lg:w-3/4 glass-card rounded-2xl flex flex-col overflow-hidden">

            <div class="p-5 border-b border-outline-variant/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 class="text-lg font-headline font-bold text-on-surface uppercase tracking-tight">Recovery Detail</h3>
                    <div class="flex gap-6 mt-2">
                        <button id="tab-today"   class="text-xs font-bold uppercase transition-colors pb-1 border-b-2 ${activeTab === 'today'   ? 'border-[var(--color-primary)] text-on-surface' : 'text-outline border-transparent hover:text-on-surface'}">Today</button>
                        <button id="tab-7days"   class="text-xs font-bold uppercase transition-colors pb-1 border-b-2 ${activeTab === '7days'   ? 'border-[var(--color-primary)] text-on-surface' : 'text-outline border-transparent hover:text-on-surface'}">7 Days</button>
                        <button id="tab-30days"  class="text-xs font-bold uppercase transition-colors pb-1 border-b-2 ${activeTab === '30days'  ? 'border-[var(--color-primary)] text-on-surface' : 'text-outline border-transparent hover:text-on-surface'}">30 Days</button>
                        <button id="tab-all"     class="text-xs font-bold uppercase transition-colors pb-1 border-b-2 ${activeTab === 'all'     ? 'border-[var(--color-primary)] text-on-surface' : 'text-outline border-transparent hover:text-on-surface'}">All</button>
                        <span class="text-outline text-xs">|</span>
                        <input type="date" id="filter-date-from" class="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-[var(--color-primary)] focus:outline-none" title="From date">
                        <span class="text-xs text-outline">→</span>
                        <input type="date" id="filter-date-to" class="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-[var(--color-primary)] focus:outline-none" title="To date">
                    </div>
                    <div style="margin-top:6px;">
                      <button id="btn-export-payments" class="text-xs font-bold text-[var(--color-primary)] border border-[var(--color-primary)] bg-[var(--color-primary)/10] hover:bg-[var(--color-primary)/15] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                        <i class="fa-solid fa-download text-xs"></i> Export CSV
                      </button>
                    </div>
                </div>
                <div class="relative flex-1 sm:w-64">
                    <input type="text" id="search-input" placeholder="Search client or ID..." 
                           class="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-[var(--color-primary)] text-xs focus:bg-white transition-colors">
                    <i class="fa-solid fa-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                </div>
            </div>

            <div class="flex-1 overflow-auto custom-scrollbar relative">
                <table class="min-w-full divide-y divide-outline-variant/10">
                    <thead class="bg-surface-container sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th class="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-outline">Date</th>
                            <th class="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-outline">Client & ID</th>
                            <th class="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-outline">Loan Ref</th>
                            <th class="px-6 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-outline">Status</th>
                            <th class="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-outline">Paid In</th>
                            <th class="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-outline">Balance</th>
                        </tr>
                    </thead>
                    <tbody id="payments-table-body" class="bg-white divide-y divide-outline-variant/10">
                        <tr><td colspan="6" class="p-10 text-center text-xs text-gray-400 italic">Initializing transaction view...</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div id="pagination-controls" class="border-t border-gray-100 bg-gray-50/50 p-3"></div>
        </div>

        <div class="lg:w-1/4 flex flex-col gap-6">
            
            <div class="glass-card p-8 rounded-2xl">
                <h4 class="text-[11px] font-semibold uppercase tracking-widest text-outline mb-4">Allocation (MTD)</h4>
                
                <div class="relative w-40 h-40 mx-auto mb-6">
                    <svg viewBox="0 0 36 36" class="w-full h-full transform -rotate-90">
                        <path class="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3.8" />
                        <path id="chart-interest-ring" class="text-indigo-500 transition-all duration-1000" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3.8" />
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span class="text-[10px] text-gray-400 font-bold uppercase">Profit</span>
                        <span id="chart-profit-percent" class="text-xl font-black text-gray-900">0%</span>
                    </div>
                </div>

                <div class="space-y-2">
                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <span class="text-[10px] font-bold text-gray-500 uppercase">Capital Back</span>
                        <span id="label-principal-split" class="text-xs font-black text-gray-900">R 0</span>
                    </div>
                    <div class="flex justify-between items-center p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        <span class="text-[10px] font-bold text-indigo-600 uppercase">Interest/Fees</span>
                        <span id="label-interest-split" class="text-xs font-black text-indigo-900">R 0</span>
                    </div>
                    <div class="flex justify-between items-center p-2 bg-purple-50 rounded-lg border border-purple-100">
                        <span class="text-[10px] font-bold text-purple-600 uppercase">Credit/Extra</span>
                        <span id="label-overpayment-split" class="text-xs font-black text-purple-900">R 0</span>
                    </div>
                </div>
            </div>

            <div class="glass-card p-8 rounded-2xl flex-1">
                <h4 class="text-[11px] font-semibold uppercase tracking-widest text-outline mb-4">Top Period Recoveries</h4>
                <div id="top-payments-list" class="space-y-3 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar"></div>
            </div>

        </div>
      </div>
    </div>
  `;

  attachEventListeners();
}

/**
 * Data Orchestrator
 * Pulls both raw payments (for the table) and analytics (for the metrics).
 */
async function loadData() {
  try {
    
    const [paymentsRes, analyticsRes] = await Promise.all([ 
      fetchPayments(), 
      fetchAnalyticsData() 
    ]);

    
    if (paymentsRes.error) throw paymentsRes.error;
    if (analyticsRes.error) throw analyticsRes.error;
    
    
    allPayments = paymentsRes.data || [];
    analyticsData = analyticsRes.data || [];

    
    calculateAndRenderMetrics();
    filterAndRender(true);

  } catch (error) {
    console.error("Load Error:", error);
    
 
    const errorMsg = error.message || "Unable to connect to the database. Please check your connection.";
    const tbody = document.getElementById('payments-table-body');
    
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-10 text-center text-xs text-red-500 italic border-2 border-dashed border-red-50 rounded-xl">
            <i class="fa-solid fa-triangle-exclamation mb-2 text-lg"></i><br>
            Error Loading Data: ${errorMsg}
          </td>
        </tr>`;
    }
    
    
    if (window.showToast) window.showToast("Failed to load recovery data", "error");
  }
}

/**
 * Real-time Financial Breakdown
 * Uses the waterfall data to fill cards and charts.
 */
function calculateAndRenderMetrics() {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); 

    const mtdPayments = allPayments.filter(p => p.payment_date.startsWith(currentMonth));
    const mtdTotal = mtdPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const uniquePayers = new Set(mtdPayments.map(p => p.loan_id)).size;

    // Calculation using CONTRACTUAL collected fields
    const currentMonthAnalytics = analyticsData.filter(row => row.month === currentMonth);
    const profitTotal = currentMonthAnalytics.reduce((sum, row) => sum + (row.profit_collected_month || 0), 0);
    const principalTotal = currentMonthAnalytics.reduce((sum, row) => sum + (row.principal_collected_month || 0), 0);
    const extraTotal = currentMonthAnalytics.reduce((sum, row) => sum + (row.overpayment_collected_month || 0), 0);
    
    // Update DOM
    document.getElementById('stat-mtd-recoveries').textContent = formatCurrency(mtdTotal);
    document.getElementById('stat-revenue-yield').textContent = formatCurrency(profitTotal);
    document.getElementById('stat-active-payers').textContent = uniquePayers;
    document.getElementById('stat-mtd-count').innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> <span>${mtdPayments.length}</span> transactions`;

    document.getElementById('label-principal-split').textContent = formatCurrency(principalTotal);
    document.getElementById('label-interest-split').textContent = formatCurrency(profitTotal);
    document.getElementById('label-overpayment-split').textContent = formatCurrency(extraTotal);
    
    const profitPercent = mtdTotal > 0 ? Math.round((profitTotal / mtdTotal) * 100) : 0;
    document.getElementById('chart-profit-percent').textContent = `${profitPercent}%`;
    document.getElementById('chart-interest-ring').setAttribute('stroke-dasharray', `${profitPercent}, 100`);

    renderTopRecentWidget(mtdPayments.length > 0 ? mtdPayments : allPayments.slice(0, 10));
}

function renderTopRecentWidget(payments) {
    const list = document.getElementById('top-payments-list');
    if(!list) return;

    const top5 = [...payments].sort((a,b) => Number(b.amount) - Number(a.amount)).slice(0, 5);
    if (top5.length === 0) {
        list.innerHTML = `<div class="text-center py-10 text-xs text-gray-400">No data for period</div>`;
        return;
    }

    list.innerHTML = top5.map(p => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all cursor-pointer" onclick="window.location.href='/admin/application-detail?id=${p.loan_id}'">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-black">${p.profile?.full_name?.charAt(0) || '$'}</div>
                <div>
                    <p class="text-xs font-bold text-gray-900 truncate w-24">${p.profile?.full_name || 'Unknown'}</p>
                    <p class="text-[10px] text-gray-400 font-mono">#${p.loan_id}</p>
                </div>
            </div>
            <span class="text-xs font-black text-green-600">+${formatCurrency(p.amount)}</span>
        </div>
    `).join('');
}

/**
 * Filter & Table Logic
 * Handles Balance States: Overpaid, Complete, Partial
 */
function getFilteredPayments() {
    let filtered = allPayments;
    if (activeTab === 'today') {
        const today = new Date().toISOString().slice(0,10);
        filtered = filtered.filter(p => p.payment_date?.slice(0,10) === today);
    } else if (activeTab === '7days') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        filtered = filtered.filter(p => new Date(p.payment_date) >= d);
    } else if (activeTab === '30days') {
        const d = new Date(); d.setDate(d.getDate() - 30);
        filtered = filtered.filter(p => new Date(p.payment_date) >= d);
    } else if (activeTab === 'custom') {
        const from = document.getElementById('filter-date-from')?.value;
        const to   = document.getElementById('filter-date-to')?.value;
        if (from) filtered = filtered.filter(p => p.payment_date?.slice(0,10) >= from);
        if (to)   filtered = filtered.filter(p => p.payment_date?.slice(0,10) <= to);
    }
    const s = (document.getElementById('search-input')?.value || '').toLowerCase();
    if (s) filtered = filtered.filter(p =>
        (p.profiles?.full_name || '').toLowerCase().includes(s) ||
        (p.reference || '').toLowerCase().includes(s)
    );
    return filtered;
}

function filterAndRender(resetPage = true) {
    if (resetPage) currentPage = 1;
    
    let filtered = allPayments;
    
    if (activeTab === 'today') {
        const today = new Date().toISOString().slice(0,10);
        filtered = filtered.filter(p => p.payment_date?.slice(0,10) === today);
    } else if (activeTab === '7days') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        filtered = filtered.filter(p => new Date(p.payment_date) >= d);
    } else if (activeTab === '30days') {
        const d = new Date(); d.setDate(d.getDate() - 30);
        filtered = filtered.filter(p => new Date(p.payment_date) >= d);
    } else if (activeTab === 'custom') {
        const from = document.getElementById('filter-date-from')?.value;
        const to   = document.getElementById('filter-date-to')?.value;
        if (from) filtered = filtered.filter(p => p.payment_date?.slice(0,10) >= from);
        if (to)   filtered = filtered.filter(p => p.payment_date?.slice(0,10) <= to);
    }

    const term = searchTerm.toLowerCase();
    if (term) {
        filtered = filtered.filter(p => 
            (p.profile?.full_name || '').toLowerCase().includes(term) ||
            String(p.id).includes(term) ||
            String(p.loan_id).includes(term)
        );
    }
    
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);
    
    const tbody = document.getElementById('payments-table-body');
    if(tbody) {
        if (paginated.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-xs text-gray-400 italic">No transactions found.</td></tr>`;
        } else {
            tbody.innerHTML = paginated.map(p => {
                // CONTRACTUAL LOGIC: Handle Balance & Installment
                const balance = p.loan?.outstanding_balance || 0;
                const monthlyRequired = p.loan?.application?.offer_monthly_repayment || 0;
                const amountPaid = Number(p.amount);
                
                let balanceHtml = '';
                let statusHtml = '';

                // Identify Overpaid/Settled/Partial
                if (balance < -1) { 
                    balanceHtml = `<span class="text-[10px] font-bold px-2 py-1 rounded bg-purple-50 text-purple-700 uppercase">Credit: ${formatCurrency(Math.abs(balance))}</span>`;
                    statusHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Overpaid</span>`;
                } else if (balance <= 1) { 
                    balanceHtml = `<span class="text-[10px] font-bold px-2 py-1 rounded bg-green-50 text-green-700 uppercase tracking-tighter">Fully Settled</span>`;
                    statusHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">Complete</span>`;
                } else { 
                    balanceHtml = `<span class="text-[10px] font-bold px-2 py-1 rounded bg-red-50 text-red-700 uppercase tracking-tighter">Due: ${formatCurrency(balance)}</span>`;
                    // Highlight if they underpaid the MONTHLY commitment
                    statusHtml = (amountPaid < monthlyRequired) 
                        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-primary)/15] text-[var(--color-primary)] border border-[var(--color-primary)]">Partial</span>`
                        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">On Track</span>`;
                }

                return `
                <tr class="hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0">
                    <td class="px-6 py-4 text-xs text-gray-500 font-medium whitespace-nowrap">${formatDate(p.payment_date)}</td>
                    <td class="px-6 py-4">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-gray-900">${p.profile?.full_name || 'Unknown'}</span>
                            <span class="text-[10px] text-gray-400 font-mono tracking-tighter">TX ID: #${p.id}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <a href="/admin/application-detail?id=${p.loan_id}" class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100">
                            #${p.loan_id}
                        </a>
                    </td>
                    <td class="px-6 py-4 text-center">${statusHtml}</td>
                    <td class="px-6 py-4 text-right">
                        <span class="text-xs font-black text-gray-900">+ ${formatCurrency(p.amount)}</span>
                    </td>
                    <td class="px-6 py-4 text-right">${balanceHtml}</td>
                </tr>`;
            }).join('');
        }
    }
    
    renderPaginationControls(filtered.length);
}

function renderPaginationControls(totalRecords) {
    const controls = document.getElementById('pagination-controls');
    if(!controls) return;
    const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;

    controls.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Page ${currentPage} of ${totalPages}</span>
            <div class="flex gap-2">
                <button onclick="window.changePageRecovery(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="px-3 py-1 text-[10px] font-bold border rounded-lg bg-white disabled:opacity-30 hover:bg-gray-50 transition-all text-gray-700">Prev</button>
                <button onclick="window.changePageRecovery(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="px-3 py-1 text-[10px] font-bold border rounded-lg bg-white disabled:opacity-30 hover:bg-gray-50 transition-all text-gray-700">Next</button>
            </div>
        </div>`;
}

function attachEventListeners() {
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        searchTerm = e.target.value.trim();
        filterAndRender(true);
    });

    const setTab = (tab) => { activeTab = tab; filterAndRender(true); };
    document.getElementById('tab-today')?.addEventListener('click',  () => setTab('today'));
    document.getElementById('tab-7days')?.addEventListener('click',  () => setTab('7days'));
    document.getElementById('tab-30days')?.addEventListener('click', () => setTab('30days'));
    document.getElementById('tab-all')?.addEventListener('click',    () => setTab('all'));

    // Custom date range
    document.getElementById('filter-date-from')?.addEventListener('change', () => { activeTab = 'custom'; filterAndRender(true); });
    document.getElementById('filter-date-to')?.addEventListener('change',   () => { activeTab = 'custom'; filterAndRender(true); });

    // Export filtered payments as CSV
    document.getElementById('btn-export-payments')?.addEventListener('click', exportPaymentsCSV);
}

function exportPaymentsCSV() {
    const visible = getFilteredPayments();
    if (!visible.length) { alert('No payments to export for this period.'); return; }
    const headers = ['Date', 'Client', 'ID Number', 'Reference', 'Amount Paid', 'Status', 'Payment Method'];
    const rows = visible.map(p => [
        p.payment_date?.slice(0,10) || '',
        `"${(p.profiles?.full_name || '').replace(/"/g,'""')}"`,
        p.profiles?.identity_number || '',
        p.reference || p.id || '',
        p.amount_paid || p.amount || 0,
        p.status || '',
        p.payment_method || ''
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `incoming_payments_${activeTab}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

window.changePageRecovery = (p) => {
    currentPage = p;
    filterAndRender(false);
};

document.addEventListener('DOMContentLoaded', async () => {
  const auth = await initLayout();
  if (auth) {
      renderPageContent();
      await loadData();
  }
});