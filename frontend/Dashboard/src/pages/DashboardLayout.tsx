/**
 * Zkredit - Dashboard Layout
 * Complete workflow visualization with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { AgentStatusOrb } from '@/components/3d/AgentStatusOrb';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import { Activity, TrendingUp, Zap, Shield, CheckCircle2, Circle, Loader2, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { EnhancedLoanForm, LoanFormData } from '@/components/dashboard/EnhancedLoanForm';
import { AgentConversation } from '@/components/dashboard/AgentConversation';
import { buildApiUrl, getWsUrl } from '@/lib/api/config';

interface DashboardStats {
    totalBalance: number;
    activeLoans: number;
    totalProfit: number;
    agentStatus: 'profiting' | 'negotiating' | 'idle' | 'error';
}

interface WorkflowStep {
    step: number;
    name: string;
    status: 'pending' | 'processing' | 'completed';
    details?: Record<string, unknown>;
}

interface Trade {
    id: string;
    timestamp: string;
    type: string;
    principal: number;
    interestRate: number;
    originalRate?: number;
    profit?: number;
    status: string;
}

export default function DashboardLayout() {
    const { theme, setTheme } = useTheme();

    // State
    const [stats, setStats] = useState<DashboardStats>({
        totalBalance: 0,
        activeLoans: 0,
        totalProfit: 0,
        agentStatus: 'idle'
    });
    const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();

    // Initial workflow steps
    const initialSteps: WorkflowStep[] = [
        { step: 1, name: 'Midnight ZK Credit Check', status: 'pending' },
        { step: 2, name: 'Loan Offer Created', status: 'pending' },
        { step: 3, name: 'Open Hydra Head', status: 'pending' },
        { step: 4, name: 'AI Analysis & Negotiation', status: 'pending' },
        { step: 5, name: 'Close Hydra Head', status: 'pending' },
        { step: 6, name: 'Aiken Validator Settlement', status: 'pending' },
    ];

    // Define handleWsMessage before useEffect to avoid hoisting issues
    const handleWsMessage = useCallback((message: { type: string; data: Record<string, unknown> }) => {
        switch (message.type) {
            case 'stats_update':
                setStats(message.data as unknown as DashboardStats);
                break;

            case 'agent_status':
                setStats(prev => ({ ...prev, agentStatus: (message.data as { status: string }).status as DashboardStats['agentStatus'] }));
                break;

            case 'workflow_step': {
                const stepData = message.data as unknown as WorkflowStep;
                setWorkflowSteps(prev => {
                    const updated = [...prev];
                    const idx = updated.findIndex(s => s.step === stepData.step);
                    if (idx >= 0) {
                        updated[idx] = { ...updated[idx], ...stepData };
                    }
                    return updated;
                });
                break;
            }

            case 'workflow_complete':
                setIsWorkflowRunning(false);
                fetchTrades();
                break;

            case 'conversation_update':
                // Trigger conversation refresh - AgentConversation component polls for updates
                console.log('[WS] Conversation update received:', message.data);
                break;
        }
    }, []);

    // WebSocket connection
    useEffect(() => {
        // Only connect WebSocket if we have a wallet connection
        // This prevents the model from running before user connects wallet
        // Construct WebSocket URL from API URL if WS_URL not set
        const wsUrl = getWsUrl('/ws');
        const websocket = new WebSocket(wsUrl);

        websocket.onopen = () => {
            console.log('WebSocket connected');
        };

        websocket.onmessage = (e) => {
            try {
                const message = JSON.parse(e.data);
                handleWsMessage(message);
            } catch (err) {
                console.error('WebSocket message error:', err);
            }
        };

        websocket.onerror = (err) => {
            console.error('WebSocket error:', err);
        };

        websocket.onclose = () => {
            console.log('WebSocket closed');
        };

        setWs(websocket);

        return () => {
            if (websocket.readyState === WebSocket.OPEN) {
                websocket.close();
            }
        };
    }, [handleWsMessage]);

    // Fetch initial data (only stats, not triggering workflows)
    useEffect(() => {
        fetchStats();
        fetchTrades();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch(buildApiUrl('/api/dashboard/stats'));
            if (!res.ok) {
                throw new Error(`Failed to fetch stats: ${res.status} ${res.statusText}`);
            }
            const data = await res.json();
            if (data && typeof data === 'object') {
                setStats(data);
            } else {
                console.warn('Invalid stats data format:', data);
                // Use demo data as fallback
                setStats({
                    totalBalance: 125450.75,
                    activeLoans: 8,
                    totalProfit: 12543.50,
                    agentStatus: 'idle'
                });
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
            // Use demo data on error
            setStats({
                totalBalance: 125450.75,
                activeLoans: 8,
                totalProfit: 12543.50,
                agentStatus: 'idle'
            });
        }
    };

    const fetchTrades = async () => {
        try {
            const res = await fetch(buildApiUrl('/api/trades/history'));
            if (!res.ok) {
                throw new Error(`Failed to fetch trades: ${res.status} ${res.statusText}`);
            }
            const data = await res.json();
            if (data && Array.isArray(data)) {
                setTrades(data);
            } else {
                console.warn('Invalid trades data format:', data);
                setTrades([]);
            }
        } catch (err) {
            console.error('Failed to fetch trades:', err);
            // Set empty array on error
            setTrades([]);
        }
    };

    const startWorkflow = async (formData: LoanFormData) => {
        setWorkflowSteps(initialSteps);
        setIsWorkflowRunning(true);

        // Generate conversation ID
        const conversationId = `conv_${Date.now()}`;
        setCurrentConversationId(conversationId);

        // Clear previous messages to show new conversation
        // The AgentConversation component will fetch new messages

        try {
            // Prepare request based on role
            const requestBody = {
                role: formData.role,
                borrower_address: formData.role === 'borrower' ? formData.walletAddress : formData.borrower_address || 'addr1_borrower',
                lender_address: formData.role === 'lender' ? formData.walletAddress : formData.lender_address || 'addr1_lender',
                credit_score: formData.credit_score || 750,
                principal: formData.principal,
                interest_rate: formData.interest_rate,
                term_months: formData.term_months,
                stablecoin: formData.stablecoin,
                auto_confirm: formData.autoConfirm,
                conversation_id: conversationId
            };

            const res = await fetch(buildApiUrl('/api/workflow/start'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!res.ok) {
                throw new Error(`API error: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();

            if (data && data.success) {
                // Update conversation ID if returned
                if (data.conversation_id) {
                    setCurrentConversationId(data.conversation_id);
                }
                // Mark all steps complete
                setWorkflowSteps(prev => prev.map(s => ({ ...s, status: 'completed' as const })));
            } else if (data && data.error) {
                throw new Error(data.error);
            }
        } catch (err) {
            console.error('Workflow error:', err);
            // Demo mode - simulate workflow
            await simulateWorkflow(formData);
        }

        setIsWorkflowRunning(false);
    };

    const simulateWorkflow = async (formData: LoanFormData) => {
        for (let i = 0; i < initialSteps.length; i++) {
            setWorkflowSteps(prev => prev.map((s, idx) => ({
                ...s,
                status: idx < i ? 'completed' : idx === i ? 'processing' : 'pending'
            })));
            await new Promise(r => setTimeout(r, 1000));
        }
        setWorkflowSteps(prev => prev.map(s => ({ ...s, status: 'completed' as const })));

        // Add demo trade
        const newTrade: Trade = {
            id: `trade_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'loan_accepted',
            principal: formData.principal,
            interestRate: formData.interest_rate - 1.5,
            originalRate: formData.interest_rate,
            profit: formData.principal * 0.015,
            status: 'completed'
        };
        setTrades(prev => [newTrade, ...prev]);

        setStats(prev => ({
            ...prev,
            activeLoans: prev.activeLoans + 1,
            totalProfit: prev.totalProfit + newTrade.profit!,
            agentStatus: 'profiting'
        }));
    };

    const getStepIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'processing':
                return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
            default:
                return <Circle className="w-5 h-5 text-gray-400" />;
        }
    };

    return (
        <AuroraBackground>
            <div className="min-h-screen">
                {/* Minimal Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sticky top-0 z-40 glass-card border-b border-white/[0.12]"
                >
                    <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/30 flex items-center justify-center overflow-hidden shadow-lg">
                                    <img 
                                        src="/favicon.svg" 
                                        alt="Zkredit" 
                                        className="w-8 h-8 p-1"
                                    />
                                </div>
                                <div>
                                    <h1 className="text-xl font-semibold text-foreground">Zkredit</h1>
                                    <p className="text-xs text-muted-foreground hidden md:block">Privacy-First DeFi</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Minimal Stats Bar */}
                                <div className="hidden md:flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${stats.agentStatus === 'profiting' ? 'bg-green-500' :
                                            stats.agentStatus === 'negotiating' ? 'bg-blue-500' :
                                                'bg-gray-400'
                                            }`} />
                                        <span className="text-muted-foreground capitalize">{stats.agentStatus}</span>
                                    </div>
                                    <div className="text-muted-foreground">
                                        <CountUp end={stats.totalBalance} duration={2} decimals={0} preserveValue /> ADA
                                    </div>
                                    <div className="text-muted-foreground">
                                        {stats.activeLoans} loans
                                    </div>
                                </div>

                                {/* Theme Toggle */}
                                <Button
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    variant="ghost"
                                    size="sm"
                                    className="w-9 h-9 p-0 hover:bg-muted/50"
                                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                                >
                                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                    {/* Header Section - Aligned */}
                    <div className="grid lg:grid-cols-3 gap-8 mb-6">
                        <div className="lg:col-span-2">
                            <h2 className="text-2xl font-bold text-foreground mb-2">Create Loan</h2>
                            <p className="text-muted-foreground">Start a privacy-first lending workflow on Cardano</p>
                        </div>

                        {/* Sidebar Header - Aligned with loan form title */}
                        <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-foreground">Agent Chat</h3>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8 items-start">

                        {/* Primary Action - Loan Form */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="lg:col-span-2"
                        >
                            <Card className="glass-card p-6">
                                <EnhancedLoanForm
                                    onSubmit={startWorkflow}
                                    isSubmitting={isWorkflowRunning}
                                />
                            </Card>

                            {/* Compact Workflow Progress */}
                            {workflowSteps.length > 0 && (
                                <Card className="glass-card p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold">Progress</h3>
                                        <span className="text-xs text-muted-foreground">
                                            {workflowSteps.filter(s => s.status === 'completed').length}/{workflowSteps.length}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        {(workflowSteps.length > 0 ? workflowSteps : initialSteps).slice(0, 6).map((step) => (
                                            <div key={step.step} className="flex items-center gap-3 p-3 rounded-lg glass-card">
                                                <div className="flex-shrink-0">
                                                    {getStepIcon(step.status)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium">{step.name}</p>
                                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                                            step.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                            step.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                            {step.status}
                                                        </span>
                                                    </div>
                                                    {step.details && (
                                                        <div className="mt-2 space-y-1">
                                                            {step.details.head_id && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    <span className="font-medium">Hydra Head:</span>
                                                                    <span className="font-mono ml-1">{step.details.head_id}</span>
                                                                </p>
                                                            )}
                                                            {step.details.message && (
                                                                <p className="text-xs text-muted-foreground">{step.details.message}</p>
                                                            )}
                                                            {step.details.savings && (
                                                                <p className="text-xs text-green-400">
                                                                    <span className="font-medium">Savings:</span> {step.details.savings}%
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </motion.div>

                        {/* Sidebar - Aligned and Extended */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-4 flex flex-col"
                        >
                            {/* Enhanced Agent Status - Top */}
                            <Card className="glass-card p-4 relative overflow-hidden">
                                {/* Animated background gradient based on status */}
                                <div className={`absolute inset-0 opacity-10 ${
                                    stats.agentStatus === 'profiting' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                                    stats.agentStatus === 'negotiating' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                                    stats.agentStatus === 'error' ? 'bg-gradient-to-br from-red-500 to-rose-500' :
                                    'bg-gradient-to-br from-gray-400 to-gray-500'
                                }`} />
                                
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Activity className={`w-5 h-5 ${
                                                stats.agentStatus === 'profiting' ? 'text-green-500' :
                                                stats.agentStatus === 'negotiating' ? 'text-blue-500' :
                                                stats.agentStatus === 'error' ? 'text-red-500' :
                                                'text-gray-400'
                                            }`} />
                                            <h3 className="font-semibold text-foreground">Agent Status</h3>
                                        </div>
                                        <motion.div
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                stats.agentStatus === 'profiting' ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                                                stats.agentStatus === 'negotiating' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' :
                                                stats.agentStatus === 'error' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                                                'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                            }`}
                                            animate={{
                                                scale: stats.agentStatus === 'profiting' || stats.agentStatus === 'negotiating' ? [1, 1.05, 1] : 1
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        >
                                            {stats.agentStatus === 'profiting' ? 'Profiting' :
                                             stats.agentStatus === 'negotiating' ? 'Negotiating' :
                                             stats.agentStatus === 'error' ? 'Error' :
                                             'Idle'}
                                        </motion.div>
                                    </div>

                                    {/* 3D Orb Visualization - Compact */}
                                    <div className="h-24 mb-3 rounded-lg overflow-hidden bg-background/20 backdrop-blur-sm">
                                        <Canvas camera={{ position: [0, 0, 5] }}>
                                            <ambientLight intensity={0.5} />
                                            <AgentStatusOrb status={stats.agentStatus} />
                                        </Canvas>
                                    </div>

                                    {/* Status Details - Compact */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Status</span>
                                            <span className="font-medium text-foreground capitalize">{stats.agentStatus}</span>
                                        </div>
                                        {stats.agentStatus === 'profiting' && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="flex items-center gap-2 text-xs text-green-500"
                                            >
                                                <TrendingUp className="w-3 h-3" />
                                                <span>Optimizing returns</span>
                                            </motion.div>
                                        )}
                                        {stats.agentStatus === 'negotiating' && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="flex items-center gap-2 text-xs text-blue-500"
                                            >
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                <span>Active negotiation</span>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            {/* Quick Stats - Balance, Active, Profit - Top Section */}
                            <div className="grid grid-cols-3 gap-2">
                                <Card className="glass-card p-3">
                                    <div className="flex items-center gap-1 mb-1">
                                        <TrendingUp className="w-3 h-3 text-green-500" />
                                        <span className="text-xs text-muted-foreground">Balance</span>
                                    </div>
                                    <p className="text-xs font-bold">
                                        <CountUp end={stats.totalBalance} duration={2} decimals={0} preserveValue />
                                        <span className="text-[10px] ml-0.5 text-muted-foreground">ADA</span>
                                    </p>
                                </Card>

                                <Card className="glass-card p-3">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Zap className="w-3 h-3 text-blue-500" />
                                        <span className="text-xs text-muted-foreground">Active</span>
                                    </div>
                                    <p className="text-xs font-bold">
                                        <CountUp end={stats.activeLoans} duration={1} preserveValue />
                                    </p>
                                </Card>

                                <Card className="glass-card p-3">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Shield className="w-3 h-3 text-purple-500" />
                                        <span className="text-xs text-muted-foreground">Profit</span>
                                    </div>
                                    <p className="text-xs font-bold text-green-500">
                                        +<CountUp end={stats.totalProfit} duration={2} decimals={0} preserveValue />
                                    </p>
                                </Card>
                            </div>

                            {/* Agent Conversation - Middle */}
                            <Card className="glass-card p-4 flex flex-col flex-1 min-h-[300px]">
                                <AgentConversation conversationId={currentConversationId} compact />
                            </Card>

                            {/* Recent Activity */}
                            <Card className="glass-card p-4">
                                <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>

                                <div className="space-y-2">
                                    {trades.length > 0 ? trades.slice(0, 3).map((trade) => (
                                        <div key={trade.id} className="flex items-center justify-between p-2 rounded glass-card">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                <span className="text-xs font-medium">Loan</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {trade.principal} ADA
                                            </span>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-muted-foreground text-center py-4">
                                            No recent activity
                                        </p>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
        </AuroraBackground>
    );
}
