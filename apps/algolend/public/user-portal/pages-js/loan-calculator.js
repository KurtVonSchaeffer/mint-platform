// Loan Calculator JavaScript

// Load borrower's eligibility band and apply limits to the calculator
async function applyEligibilityLimits() {
    try {
        // Check cached eligibility first
        const cached = sessionStorage.getItem('creditEligibility');
        let eligibility = cached ? JSON.parse(cached) : null;

        // If not cached, fetch from API
        if (!eligibility) {
            const { supabase } = await import('/Services/supabaseClient.js');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch('/api/my-eligibility', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) eligibility = await res.json();
        }

        if (!eligibility?.eligible || !eligibility?.band) return;

        const band = eligibility.band;
        const maxLoan = band.max_loan_amount;
        const maxTerm = band.max_term_months;
        const rate    = band.interest_rate_pa;

        // Update sliders and inputs
        const amountSlider = document.getElementById('loanAmountSlider');
        const amountInput  = document.getElementById('loanAmount');
        const termSlider   = document.getElementById('loanTermSlider');
        const termInput    = document.getElementById('loanTerm');
        const rateSlider   = document.getElementById('interestRateSlider');
        const rateInput    = document.getElementById('interestRate');

        if (amountSlider && maxLoan) {
            amountSlider.max = maxLoan;
            // Cap current value if it exceeds max
            if (parseFloat(amountSlider.value) > maxLoan) {
                amountSlider.value = maxLoan;
                if (amountInput) amountInput.value = maxLoan;
            }
        }
        if (termSlider && maxTerm) {
            termSlider.max = maxTerm;
            if (parseInt(termSlider.value) > maxTerm) {
                termSlider.value = maxTerm;
                if (termInput) termInput.value = maxTerm;
            }
        }
        if (rateSlider && rate) {
            rateSlider.value = rate;
            if (rateInput) rateInput.value = rate;
        }

        // Show eligibility banner
        const banner = document.getElementById('calcEligibilityBanner');
        if (banner) {
            banner.style.display = '';
            banner.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <span style="width:10px;height:10px;border-radius:50%;background:${band.color || '#10b981'};flex-shrink:0;display:inline-block;"></span>
                    <strong style="color:#0F172A;">${band.label} Band</strong>
                    <span style="color:#8E8E93;font-size:12px;">Max R${Number(maxLoan).toLocaleString()} · ${rate}% p.a. · ${maxTerm} months</span>
                    ${eligibility.first_loan_restriction ? `<span style="background:#fff8ed;color:#d97706;font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;">⭐ ${eligibility.first_loan_restriction}</span>` : ''}
                </div>`;
        }

        calculateLoan(rate / 100);
    } catch (e) {
        console.warn('[calculator] eligibility limits:', e.message);
    }
}

// Initialize calculator on page load
function initCalculator() {
  const FIXED_ANNUAL_RATE = 0.20;
  // Sync sliders with inputs
  const loanAmountInput = document.getElementById('loanAmount');
  const loanAmountSlider = document.getElementById('loanAmountSlider');
  const loanTermInput = document.getElementById('loanTerm');
  const loanTermSlider = document.getElementById('loanTermSlider');
  const interestRateInput = document.getElementById('interestRate');
  const interestRateSlider = document.getElementById('interestRateSlider');

  if (loanAmountInput && loanAmountSlider) {
    loanAmountSlider.addEventListener('input', (e) => {
      loanAmountInput.value = e.target.value;
      calculateLoan();
    });

    loanAmountInput.addEventListener('input', (e) => {
      loanAmountSlider.value = e.target.value;
      calculateLoan();
    });
  }

  if (loanTermInput && loanTermSlider) {
    loanTermSlider.addEventListener('input', (e) => {
      loanTermInput.value = e.target.value;
      calculateLoan();
    });

    loanTermInput.addEventListener('input', (e) => {
      loanTermSlider.value = e.target.value;
      calculateLoan();
    });
  }

  if (interestRateInput && interestRateSlider) {
    interestRateSlider.addEventListener('input', (e) => {
      interestRateInput.value = e.target.value;
      calculateLoan();
    });

    interestRateInput.addEventListener('input', (e) => {
      interestRateSlider.value = e.target.value;
      calculateLoan();
    });
  }

  // Calculate on initial load
  calculateLoan(FIXED_ANNUAL_RATE);
}

// Calculate loan
window.calculateLoan = function(fixedAnnualRate = 0.20) {
  const principal = parseFloat(document.getElementById('loanAmount').value) || 0;
  const termMonths = parseInt(document.getElementById('loanTerm').value) || 0;
  const annualRate = fixedAnnualRate;

  if (principal <= 0 || termMonths <= 0) {
    return;
  }

  // Fee structure matching actual loan config
  const MONTHLY_FEE = 60; // R60 admin fee per month
  const INITIATION_FEE_RATE = 0.15; // 15% of loan amount per month
  
  // Calculate simple interest: I = P × R × T
  const totalInterest = principal * annualRate * (termMonths / 12);
  
  // Calculate initiation fees (15% of loan amount per month)
  const initiationFeePerMonth = principal * INITIATION_FEE_RATE;
  const totalInitiationFees = initiationFeePerMonth * termMonths;
  
  // Total admin fees (R60 per month)
  const totalAdminFees = MONTHLY_FEE * termMonths;
  
  // Combined total fees
  const totalFees = totalAdminFees + totalInitiationFees;
  
  // Total repayment = principal + total interest + total fees
  const totalRepayment = principal + totalInterest + totalFees;
  
  // Monthly payment = total repayment / number of months
  const monthlyPayment = totalRepayment / termMonths;

  // Update display
  document.getElementById('monthlyPayment').textContent = formatCurrency(monthlyPayment);
  document.getElementById('totalInterest').textContent = formatCurrency(totalInterest);
  document.getElementById('totalRepayment').textContent = formatCurrency(totalRepayment);
  document.getElementById('principalAmount').textContent = formatCurrency(principal);
  document.getElementById('interestAmount').textContent = formatCurrency(totalInterest + totalFees);
  
  // Update breakdown info text with selected rate
  const breakdownInfo = document.getElementById('breakdownInfo');
  if (breakdownInfo) {
    const ratePercent = (annualRate * 100).toFixed(0);
    breakdownInfo.innerHTML = `<i class="fas fa-info-circle"></i> Includes: Interest (${ratePercent}% annual) + Admin fees (R60/month) + Initiation fees (15%/month)`;
  }

  // Store calculation for apply button
  window.loanCalculation = {
    principal,
    termMonths,
    annualRate: annualRate * 100,
    monthlyPayment,
    totalRepayment,
    totalInterest,
    totalFees,
    totalAdminFees,
    totalInitiationFees
  };
};

// Apply for loan
window.applyForLoan = function() {
  if (!window.loanCalculation) {
    if (typeof showToast === 'function') {
      showToast('Calculate First', 'Please calculate a loan first', 'warning', 3000);
    } else {
      alert('Please calculate a loan first');
    }
    return;
  }

  // Navigate to loan application
  if (typeof loadPage === 'function') {
    loadPage('apply-loan');
  } else {
    window.location.href = '/user-portal/?page=apply-loan';
  }
};

// Format currency
function formatCurrency(value) {
  const number = Number(value) || 0;
  return `R ${number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initCalculator(); applyEligibilityLimits(); });
} else {
  initCalculator();
  applyEligibilityLimits();
}

// Re-initialize on SPA page load
window.addEventListener('pageLoaded', (event) => {
  if (event?.detail?.pageName === 'loan-calculator') {
    setTimeout(() => { initCalculator(); applyEligibilityLimits(); }, 100);
  }
});

document.addEventListener('pageLoaded', (event) => {
  if (event?.detail?.pageName === 'loan-calculator') {
    setTimeout(() => { initCalculator(); applyEligibilityLimits(); }, 100);
  }
});
