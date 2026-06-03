// Payments Dashboard JavaScript
import '/user-portal/Services/sessionGuard.js'; // Production auth guard

let activeLoans = [];
let bankAccounts = [];
let paymentHistory = [];
let selectedLoan = null;

// Initialize dashboard
async function initPaymentsDashboard() {
  try {
    const { supabase } = await import('/Services/supabaseClient.js');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = '/auth/login.html';
      return;
    }

    await Promise.all([
      loadActiveLoans(supabase, session.user.id),
      loadBankAccounts(supabase, session.user.id),
      loadPaymentHistory(supabase, session.user.id)
    ]);

    await loadSureSystemsPaymentHistory(session);

    calculateMetrics();
    renderAll();
    bindEventListeners();
    
    // Initialize mobile collapsible sections after rendering
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        initMobileCollapsibleSections();
      }, 100);
    }

  } catch (error) {
    console.error('Error initializing payments dashboard:', error);
  }
}

function flattenSureSystemsRecords(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const possibleKeys = [
    'payments',
    'paymentHistory',
    'paymenthistory',
    'results',
    'records',
    'data',
    'items',
    'transactions'
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeSureSystemsPayment(item = {}) {
  const amount = Number(
    item.amount
    ?? item.collectionAmount
    ?? item.instalmentAmount
    ?? item.installmentAmount
    ?? item.paidAmount
    ?? 0
  );

  const dateValue = item.paymentDate
    || item.collectionDate
    || item.transactionDate
    || item.date
    || item.processedDate
    || null;

  return {
    id: item.paymentId || item.transactionId || item.id || item.contractReference || `sure-${Math.random().toString(36).slice(2)}`,
    loanId: item.loanId || null,
    applicationId: item.userReference || item.contractReference || null,
    amount: Number.isFinite(amount) ? amount : 0,
    date: dateValue,
    status: (item.status || item.paymentStatus || 'completed').toString().toLowerCase(),
    method: 'SureSystems',
    source: 'suresystems'
  };
}

async function loadSureSystemsPaymentHistory(session) {
  try {
    const response = await fetch('/api/suresystems/payments/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        frontEndUserName: session?.user?.email || 'webuser'
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success === false) {
      console.warn('SureSystems payments download failed:', payload?.error || response.status);
      return;
    }

    const records = flattenSureSystemsRecords(payload);
    if (!records.length) {
      return;
    }

    const normalized = records
      .map((item) => normalizeSureSystemsPayment(item))
      .filter((item) => item.amount > 0 || item.date || item.applicationId);

    if (!normalized.length) {
      return;
    }

    const existingIds = new Set(paymentHistory.map((item) => `${item.source || 'internal'}:${item.id}`));
    for (const item of normalized) {
      const uniqueKey = `${item.source}:${item.id}`;
      if (!existingIds.has(uniqueKey)) {
        paymentHistory.push(item);
      }
    }

    paymentHistory.sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0));
    console.log('✅ SureSystems payment history merged:', normalized.length);
  } catch (error) {
    console.warn('SureSystems payment history unavailable:', error?.message || error);
  }
}

// Load active loans from database
async function loadActiveLoans(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    activeLoans = (data || []).map(loan => {
      const principal = parseFloat(loan.principal_amount) || 0;
      const termMonths = parseInt(loan.term_months, 10) || 0;
      const monthlyPayment = parseFloat(loan.monthly_payment || 0) || 0;
      const totalRepayment = parseFloat(loan.total_repayment) || (monthlyPayment * (termMonths || 1)) || principal;
      const outstandingRaw = parseFloat(loan.outstanding_balance);

      return {
        id: loan.id,
        applicationId: loan.application_id,
        principal,
        totalRepayment,
        outstanding: Number.isFinite(outstandingRaw) && outstandingRaw > 0 ? outstandingRaw : totalRepayment,
        monthlyPayment,
        nextPaymentDate: loan.next_payment_date,
        interestRate: parseFloat(loan.interest_rate),
        termMonths,
        status: loan.status,
        startDate: loan.start_date
      };
    });

    console.log('✅ Loaded active loans:', activeLoans);
  } catch (error) {
    console.error('Error loading active loans:', error);
    activeLoans = [];
  }
}

// Load bank accounts from database
async function loadBankAccounts(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('last_used_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    bankAccounts = (data || []).map(account => ({
      id: account.id,
      bankName: account.bank_name,
      accountHolder: account.account_holder,
      accountNumber: account.account_number,
      branchCode: account.branch_code,
      accountType: account.account_type,
      isPrimary: account.is_primary,
      isVerified: account.is_verified,
      lastUsed: account.last_used_at
    }));

    console.log('✅ Loaded bank accounts:', bankAccounts);
  } catch (error) {
    console.error('Error loading bank accounts:', error);
    bankAccounts = [];
  }
}

// Load payment history from database
async function loadPaymentHistory(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        loans:loan_id (
          id,
          application_id
        )
      `)
      .eq('user_id', userId)
      .order('payment_date', { ascending: false })
      .limit(50);

    if (error) throw error;

    paymentHistory = (data || []).map(payment => ({
      id: payment.id,
      loanId: payment.loan_id,
      applicationId: payment.loans?.application_id,
      amount: parseFloat(payment.amount),
      date: payment.payment_date,
      status: 'completed', // Default to completed for now
      method: 'Card', // Will be updated when payment methods are added
      source: 'internal'
    }));

    console.log('✅ Loaded payment history:', paymentHistory);
  } catch (error) {
    console.error('Error loading payment history:', error);
    paymentHistory = [];
  }
}

// Calculate metrics
function calculateMetrics() {
  const paidByLoan = paymentHistory.reduce((acc, payment) => {
    if (!payment?.loanId) return acc;
    const key = Number(payment.loanId);
    const amount = Number(payment.amount) || 0;
    if (!Number.isFinite(key) || amount <= 0) return acc;
    acc[key] = (acc[key] || 0) + amount;
    return acc;
  }, {});

  activeLoans = activeLoans.map((loan) => {
    const totalDue = Number(loan.totalRepayment) || Number(loan.principal) || 0;
    const paidToDate = paidByLoan[Number(loan.id)] || 0;
    const derivedOutstanding = Math.max(totalDue - paidToDate, 0);
    const fallbackOutstanding = Number(loan.outstanding) || totalDue;
    return {
      ...loan,
      outstanding: paidToDate > 0 ? derivedOutstanding : Math.max(fallbackOutstanding, totalDue)
    };
  });

  const totalOutstanding = activeLoans.reduce((sum, loan) => sum + loan.outstanding, 0);
  const nextPayment = activeLoans.length > 0
    ? Math.min(...activeLoans.map(l => l.monthlyPayment))
    : 0;
  
  const nextDate = activeLoans.length > 0
    ? activeLoans.reduce((earliest, loan) => {
        const date = new Date(loan.nextPaymentDate);
        return !earliest || date < new Date(earliest) ? loan.nextPaymentDate : earliest;
      }, null)
    : null;

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidThisMonth = paymentHistory
    .filter(p => new Date(p.date) >= firstOfMonth)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);

  // Update UI
  document.getElementById('totalOutstanding').textContent = formatCurrency(totalOutstanding);
  document.getElementById('nextPaymentAmount').textContent = formatCurrency(nextPayment);
  document.getElementById('nextPaymentDate').textContent = nextDate ? formatDate(nextDate) : '--';
  document.getElementById('paidThisMonth').textContent = formatCurrency(paidThisMonth);
  document.getElementById('totalPaid').textContent = formatCurrency(totalPaid);
}

// Render all sections
function renderAll() {
  renderActiveLoans();
  renderBankAccounts();
  renderPaymentHistory();
}

// Render active loans
function renderActiveLoans() {
  const container = document.getElementById('activeLoansContainer');
  const countBadge = document.getElementById('activeLoansCount');
  
  countBadge.textContent = activeLoans.length;

  if (activeLoans.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>No active loans</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeLoans.map(loan => {
    const isOverdue = new Date(loan.nextPaymentDate) < new Date();
    const statusClass = isOverdue ? 'overdue' : 'active';
    const statusText = isOverdue ? 'Overdue' : 'Active';

    return `
      <div class="loan-item" data-loan-id="${loan.id}">
        <div class="loan-item-header">
          <span class="loan-reference">Loan #${loan.applicationId || loan.id}</span>
          <span class="loan-status ${statusClass}">${statusText}</span>
        </div>
        <div class="loan-details">
          <div class="loan-detail-item">
            <span class="loan-detail-label">Total Repayment:</span>
            <span class="loan-detail-value">${formatCurrency(loan.totalRepayment || loan.principal)}</span>
          </div>
          <div class="loan-detail-item">
            <span class="loan-detail-label">Outstanding:</span>
            <span class="loan-detail-value">${formatCurrency(loan.outstanding)}</span>
          </div>
          <div class="loan-detail-item">
            <span class="loan-detail-label">Monthly:</span>
            <span class="loan-detail-value">${formatCurrency(loan.monthlyPayment)}</span>
          </div>
          <div class="loan-detail-item">
            <span class="loan-detail-label">Next Due:</span>
            <span class="loan-detail-value">${formatDate(loan.nextPaymentDate)}</span>
          </div>
        </div>
        <div class="loan-item-actions">
          <button class="btn-primary btn-sm" onclick="openPaymentModal(${loan.id})">
            <i class="fas fa-credit-card"></i>
            Pay Now
          </button>
          <button class="btn-secondary btn-sm btn-icon" onclick="viewLoanDetails(${loan.id})">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Render bank accounts
function renderBankAccounts() {
  const container = document.getElementById('bankAccountsContainer');

  if (bankAccounts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-building-columns"></i>
        <p>No saved bank accounts</p>
      </div>
    `;
    return;
  }

  container.innerHTML = bankAccounts.map(account => {
    const masked = maskAccountNumber(account.accountNumber);
    return `
      <div class="bank-account-item ${account.isPrimary ? 'primary' : ''}" data-account-id="${account.id}">
        <div class="account-header">
          <span class="bank-name">
            <i class="fas fa-university"></i>
            ${account.bankName}
            ${account.isPrimary ? '<span class="primary-badge">Primary</span>' : ''}
          </span>
        </div>
        <div class="account-details">
          <div><strong>${account.accountHolder}</strong></div>
          <div class="account-number">${masked}</div>
          <div>${account.accountType}</div>
        </div>
        <div class="account-actions">
          ${!account.isPrimary ? `<button class="btn-secondary btn-sm" onclick="setPrimaryAccount(${account.id})">Set as Primary</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Render payment history
function renderPaymentHistory() {
  const tbody = document.getElementById('paymentHistoryBody');

  if (paymentHistory.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-receipt"></i>
            <p>No payment history yet</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = paymentHistory.map(payment => `
    <tr>
      <td>${formatDate(payment.date)}</td>
      <td>Loan #${payment.applicationId || payment.loanId}</td>
      <td><strong>${formatCurrency(payment.amount)}</strong></td>
      <td><span class="payment-status-badge ${payment.status}">${capitalizeFirst(payment.status)}</span></td>
      <td>${payment.method}</td>
      <td>
        <button class="btn-secondary btn-sm btn-icon" onclick="viewPaymentReceipt(${payment.id})">
          <i class="fas fa-receipt"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// Bind event listeners
function bindEventListeners() {
  // Make payment button
  const makePaymentBtn = document.getElementById('makePaymentBtn');
  if (makePaymentBtn) makePaymentBtn.onclick = () => openPaymentModal();
  
  // Close modal buttons
  document.getElementById('closePaymentModal')?.addEventListener('click', closePaymentModal);
  document.getElementById('cancelPaymentBtn')?.addEventListener('click', closePaymentModal);

  // Add bank account button
  document.getElementById('addBankAccountBtn')?.addEventListener('click', addBankAccount);

  // Payment form
  document.getElementById('paymentForm')?.addEventListener('submit', handlePaymentSubmit);

  // Loan selection change
  document.getElementById('paymentLoanSelect')?.addEventListener('change', handleLoanSelection);

  // Amount suggestion buttons
  document.querySelectorAll('.amount-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.dataset.type;
      if (selectedLoan) {
        const amount = type === 'minimum' ? selectedLoan.monthlyPayment : selectedLoan.outstanding;
        document.getElementById('paymentAmount').value = amount.toFixed(2);
      }
    });
  });

  // Download statement
  document.getElementById('downloadStatementBtn')?.addEventListener('click', downloadStatement);

  // Manual SureSystems sync
  document.getElementById('syncSureSystemsBtn')?.addEventListener('click', syncSureSystemsNow);
}

async function syncSureSystemsNow() {
  const button = document.getElementById('syncSureSystemsBtn');

  try {
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
    }

    const { supabase } = await import('/Services/supabaseClient.js');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      showPaymentStatus('Your session expired. Please sign in again.', 'error');
      return;
    }

    await loadSureSystemsPaymentHistory(session);
    calculateMetrics();
    renderPaymentHistory();
    showPaymentStatus('SureSystems transactions synced.', 'success');
  } catch (error) {
    console.error('Manual SureSystems sync failed:', error);
    showPaymentStatus('SureSystems sync failed. Please try again.', 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = '<i class="fas fa-arrows-rotate"></i> Sync SureSystems';
    }
  }
}

// Initialize collapsible sections for mobile
function initMobileCollapsibleSections() {
  const activeLoansSection = document.querySelector('.active-loans-section');
  const bankAccountsSection = document.querySelector('.bank-accounts-section');

  if (!activeLoansSection || !bankAccountsSection) {
    console.log('⚠️ Collapsible sections not found');
    return;
  }

  // Start with sections collapsed on mobile
  activeLoansSection.classList.add('collapsed');
  bankAccountsSection.classList.add('collapsed');

  console.log('✅ Mobile collapsible sections initialized');

  // Toggle on header click
  const activeLoansHeader = activeLoansSection.querySelector('.section-header');
  const bankAccountsHeader = bankAccountsSection.querySelector('.section-header');

  if (activeLoansHeader) {
    activeLoansHeader.addEventListener('click', (e) => {
      e.stopPropagation();
      activeLoansSection.classList.toggle('collapsed');
      console.log('Active loans toggled:', !activeLoansSection.classList.contains('collapsed') ? 'open' : 'closed');
    });
  }

  if (bankAccountsHeader) {
    bankAccountsHeader.addEventListener('click', (e) => {
      e.stopPropagation();
      bankAccountsSection.classList.toggle('collapsed');
      console.log('Bank accounts toggled:', !bankAccountsSection.classList.contains('collapsed') ? 'open' : 'closed');
    });
  }
}

// Open payment modal
window.openPaymentModal = function(loanId = null) {
  const modal = document.getElementById('paymentModal');
  const select = document.getElementById('paymentLoanSelect');
  
  // Populate loan dropdown
  select.innerHTML = '<option value="">-- Select a loan --</option>' + 
    activeLoans.map(loan => 
      `<option value="${loan.id}">Loan #${loan.applicationId || loan.id} - ${formatCurrency(loan.outstanding)} outstanding</option>`
    ).join('');

  if (loanId) {
    select.value = loanId;
    handleLoanSelection({ target: select });
  }

  modal.classList.remove('hidden');
};

// Close payment modal
function closePaymentModal() {
  document.getElementById('paymentModal').classList.add('hidden');
  document.getElementById('paymentForm').reset();
  document.getElementById('selectedLoanDetails').classList.add('hidden');
  selectedLoan = null;
}

// Handle loan selection in payment form
function handleLoanSelection(event) {
  const loanId = parseInt(event.target.value);
  const detailsCard = document.getElementById('selectedLoanDetails');

  if (!loanId) {
    detailsCard.classList.add('hidden');
    selectedLoan = null;
    return;
  }

  selectedLoan = activeLoans.find(l => l.id === loanId);
  if (!selectedLoan) return;

  detailsCard.innerHTML = `
    <h4>Loan Details</h4>
    <div class="loan-details">
      <div class="loan-detail-item">
        <span class="loan-detail-label">Outstanding Balance:</span>
        <span class="loan-detail-value">${formatCurrency(selectedLoan.outstanding)}</span>
      </div>
      <div class="loan-detail-item">
        <span class="loan-detail-label">Monthly Payment:</span>
        <span class="loan-detail-value">${formatCurrency(selectedLoan.monthlyPayment)}</span>
      </div>
      <div class="loan-detail-item">
        <span class="loan-detail-label">Next Due Date:</span>
        <span class="loan-detail-value">${formatDate(selectedLoan.nextPaymentDate)}</span>
      </div>
    </div>
  `;
  detailsCard.classList.remove('hidden');

  // Set default amount to monthly payment
  document.getElementById('paymentAmount').value = selectedLoan.monthlyPayment.toFixed(2);
}

// Handle payment form submission
async function handlePaymentSubmit(event) {
  event.preventDefault();

  if (!selectedLoan) {
    showPaymentStatus('Please select a loan', 'error');
    return;
  }

  const amount = parseFloat(document.getElementById('paymentAmount').value);
  const method = document.querySelector('input[name="paymentMethod"]:checked').value;

  if (amount <= 0) {
    showPaymentStatus('Please enter a valid amount', 'error');
    return;
  }

  if (amount > selectedLoan.outstanding) {
    showPaymentStatus('Payment amount cannot exceed outstanding balance', 'error');
    return;
  }

  // Show loading state
  const submitBtn = document.getElementById('submitPaymentBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

  try {
    if (method === 'card') {
      // TODO: Integrate with Paystack
      showPaymentStatus('Paystack integration coming soon!', 'error');
      console.log('Payment details:', { loanId: selectedLoan.id, amount, method });
    } else {
      // Manual transfer instructions
      showPaymentStatus('Manual transfer instructions will be displayed here', 'error');
    }
  } catch (error) {
    console.error('Payment error:', error);
    showPaymentStatus('Payment failed. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Continue to Payment</span><i class="fas fa-arrow-right"></i>';
  }
}

// Show payment status message
function showPaymentStatus(message, type) {
  const statusEl = document.getElementById('paymentStatus');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  statusEl.classList.remove('hidden');

  setTimeout(() => {
    statusEl.classList.add('hidden');
  }, 5000);
}

// Set primary bank account
window.setPrimaryAccount = async function(accountId) {
  try {
    const { supabase } = await import('/Services/supabaseClient.js');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return;

    // Remove primary from all accounts
    await supabase
      .from('bank_accounts')
      .update({ is_primary: false })
      .eq('user_id', session.user.id);

    // Set new primary
    await supabase
      .from('bank_accounts')
      .update({ is_primary: true })
      .eq('id', accountId);

    // Reload and re-render
    await loadBankAccounts(supabase, session.user.id);
    renderBankAccounts();

  } catch (error) {
    console.error('Error setting primary account:', error);
    alert('Failed to update primary account');
  }
};

// Add bank account
function addBankAccount() {
  alert('Add bank account feature - redirect to banking form or show modal');
  // TODO: Implement add bank account modal or redirect
}

// View loan details
window.viewLoanDetails = function(loanId) {
  alert(`View details for loan ${loanId}`);
  // TODO: Implement loan details modal or redirect
};

// View payment receipt
window.viewPaymentReceipt = function(paymentId) {
  alert(`View receipt for payment ${paymentId}`);
  // TODO: Implement receipt modal or download
};

// Download statement
function downloadStatement() {
  alert('Download statement feature coming soon');
  // TODO: Implement statement generation and download
}

// Utility functions
function formatCurrency(value) {
  const number = Number(value) || 0;
  return `R ${number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function formatDate(dateValue) {
  if (!dateValue) return '--';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function maskAccountNumber(accountNumber = '') {
  if (!accountNumber) return '';
  const visible = accountNumber.slice(-4);
  return `•••• ${visible}`;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPaymentsDashboard);
} else {
  initPaymentsDashboard();
}

// Re-initialize on page loaded event (for SPA navigation)
window.addEventListener('pageLoaded', (event) => {
  if (event?.detail?.pageName === 'documents') {
    initPaymentsDashboard();
  }
});
