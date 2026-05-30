import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useFeature } from '@/hooks/useFeature';
import { Calculator, TrendingUp, Calendar, Percent, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

/** Standard PMT formula — fixed-rate, fixed-term instalment loan. */
function calculateInstallment(principal: number, annualRate: number, months: number) {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export function LoanCalculatorPage() {
  const [amount, setAmount] = useState(50000);
  const [term, setTerm] = useState(12);
  const [rate, setRate] = useState(20);
  const navigate = useNavigate();
  const hasOpenBanking = useFeature('open_banking');

  const installment = useMemo(() => calculateInstallment(amount, rate, term), [amount, rate, term]);
  const totalPaid = installment * term;
  const totalInterest = totalPaid - amount;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Loan Calculator</h1>
        <p className="text-slate-500 text-sm mt-1">Estimate your monthly repayment before applying. Rates shown are indicative — your final rate is risk-based.</p>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* Inputs */}
        <Card className="p-6 space-y-7">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calculator size={16} className="text-[var(--color-brand)]" />
            <h2 className="text-sm font-semibold text-slate-900">Loan terms</h2>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-700">Loan amount</label>
              <span className="text-lg font-bold text-slate-900">{formatCurrency(amount)}</span>
            </div>
            <input
              type="range"
              min="10000"
              max="500000"
              step="5000"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full accent-[var(--color-brand)]"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>R 10,000</span>
              <span>R 500,000</span>
            </div>
          </div>

          {/* Term */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-700">Repayment term</label>
              <span className="text-lg font-bold text-slate-900">{term} months</span>
            </div>
            <input
              type="range"
              min="3"
              max="60"
              step="1"
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
              className="w-full accent-[var(--color-brand)]"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>3 months</span>
              <span>60 months</span>
            </div>
          </div>

          {/* Rate */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-700">Annual interest rate</label>
              <span className="text-lg font-bold text-slate-900">{rate}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="35"
              step="0.5"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full accent-[var(--color-brand)]"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>10% (lowest risk)</span>
              <span>35% (highest risk)</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">Note:</strong> This is an estimate using a fixed-rate amortising schedule.
            Your actual rate is determined after credit assessment and may differ. NCA-compliant initiation and admin fees are added on approval.
          </div>
        </Card>

        {/* Output */}
        <Card className="p-6 flex flex-col">
          <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">Monthly instalment</div>
          <div className="text-4xl font-extrabold text-[var(--color-brand)] mb-1">{formatCurrency(installment)}</div>
          <div className="text-xs text-slate-400 mb-6">× {term} months</div>

          <div className="space-y-3 mb-6 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-slate-500">
                <TrendingUp size={13} /> Total to repay
              </span>
              <span className="font-semibold text-slate-800">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-slate-500">
                <Percent size={13} /> Total interest
              </span>
              <span className="font-semibold text-slate-800">{formatCurrency(totalInterest)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar size={13} /> Final payment
              </span>
              <span className="font-semibold text-slate-800">
                {new Date(Date.now() + term * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {hasOpenBanking && (
            <div className="mb-5 p-3 rounded-xl bg-[var(--color-brand-muted)]/40 border border-[var(--color-brand-light)]/30">
              <p className="text-xs font-semibold text-[var(--color-brand)]">Pre-qualify instantly</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Connect your bank account via TruID to get a personalised rate in under 60 seconds.</p>
            </div>
          )}

          <Button size="lg" onClick={() => navigate('/client/apply')}>
            Apply for {formatCurrency(amount)} <ArrowRight size={16} />
          </Button>
        </Card>
      </div>

      {/* Amortisation preview */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Repayment breakdown (first 6 months)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-400 font-semibold uppercase tracking-wide">
              <th className="pb-3 pr-4">Month</th>
              <th className="pb-3 pr-4">Instalment</th>
              <th className="pb-3 pr-4">Interest</th>
              <th className="pb-3 pr-4">Principal</th>
              <th className="pb-3">Balance</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let balance = amount;
              const monthlyRate = rate / 100 / 12;
              return Array.from({ length: Math.min(6, term) }).map((_, i) => {
                const interestPortion = balance * monthlyRate;
                const principalPortion = installment - interestPortion;
                balance -= principalPortion;
                return (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 text-slate-500">{i + 1}</td>
                    <td className="py-2.5 pr-4 font-medium text-slate-800">{formatCurrency(installment)}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{formatCurrency(interestPortion)}</td>
                    <td className="py-2.5 pr-4 text-emerald-600">{formatCurrency(principalPortion)}</td>
                    <td className="py-2.5 font-semibold text-slate-900">{formatCurrency(Math.max(0, balance))}</td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
