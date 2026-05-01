/**
 * Zkredit - Main Dashboard
 * Displays loan requests, negotiations, and analytics
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FluidBackground } from '@/components/ui/FluidBackground';
import { InteractiveCharts } from '@/components/dashboard/InteractiveCharts';
import { WalletConnection } from '@/components/dashboard/WalletConnection';
import { AgentStatus } from '@/components/dashboard/AgentStatus';
import { HydraStatus } from '@/components/dashboard/HydraStatus';
import { LoanRequestForm } from '@/components/dashboard/LoanRequestForm';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Badge } from '@/components/ui/badge';
import {
    LayoutDashboard,
    Settings,
    LogOut,
    Plus,
    Bell,
    Search,
    Bot,
    Network
} from 'lucide-react';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [walletAddress, setWalletAddress] = useState<string>('');

    // WebSocket connection for real-time updates
    const {
        isConnected,
        agentStatus,
        currentConversation,
        hydraStatus,
        workflowSteps
    } = useWebSocket();

    // Mock data for charts (could be replaced with real data from WebSocket)
    const mockTrades = [
        { timestamp: '2024-01-01', principal: 5000, interestRate: 8.5, profit: 120 },
        { timestamp: '2024-01-15', principal: 7500, interestRate: 8.2, profit: 180 },
        { timestamp: '2024-02-01', principal: 6000, interestRate: 8.0, profit: 150 },
        { timestamp: '2024-02-15', principal: 9000, interestRate: 7.8, profit: 210 },
        { timestamp: '2024-03-01', principal: 12000, interestRate: 7.5, profit: 300 },
        { timestamp: '2024-03-15', principal: 10000, interestRate: 7.2, profit: 250 },
        { timestamp: '2024-04-01', principal: 15000, interestRate: 7.0, profit: 400 },
    ];

    return (
        <>
            <FluidBackground variant="default" intensity="low" />

            <div className="min-h-screen flex relative z-10">
                {/* Sidebar */}
                <motion.aside
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="w-64 glass-panel border-r border-border hidden md:flex flex-col p-6 fixed h-full z-10"
                >
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                            <div className="w-6 h-6 bg-primary rounded" />
                        </div>
                        <h1 className="text-xl font-bold text-foreground">
                            Zkredit
                        </h1>
                    </div>

                    <nav className="space-y-2 flex-1">
                        {[
                            { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                            { id: 'agents', icon: Bot, label: 'AI Agents' },
                            { id: 'hydra', icon: Network, label: 'Hydra Network' },
                            { id: 'requests', icon: Plus, label: 'Loan Requests' },
                            { id: 'settings', icon: Settings, label: 'Settings' },
                        ].map((item) => (
                            <Button
                                key={item.id}
                                variant={activeTab === item.id ? "secondary" : "ghost"}
                                className={`w-full justify-start gap-3 text-sm font-medium ${
                                    activeTab === item.id 
                                        ? 'bg-secondary text-secondary-foreground border border-border' 
                                        : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={() => setActiveTab(item.id)}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Button>
                        ))}
                    </nav>

                    <Button variant="ghost" className="justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        <LogOut className="w-5 h-5" />
                        Disconnect
                    </Button>
                </motion.aside>

                {/* Main Content */}
                <main className="flex-1 md:ml-64 p-8">
                    {/* Header */}
                    <header className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-3xl font-bold mb-2 text-foreground">Dashboard</h2>
                            <p className="text-muted-foreground text-base">Welcome back, Borrower</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative hidden sm:block">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search loans..."
                                    className="pl-10 pr-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors w-64 text-sm"
                                />
                            </div>

                            <Button size="icon" variant="ghost" className="rounded-full relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                            </Button>

                            <WalletConnection
                                defaultAddress={walletAddress}
                                onAddressChange={(address) => setWalletAddress(address)}
                            />
                        </div>
                    </header>

                    {/* Content Area */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-8"
                    >
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <>
                                {/* Connection Status */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card className="glass-panel p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <div>
                                                <p className="text-sm font-medium">Backend</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {isConnected ? 'Connected' : 'Disconnected'}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="glass-panel p-4">
                                        <div className="flex items-center gap-3">
                                            <Bot className={`w-5 h-5 ${agentStatus.status === 'idle' ? 'text-green-500' : 'text-blue-500'}`} />
                                            <div>
                                                <p className="text-sm font-medium">AI Agent</p>
                                                <p className="text-xs text-muted-foreground capitalize">
                                                    {agentStatus.status}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="glass-panel p-4">
                                        <div className="flex items-center gap-3">
                                            <Network className={`w-5 h-5 ${hydraStatus.mode === 'hydra' ? 'text-green-500' : hydraStatus.mode === 'direct' ? 'text-blue-500' : 'text-red-500'}`} />
                                            <div>
                                                <p className="text-sm font-medium">Hydra Network</p>
                                                <p className="text-xs text-muted-foreground capitalize">
                                                    {hydraStatus.mode}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                {/* Analytics Section */}
                                <section>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-semibold text-foreground">Market Overview</h3>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" className="rounded-full">1W</Button>
                                            <Button size="sm" variant="outline" className="rounded-full bg-primary text-primary-foreground border-none">1M</Button>
                                            <Button size="sm" variant="outline" className="rounded-full">1Y</Button>
                                        </div>
                                    </div>

                                    <InteractiveCharts trades={mockTrades} />
                                </section>

                                {/* Recent Activity */}
                                <section>
                                    <h3 className="text-xl font-semibold mb-6 text-foreground">Recent Activity</h3>
                                    <div className="grid gap-4">
                                        {[1, 2, 3].map((i) => (
                                            <Card key={i} className="glass-panel p-5 flex items-center justify-between hover-lift border border-border">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-foreground text-base">Loan Request #{1000 + i}</h4>
                                                        <p className="text-sm text-muted-foreground mt-1">Negotiating via Hydra Head</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-foreground text-base">5,000 ADA</p>
                                                    <p className="text-sm text-green-500 mt-1">8.5% APR</p>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}

                        {/* AI Agents Tab */}
                        {activeTab === 'agents' && (
                            <AgentStatus
                                status={agentStatus.status}
                                task={agentStatus.task}
                                conversation={currentConversation}
                                workflowSteps={workflowSteps}
                            />
                        )}

                        {/* Hydra Network Tab */}
                        {activeTab === 'hydra' && (
                            <div className="space-y-6">
                                <HydraStatus
                                    mode={hydraStatus.mode}
                                    connected={hydraStatus.connected}
                                    headState={hydraStatus.head_state}
                                    activeNegotiations={hydraStatus.active_negotiations}
                                    currentHeadId={hydraStatus.current_head_id}
                                />

                                {/* Workflow Steps if active */}
                                {workflowSteps.length > 0 && (
                                    <Card className="glass-panel p-6">
                                        <h3 className="text-lg font-semibold mb-4">Active Workflow</h3>
                                        <div className="space-y-3">
                                            {workflowSteps.map((step, _index) => (
                                                <div key={step.step} className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                                                        {step.step}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium">{step.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {step.details?.message || JSON.stringify(step.details)}
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline" className="capitalize">
                                                        {step.status}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </div>
                        )}

                        {/* Loan Requests Tab */}
                        {activeTab === 'requests' && (
                            <section>
                                <h3 className="text-xl font-semibold mb-6">Loan Requests</h3>
                                {walletAddress ? (
                                    <LoanRequestForm
                                        borrowerAddress={walletAddress}
                                        onWorkflowStart={(workflowId) => {
                                            console.log('Workflow started:', workflowId);
                                            // Optionally switch to agents tab to see the negotiation
                                            setActiveTab('agents');
                                        }}
                                    />
                                ) : (
                                    <Card className="glass-panel p-6">
                                        <div className="text-center py-8">
                                            <p className="text-muted-foreground mb-4">
                                                Please connect your wallet to create a loan request
                                            </p>
                                            <WalletConnection
                                                defaultAddress=""
                                                onAddressChange={(address) => setWalletAddress(address)}
                                            />
                                        </div>
                                    </Card>
                                )}
                            </section>
                        )}

                        {/* Settings Tab */}
                        {activeTab === 'settings' && (
                            <section>
                                <h3 className="text-xl font-semibold mb-6">Settings</h3>
                                <Card className="glass-panel p-6">
                                    <p className="text-muted-foreground">Settings panel coming soon...</p>
                                </Card>
                            </section>
                        )}
                    </motion.div>
                </main>
            </div>
        </>
    );
}
