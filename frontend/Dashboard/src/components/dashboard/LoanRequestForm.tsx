import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
    DollarSign, 
    Percent, 
    Calendar, 
    Wallet, 
    Sparkles,
    CheckCircle2,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { buildApiUrl } from '@/lib/api/config';

interface LoanRequestFormProps {
    borrowerAddress: string;
    onWorkflowStart?: (workflowId: string) => void;
}

export function LoanRequestForm({ borrowerAddress, onWorkflowStart }: LoanRequestFormProps) {
    const [principal, setPrincipal] = useState<number>(1000);
    const [interestRate, setInterestRate] = useState<number>(8.5);
    const [termMonths, setTermMonths] = useState<number>(12);
    const [creditScore, setCreditScore] = useState<number>(750);
    const [lenderAddress, setLenderAddress] = useState<string>('addr1_lender_default');
    const [stablecoin, setStablecoin] = useState<string>('USDT');
    const [autoConfirm, setAutoConfirm] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch(buildApiUrl('/api/workflow/start'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    role: 'borrower',
                    borrower_address: borrowerAddress,
                    lender_address: lenderAddress,
                    credit_score: creditScore,
                    principal: principal,
                    interest_rate: interestRate,
                    term_months: termMonths,
                    stablecoin: stablecoin,
                    auto_confirm: autoConfirm,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                if (onWorkflowStart && data.conversation_id) {
                    onWorkflowStart(data.conversation_id);
                }
                // Reset form after 2 seconds
                setTimeout(() => {
                    setSuccess(false);
                    setIsSubmitting(false);
                }, 2000);
            } else {
                setError(data.reason || 'Failed to start loan workflow');
                setIsSubmitting(false);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error occurred');
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="glass-panel p-6 border border-border">
            <div className="flex items-center gap-3 mb-8">
                <Sparkles className="w-6 h-6 text-primary" />
                <h3 className="text-2xl font-bold text-foreground">Create Loan Request</h3>
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3"
                >
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-600">{error}</p>
                </motion.div>
            )}

            {success && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3"
                >
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <p className="text-sm text-green-600">Loan workflow started successfully! AI agents are now negotiating...</p>
                </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Principal Amount */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <DollarSign className="w-4 h-4 text-primary" />
                        Principal Amount ({stablecoin})
                    </label>
                    <input
                        type="number"
                        min="100"
                        step="100"
                        value={principal}
                        onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm"
                        required
                    />
                    <p className="text-xs text-muted-foreground">Minimum: 100 {stablecoin}</p>
                </div>

                {/* Interest Rate */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Percent className="w-4 h-4 text-primary" />
                        Initial Interest Rate (%)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={interestRate}
                        onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm"
                        required
                    />
                    <p className="text-xs text-muted-foreground">AI agent will negotiate for better rates</p>
                </div>

                {/* Term */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Calendar className="w-4 h-4 text-primary" />
                        Loan Term (Months)
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="60"
                        value={termMonths}
                        onChange={(e) => setTermMonths(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm"
                        required
                    />
                    <p className="text-xs text-muted-foreground">Loan duration in months</p>
                </div>

                {/* Credit Score */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Wallet className="w-4 h-4 text-primary" />
                        Credit Score (Private - ZK Proof)
                    </label>
                    <input
                        type="number"
                        min="600"
                        max="850"
                        value={creditScore}
                        onChange={(e) => setCreditScore(parseInt(e.target.value) || 700)}
                        className="w-full px-4 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm"
                        required
                    />
                    <p className="text-xs text-muted-foreground">Your credit score remains private via Midnight ZK proofs (minimum: 700)</p>
                </div>

                {/* Lender Address */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Lender Address</label>
                    <input
                        type="text"
                        value={lenderAddress}
                        onChange={(e) => setLenderAddress(e.target.value)}
                        placeholder="addr1_lender_..."
                        className="w-full px-4 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors font-mono text-sm"
                        required
                    />
                    <p className="text-xs text-muted-foreground">Cardano address of the lender</p>
                </div>

                {/* Stablecoin Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Stablecoin</label>
                    <select
                        value={stablecoin}
                        onChange={(e) => setStablecoin(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-input border border-border text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm"
                    >
                        <option value="USDT">USDT</option>
                        <option value="USDC">USDC</option>
                        <option value="DAI">DAI</option>
                    </select>
                </div>

                {/* Auto-Confirm Toggle */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
                    <input
                        type="checkbox"
                        id="autoConfirm"
                        checked={autoConfirm}
                        onChange={(e) => setAutoConfirm(e.target.checked)}
                        className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    />
                    <label htmlFor="autoConfirm" className="text-sm cursor-pointer text-foreground">
                        Auto-confirm good deals (AI will automatically accept favorable terms)
                    </label>
                </div>

                {/* Submit Button */}
                <Button
                    type="submit"
                    disabled={isSubmitting || success}
                    className="w-full py-6 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Starting Workflow...
                        </>
                    ) : success ? (
                        <>
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            Workflow Started!
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            Start Loan Request
                        </>
                    )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                    Your loan request will be processed through Midnight ZK credit check, 
                    AI-powered negotiation via Hydra Heads, and Aiken smart contract settlement.
                </p>
            </form>
        </Card>
    );
}

