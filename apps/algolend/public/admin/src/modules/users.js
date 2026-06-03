import { initLayout } from '../shared/layout.js';
import { fetchUsers, fetchBranches, claimClientProtocol, getCurrentAdminProfile, fetchFullUserProfile } from '../services/dataService.js';
import { supabase } from '../services/supabaseClient.js'; 
import { formatDate, formatCurrency, validateSAID } from '../shared/utils.js';
import { renderProfileCard } from '../components/profile-card.js';

// --- STATE ---
let allUsers = [];
let branches = [];
let currentAdmin = null;
let currentUserDetail = null;
let currentPageUsers = 1;
const itemsPerPageUsers = 20;

// Filters
let searchFilter = '';
let branchFilter = 'all';
let roleFilter = 'all';

// --- TEMPLATES ---

const LIST_VIEW_HTML = `
<div id="view-list" class="flex flex-col h-full animate-fade-in">
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
    <div>
      <h1 class="text-2xl font-headline font-bold text-on-surface tracking-tight">User Directory</h1>
      <p class="mt-1 text-[11px] font-semibold uppercase tracking-widest text-outline">Manage institutional clients and branch assignments.</p>
    </div>
    
    <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <select id="role-filter" class="bg-white border border-gray-200 text-gray-700 py-2.5 pl-4 pr-10 rounded-2xl text-sm font-bold focus:ring-[#a04100] shadow-sm">
            <option value="all">All Roles</option>
            <option value="client">Clients</option>
            <option value="staff">Staff</option>
        </select>

        <select id="branch-filter" class="bg-white border border-gray-200 text-gray-700 py-2.5 pl-4 pr-10 rounded-2xl text-sm font-bold focus:ring-[#a04100] w-full sm:w-48 shadow-sm">
            <option value="all">All Branches</option>
            <option disabled>Loading...</option>
        </select>

        <div class="relative w-full sm:w-72">
            <input type="text" id="user-search" placeholder="Search Identity, Email, ID..." 
                   class="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-[#a04100] text-sm font-bold shadow-sm">
            <span class="material-symbols-outlined absolute left-4 top-2.5 text-slate-400">search</span>
        </div>
    </div>
  </div>

  <div class="glass-card rounded-2xl flex flex-col overflow-hidden flex-1 min-h-0">
    <div class="overflow-auto custom-scrollbar"> 
      <table class="min-w-full divide-y divide-slate-50 relative">
        <thead class="bg-white sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]"> 
          <tr>
            <th class="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Identity</th>
            <th class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Match Key</th>
            <th class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch</th>
            <th class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Compliance</th>
            <th class="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
          </tr>
        </thead>
        <tbody id="users-table-body" class="bg-white divide-y divide-slate-50">
          <tr><td colspan="5" class="p-20 text-center text-slate-300 font-bold">Initialising Directory...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div class="mt-4 flex justify-between items-center px-2">
    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registry <span id="visible-count">0</span></div>
    <div id="user-pagination-container"></div>
  </div>
</div>
`;

const DETAIL_VIEW_HTML = `
<div id="view-detail" class="hidden flex flex-col h-full animate-fade-in bg-gray-50 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
    <div class="flex items-center justify-between mb-6">
        <button onclick="window.switchView('list')" class="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors">
            <div class="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <i class="fa-solid fa-arrow-left"></i>
            </div>
            Back to Directory
        </button>
        <div class="flex gap-2">
            <button id="btn-transfer-branch" class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 shadow-sm">
                <i class="fa-solid fa-building-columns mr-2 text-[#a04100]"></i> Transfer Branch
            </button>
        </div>
    </div>

    <div class="grid grid-cols-12 gap-8 h-full overflow-hidden">
        
        <div id="profile-card-container" class="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-10">
            <!-- Profile Card Injected Here -->
        </div>

        <div class="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-10">

            <div class="glass-card p-6 rounded-2xl">
                <h3 class="text-sm font-semibold uppercase tracking-widest text-outline mb-4 flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">account_balance_wallet</span> Financial Snapshot
                </h3>
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-surface-container p-3 rounded-xl">
                        <p class="text-[10px] text-outline uppercase">Gross Income</p>
                        <p id="detail-income" class="text-sm font-bold text-on-surface">-</p>
                    </div>
                    <div class="bg-surface-container p-3 rounded-xl">
                        <p class="text-[10px] text-outline uppercase">Expenses</p>
                        <p id="detail-expenses" class="text-sm font-bold text-on-surface">-</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-10">
            
            <div class="grid grid-cols-3 gap-4">
                <div class="glass-card p-4 rounded-2xl">
                    <div class="text-[10px] font-semibold uppercase tracking-widest text-outline">Total Loans</div>
                    <div id="stat-total-loans" class="text-2xl font-extrabold text-on-surface mt-1">0</div>
                </div>
                <div class="glass-card p-4 rounded-2xl">
                    <div class="text-[10px] font-semibold uppercase tracking-widest text-outline">Active Debt</div>
                    <div id="stat-active-debt" class="text-2xl font-extrabold mt-1" style="color:var(--color-primary)">R 0.00</div>
                </div>
                <div class="glass-card p-4 rounded-2xl">
                    <div class="text-[10px] font-semibold uppercase tracking-widest text-outline">Uploaded Docs</div>
                    <div id="stat-total-docs" class="text-2xl font-extrabold text-blue-600 mt-1">0</div>
                </div>
            </div>

            <div class="glass-card rounded-2xl overflow-hidden">
                <div class="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center">
                    <h3 class="font-headline font-bold text-on-surface">Application History</h3>
                    <span class="text-[11px] font-semibold uppercase tracking-widest text-outline">Most recent first</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-outline-variant/10">
                        <thead class="bg-surface-container">
                            <tr>
                                <th class="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-outline">ID</th>
                                <th class="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-outline">Date</th>
                                <th class="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-outline">Amount</th>
                                <th class="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-outline">Status</th>
                                <th class="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-outline">Action</th>
                            </tr>
                        </thead>
                        <tbody id="detail-loans-body" class="bg-white divide-y divide-outline-variant/10">
                            </tbody>
                    </table>
                </div>
            </div>

            <div class="glass-card p-6 rounded-2xl">
                 <h3 class="font-headline font-bold text-on-surface mb-4">Uploaded Documents</h3>
                 <div id="detail-docs-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    </div>
            </div>

        </div>
    </div>
</div>

<div id="branch-modal" class="hidden fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center backdrop-blur-sm">
    <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md m-4 animate-scale-in">
        <h3 class="text-lg font-bold text-gray-900 mb-4">Transfer User Branch</h3>
        <p class="text-sm text-gray-500 mb-4">Select the new branch for <span id="modal-username" class="font-bold text-gray-800"></span>.</p>
        
        <select id="modal-branch-select" class="w-full border border-gray-300 rounded-lg p-2.5 text-sm mb-6 focus:ring-[var(--color-primary)]"></select>
        
        <div class="flex justify-end gap-3">
            <button onclick="document.getElementById('branch-modal').classList.add('hidden')" class="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onclick="window.confirmBranchTransfer()" class="px-4 py-2 text-sm font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)] rounded-lg shadow-sm">Confirm Transfer</button>
        </div>
    </div>
</div>
`;

// --- HELPER FUNCTIONS ---

const isStaff = (role) => ['admin', 'super_admin', 'base_admin'].includes(role);

const getRoleLabel = (role) => {
    const roles = { 'super_admin': 'SUPER ADMIN', 'admin': 'BRANCH MANAGER', 'base_admin': 'LOAN OFFICER' };
    return roles[role] || 'CLIENT';
};

const getStatusBadge = (status) => {
    const s = (status || 'UNKNOWN').toUpperCase();
    let color = 'bg-gray-100 text-gray-600';
    if(s === 'DISBURSED') color = 'bg-green-100 text-green-700';
    if(s === 'DECLINED') color = 'bg-red-100 text-red-700';
    if(['STARTED', 'SUBMITTED'].includes(s)) color = 'bg-blue-50 text-blue-700';
    return `<span class="px-2 py-0.5 rounded text-[10px] font-bold ${color}">${s}</span>`;
};

// --- CORE LOGIC ---

window.switchView = (viewName) => {
    const list = document.getElementById('view-list');
    const detail = document.getElementById('view-detail');
    
    if (viewName === 'detail') {
        list.classList.add('hidden');
        detail.classList.remove('hidden');
    } else {
        list.classList.remove('hidden');
        detail.classList.add('hidden');
        currentUserDetail = null; // Clear memory
    }
};

window.openUserDetail = async (userId) => {
    try {
        document.body.style.cursor = 'wait';
        const data = await fetchFullUserProfile(userId);
        currentUserDetail = data;

        const p = data.profile;
        const isLuhnValid = validateSAID(p.identity_number || p.id_number);
        
        // Inject Premium Profile Card
        const container = document.getElementById('profile-card-container');
        if (container) container.innerHTML = renderProfileCard(p, { isLuhnValid });
        
        // Financials
        const fins = data.financials || {};
        document.getElementById('detail-income').textContent = formatCurrency(fins.monthly_income || 0);
        document.getElementById('detail-expenses').textContent = formatCurrency(fins.monthly_expenses || 0);

        // Stats
        document.getElementById('stat-total-loans').textContent = data.loans.length;
        document.getElementById('stat-total-docs').textContent = data.documents.length;
        
        const activeDebt = data.loans
            .filter(l => ['DISBURSED', 'ACTIVE'].includes(l.status))
            .reduce((sum, l) => sum + Number(l.amount), 0);
        document.getElementById('stat-active-debt').textContent = formatCurrency(activeDebt);

        // Render Loans Table
        const loanBody = document.getElementById('detail-loans-body');
        if (data.loans.length === 0) {
            loanBody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-xs font-bold text-slate-300">No applications found.</td></tr>`;
        } else {
            loanBody.innerHTML = data.loans.map(l => `
                <tr class="hover:bg-slate-50 transition-colors cursor-pointer group" onclick="window.location.href='/admin/application-detail?id=${l.id}'">
                    <td class="px-8 py-5 text-[10px] font-black text-slate-400 font-mono">#${l.id.substring(0, 8)}</td>
                    <td class="px-6 py-5 text-xs font-bold text-slate-600">${formatDate(l.created_at)}</td>
                    <td class="px-6 py-5 text-sm font-black text-slate-900">${formatCurrency(l.amount)}</td>
                    <td class="px-6 py-5">${getStatusBadge(l.status)}</td>
                    <td class="px-8 py-5 text-right">
                        <span class="material-symbols-outlined text-slate-300 group-hover:text-[#a04100] transition-colors">chevron_right</span>
                    </td>
                </tr>
            `).join('');
        }

        // Render Docs Grid
        const docGrid = document.getElementById('detail-docs-grid');
        if (data.documents.length === 0) {
            docGrid.innerHTML = `<div class="col-span-3 text-center text-[10px] font-black text-slate-400 py-8 border-2 border-dashed border-slate-50 rounded-3xl">No documents found</div>`;
        } else {
            docGrid.innerHTML = data.documents.map(d => `
                <div class="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/20 transition-all group">
                    <div class="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[#a04100] shadow-sm">
                        <span class="material-symbols-outlined">description</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[10px] font-black text-slate-900 truncate" title="${d.file_name}">${d.file_name}</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${d.file_type || 'DOC'}</p>
                    </div>
                    <a href="${d.file_path}" target="_blank" class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-[#a04100] transition-all"><span class="material-symbols-outlined text-[20px]">download</span></a>
                </div>
            `).join('');
        }

        const btnTransfer = document.getElementById('btn-transfer-branch');
        if (btnTransfer) btnTransfer.onclick = () => window.openBranchModal();

        window.switchView('detail');

    } catch (error) {
        console.error("Detail Error:", error);
        alert("Could not load user details.");
    } finally {
        document.body.style.cursor = 'default';
    }
};

window.openBranchModal = () => {
    if(!currentUserDetail) return;
    const p = currentUserDetail.profile;
    
    document.getElementById('modal-username').textContent = p.full_name;
    const select = document.getElementById('modal-branch-select');
    
    select.innerHTML = '<option value="online">Online / Unassigned</option>';
    branches.forEach(b => {
        const option = document.createElement('option');
        option.value = b.id;
        option.textContent = b.name;
        if(p.branch_id === b.id) option.selected = true;
        select.appendChild(option);
    });

    document.getElementById('branch-modal').classList.remove('hidden');
};

window.confirmBranchTransfer = async () => {
    const btn = document.querySelector('#branch-modal button.bg-[var(--color-primary)]');
    const newBranchId = document.getElementById('modal-branch-select').value;
    const p = currentUserDetail.profile;

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Moving...';

        const updateValue = (newBranchId === 'online') ? null : newBranchId;

        // 1. Update Profile
        const { error } = await supabase.from('profiles').update({ branch_id: updateValue }).eq('id', p.id);
        if (error) throw error;

        // 2. Update Loans
        await supabase.from('loan_applications').update({ branch_id: updateValue }).eq('user_id', p.id);

        alert('Success! User transferred.');
        document.getElementById('branch-modal').classList.add('hidden');
        window.location.reload(); 

    } catch (err) {
        alert('Transfer failed: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Confirm Transfer';
    }
};

// --- LIST RENDERER ---

const renderUserList = (data) => {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    const start = (currentPageUsers - 1) * itemsPerPageUsers;
    const paginatedData = data.slice(start, start + itemsPerPageUsers);

    if (paginatedData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-20 text-center text-slate-300 font-bold">No results matching your query.</td></tr>`;
        return;
    }

    tbody.innerHTML = paginatedData.map(u => {
        const branchName = u.branches?.name || 'Online';
        const isLuhnValid = validateSAID(u.identity_number || u.id_number);
        
        return `
        <tr class="hover:bg-slate-50/50 transition-colors group cursor-pointer" onclick="window.openUserDetail('${u.id}')">
            <td class="px-8 py-6">
                <div class="flex items-center gap-4">
                    <div class="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-black text-slate-400">
                        ${(u.full_name || 'U').charAt(0)}
                    </div>
                    <div>
                        <div class="text-sm font-black text-slate-900">${u.full_name || 'Unknown'}</div>
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${getRoleLabel(u.role)}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-6">
                <div class="text-[10px] font-black text-slate-500 font-mono tracking-tighter">
                    ${u.id.substring(0, 13).toUpperCase()}
                </div>
            </td>
            <td class="px-6 py-6">
                 <span class="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500">
                    ${branchName}
                 </span>
            </td>
            <td class="px-6 py-6">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full ${isLuhnValid ? 'bg-emerald-500' : 'bg-red-500'}"></span>
                        <span class="text-[10px] font-black uppercase tracking-widest ${isLuhnValid ? 'text-emerald-600' : 'text-red-600'}">
                            ${isLuhnValid ? 'ID Valid' : 'ID Invalid'}
                        </span>
                    </div>
                    ${u.employer_verified ? '<div class="text-[10px] font-bold text-blue-600 flex items-center gap-1"><span>✓</span> Employer verified</div>' : ''}
                    ${u.credit_limit_override ? `<div class="text-[10px] font-bold text-[var(--color-primary)]">Cap: R${Number(u.credit_limit_override).toLocaleString('en-ZA')}</div>` : ''}
                    ${u.last_active_at ? `<div class="text-[9px] text-slate-400">Active: ${new Date(u.last_active_at).toLocaleDateString('en-ZA')}</div>` : ''}
                </div>
            </td>
            <td class="px-8 py-6 text-right">
                <button class="w-10 h-10 flex items-center justify-center text-slate-300 group-hover:text-[#a04100] transition-colors">
                    <span class="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
            </td>
        </tr>`;
    }).join('');

    const countEl = document.getElementById('visible-count');
    if (countEl) countEl.textContent = data.length;

    renderUserPaginationControls(Math.ceil(data.length / itemsPerPageUsers) || 1);
};

// ✅ FIXED: applyFilters now handles page resets correctly
const applyFilters = (resetPage = true) => {
    if (resetPage) currentPageUsers = 1;

    const term = document.getElementById('user-search').value.toLowerCase();
    const role = document.getElementById('role-filter').value;
    const branch = document.getElementById('branch-filter').value;

    const filtered = allUsers.filter(u => {
        // Search: Name, Email, ID Number, or UUID
        const textMatch = !term || 
            (u.full_name || '').toLowerCase().includes(term) ||
            (u.email || '').toLowerCase().includes(term) ||
            (u.identity_number || '').includes(term) ||
            (u.id || '').includes(term); 

        // Role Filter
        const isUserStaff = isStaff(u.role);
        let roleMatch = true;
        if(role === 'client') roleMatch = !isUserStaff;
        if(role === 'staff') roleMatch = isUserStaff;

        // Branch Filter
        const branchMatch = (branch === 'all') || (u.branch_id?.toString() === branch) || (branch === 'online' && !u.branch_id);

        return textMatch && roleMatch && branchMatch;
    });

    renderUserList(filtered);
};

// --- INIT ---

document.addEventListener('DOMContentLoaded', async () => {
  await initLayout();
  
  // Inject Main Views
  const main = document.getElementById('main-content');
  main.innerHTML = LIST_VIEW_HTML + DETAIL_VIEW_HTML;
  main.className = 'flex-1 p-4 sm:p-6 lg:p-8 h-screen overflow-hidden flex flex-col'; 

  try {
      const [admin, usersData, branchesResult] = await Promise.all([
          getCurrentAdminProfile(),
          fetchUsers(),
          fetchBranches()
      ]);

      currentAdmin = admin;
      allUsers = usersData;
      branches = branchesResult.data || [];

      // Populate Branch Filters
      const branchSelect = document.getElementById('branch-filter');
      branchSelect.innerHTML = '<option value="all">All Branches</option><option value="online">Online / Unassigned</option>';
      branches.forEach(b => branchSelect.innerHTML += `<option value="${b.id}">${b.name}</option>`);

      // --- ROLE FILTER LOCK ---
      // Fix: Only Super Admins can see "Staff" or "All"
      const roleSelect = document.getElementById('role-filter');
      
      if (currentAdmin.role !== 'super_admin') {
          roleSelect.innerHTML = '<option value="client">Clients</option>';
          roleSelect.value = 'client';
          roleSelect.disabled = true;
          roleSelect.classList.add('bg-gray-100', 'text-gray-500', 'cursor-not-allowed');
          
          // Apply filter immediately so they don't see staff
          applyFilters(true);
      } else {
          // Super Admins: Show everything by default
          renderUserList(allUsers);
      }

      // Event Listeners
      document.getElementById('user-search').addEventListener('input', () => applyFilters(true));
      document.getElementById('role-filter').addEventListener('change', () => applyFilters(true));
      document.getElementById('branch-filter').addEventListener('change', () => applyFilters(true));

  } catch (err) {
      console.error(err);
      main.innerHTML = `<div class="p-8 text-center text-red-500">Failed to load directory: ${err.message}</div>`;
  }
});

function renderUserPaginationControls(totalPages) {
    let container = document.getElementById('user-pagination-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'user-pagination-container';
        container.className = 'flex justify-between items-center p-4 border-t border-gray-100 bg-gray-50/50';
        document.getElementById('view-list').appendChild(container);
    }

    if (totalPages <= 1) {
        container.innerHTML = `<span class="text-xs text-gray-400">Showing all users</span>`;
        return;
    }

    container.innerHTML = `
        <span class="text-xs font-bold text-gray-500 uppercase tracking-tight">Page ${currentPageUsers} of ${totalPages}</span>
        <div class="flex gap-2">
            <button onclick="window.changePageUsers(${currentPageUsers - 1})" ${currentPageUsers === 1 ? 'disabled' : ''} class="px-4 py-2 text-xs font-bold border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-30 transition-all shadow-sm">Prev</button>
            <button onclick="window.changePageUsers(${currentPageUsers + 1})" ${currentPageUsers === totalPages ? 'disabled' : ''} class="px-4 py-2 text-xs font-bold border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-30 transition-all shadow-sm">Next</button>
        </div>
    `;
}

// Global function to switch pages
window.changePageUsers = (page) => {
    currentPageUsers = page;
    applyFilters(false); 
};