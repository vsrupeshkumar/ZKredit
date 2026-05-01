/**
 * Zkredit - Enhanced Loan Form
 * Complete form with role selection, wallet, stablecoin, and auto-confirm
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { WalletConnection } from './WalletConnection';
import { StablecoinSelector, Stablecoin } from './StablecoinSelector';
import { Play, Loader2, User, Building2, Zap, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { validateLoanFormData } from '@/lib/validation';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'borrower' | 'lender';

interface EnhancedLoanFormProps {
    onSubmit: (data: LoanFormData) => Promise<void>;
    isSubmitting?: boolean;
}

export interface LoanFormData {
    role: UserRole;
    walletAddress: string;
    stablecoin: Stablecoin;
    principal: number;
    interest_rate: number;
    term_months: number;
    credit_score?: number;
    autoConfirm: boolean;
    borrower_address?: string;
    lender_address?: string;
}

export function EnhancedLoanForm({ onSubmit, isSubmitting = false }: EnhancedLoanFormProps) {
    const [role, setRole] = useState<UserRole>('borrower');
    const [walletAddress, setWalletAddress] = useState('');
    const [stablecoin, setStablecoin] = useState<Stablecoin>('USDT');
    const [principal, setPrincipal] = useState(1000);
    const [interestRate, setInterestRate] = useState(8.5);
    const [termMonths, setTermMonths] = useState(12);
    const [creditScore, setCreditScore] = useState(750);
    const [autoConfirm, setAutoConfirm] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const { toast } = useToast();

    const handleSubmit = async () => {
        // Validate form data
        const formData = {
            role,
            walletAddress,
            stablecoin,
            principal,
            interest_rate: interestRate,
            term_months: termMonths,
            credit_score: role === 'borrower' ? creditScore : undefined,
            autoConfirm,
            borrower_address: role === 'borrower' ? walletAddress : undefined,
            lender_address: role === 'lender' ? walletAddress : undefined,
        };

        const validation = validateLoanFormData(formData);
        
        if (!validation.valid) {
            setValidationErrors(validation.errors);
            toast({
                title: "Validation Error",
                description: validation.errors.join(', '),
                variant: "destructive",
            });
            return;
        }

        setValidationErrors([]);
        await onSubmit(validation.data!);
    };

    return (
        <Card className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold">Start New Loan</h3>
            </div>

            <div className="space-y-6">
                {/* Role Selection */}
                <div>
                    <Label className="text-sm mb-3 block">I want to be a:</Label>
                    <div className="grid grid-cols-2 gap-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setRole('borrower')}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                role === 'borrower'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-white/[0.12] bg-white/[0.04] hover:border-primary/40 hover:bg-white/[0.06]'
                            }`}
                        >
                            <User className={`w-6 h-6 mx-auto mb-2 ${
                                role === 'borrower' ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                            <p className="font-medium">Borrower</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Request a loan
                            </p>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setRole('lender')}
                            aria-label="Select lender role"
                            aria-pressed={role === 'lender'}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                role === 'lender'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-white/[0.12] bg-white/[0.04] hover:border-primary/40 hover:bg-white/[0.06]'
                            }`}
                        >
                            <Building2 className={`w-6 h-6 mx-auto mb-2 ${
                                role === 'lender' ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                            <p className="font-medium">Lender</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Provide liquidity
                            </p>
                        </motion.button>
                    </div>
                </div>

                {/* Wallet Connection */}
                <div>
                    <WalletConnection
                        onAddressChange={setWalletAddress}
                        defaultAddress={walletAddress}
                    />
                </div>

                {/* Stablecoin Selection */}
                <div>
                    <StablecoinSelector
                        value={stablecoin}
                        onChange={setStablecoin}
                        showSuggestions={true}
                    />
                </div>

                {/* Loan Parameters */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-sm text-muted-foreground">Principal Amount</Label>
                        <Input
                            type="number"
                            value={principal}
                            onChange={(e) => setPrincipal(Number(e.target.value))}
                            className="mt-1"
                            min={1}
                            aria-label="Principal amount"
                            aria-required="true"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Amount in {stablecoin}
                        </p>
                    </div>
                    <div>
                        <Label className="text-sm text-muted-foreground">Interest Rate (%)</Label>
                        <Input
                            type="number"
                            step="0.1"
                            value={interestRate}
                            onChange={(e) => setInterestRate(Number(e.target.value))}
                            className="mt-1"
                            min={0}
                            max={100}
                            aria-label="Interest rate percentage"
                            aria-required="true"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Annual percentage rate
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-sm text-muted-foreground">Term (Months)</Label>
                        <Input
                            type="number"
                            value={termMonths}
                            onChange={(e) => setTermMonths(Number(e.target.value))}
                            className="mt-1"
                            min={1}
                            max={60}
                        />
                    </div>
                    {role === 'borrower' && (
                        <div>
                            <Label className="text-sm text-muted-foreground">Credit Score (Private)</Label>
                            <Input
                                type="number"
                                value={creditScore}
                                onChange={(e) => setCreditScore(Number(e.target.value))}
                                className="mt-1"
                                min={300}
                                max={850}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Used for ZK proof only
                            </p>
                        </div>
                    )}
                </div>

                {/* Auto-Confirm Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg glass-card border border-white/[0.12]">
                    <div className="flex-1">
                        <Label className="text-sm font-medium">Auto-Confirm Good Deals</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                            Allow AI agent to automatically accept deals that meet your criteria
                        </p>
                    </div>
                    <Switch
                        checked={autoConfirm}
                        onCheckedChange={setAutoConfirm}
                    />
                </div>

                {/* Submit Button */}
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-primary to-secondary"
                    size="lg"
                    aria-label="Start loan workflow"
                    aria-busy={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4 mr-2" />
                            Start {role === 'borrower' ? 'Loan Request' : 'Lending'}
                        </>
                    )}
                </Button>

                {!walletAddress && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-xs text-center text-amber-500 mt-2"
                    >
                        <AlertCircle className="w-4 h-4" />
                        <span>Wallet address recommended but not required</span>
                    </motion.div>
                )}
            </div>
        </Card>
    );
}

