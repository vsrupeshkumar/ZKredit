/**
 * Interactive Charts Component
 * Premium data visualization with smooth animations
 */

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface InteractiveChartsProps {
    trades?: Array<{
        timestamp: string;
        principal: number;
        interestRate: number;
        profit?: number;
    }>;
}

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
    payload?: Array<{
        name: string;
        value: number;
        color: string;
        dataKey: string;
        payload: {
            name?: string;
        };
    }>;
}

// Custom tooltip component defined outside to prevent re-creation on render
const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <Card className="glass-card p-3 border-border bg-card">
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">{payload[0].payload.name}</p>
                    {payload.map((entry, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm font-medium text-foreground">
                                {entry.name}: {Number(entry.value).toFixed(2)}
                                {entry.dataKey === 'rate' && '%'}
                                {(entry.dataKey === 'principal' || entry.dataKey === 'profit') && ' ADA'}
                            </span>
                        </div>
                    ))}
                </div>
            </Card>
        );
    }
    return null;
};

export function InteractiveCharts({ trades = [] }: InteractiveChartsProps) {
    // Transform trades data for charts
    const chartData = trades.slice(-7).map((trade, index) => {
        const date = new Date(trade.timestamp);
        return {
            name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            principal: trade.principal,
            rate: trade.interestRate,
            profit: trade.profit || 0,
            index
        };
    });

    // Calculate metrics
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const avgRate = trades.length > 0
        ? trades.reduce((sum, t) => sum + t.interestRate, 0) / trades.length
        : 0;
    const rateChange = trades.length >= 2
        ? trades[trades.length - 1].interestRate - trades[trades.length - 2].interestRate
        : 0;

    return (
        <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="glass-card p-6 border-border hover:border-green-500/40 transition-colors">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Total Profit</p>
                                <h3 className="text-2xl font-bold text-green-400">
                                    {totalProfit.toFixed(2)} ADA
                                </h3>
                            </div>
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <DollarSign className="w-5 h-5 text-green-400" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs">
                            <TrendingUp className="w-3 h-3 text-green-400 mr-1" />
                            <span className="text-green-400 font-medium">+12.5%</span>
                            <span className="text-muted-foreground ml-1">vs last week</span>
                        </div>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="glass-card p-6 border-border hover:border-blue-500/40 transition-colors">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Avg Interest Rate</p>
                                <h3 className="text-2xl font-bold text-blue-400">
                                    {avgRate.toFixed(2)}%
                                </h3>
                            </div>
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <Activity className="w-5 h-5 text-blue-400" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs">
                            {rateChange < 0 ? (
                                <>
                                    <TrendingDown className="w-3 h-3 text-green-400 mr-1" />
                                    <span className="text-green-400 font-medium">{rateChange.toFixed(2)}%</span>
                                </>
                            ) : (
                                <>
                                    <TrendingUp className="w-3 h-3 text-red-400 mr-1" />
                                    <span className="text-red-400 font-medium">+{rateChange.toFixed(2)}%</span>
                                </>
                            )}
                            <span className="text-muted-foreground ml-1">vs last trade</span>
                        </div>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="glass-card p-6 border-border hover:border-purple-500/40 transition-colors">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Active Loans</p>
                                <h3 className="text-2xl font-bold text-purple-400">
                                    {trades.length}
                                </h3>
                            </div>
                            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                <TrendingUp className="w-5 h-5 text-purple-400" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs">
                            <span className="text-muted-foreground">Total loans negotiated</span>
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Loan Volume Chart */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="glass-card p-6 border border-border">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                            <DollarSign className="w-5 h-5 text-primary" />
                            Loan Volume
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="principalGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.2} />
                                <XAxis
                                    dataKey="name"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="principal"
                                    stroke="#6366f1"
                                    fill="url(#principalGradient)"
                                    strokeWidth={2}
                                    animationDuration={1000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </motion.div>

                {/* Interest Rate Trend */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <Card className="glass-card p-6 border border-border">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                            <Activity className="w-5 h-5 text-primary" />
                            Interest Rate Trend
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.2} />
                                <XAxis
                                    dataKey="name"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    domain={['dataMin - 1', 'dataMax + 1']}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="rate"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    dot={{ fill: '#8b5cf6', r: 4 }}
                                    activeDot={{ r: 6 }}
                                    animationDuration={1000}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </motion.div>

                {/* Profit Analysis */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="lg:col-span-2"
                >
                    <Card className="glass-card p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Profit Analytics
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={chartData}>
                                <defs>
                                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.3} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.2} />
                                <XAxis
                                    dataKey="name"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    iconType="circle"
                                />
                                <Bar
                                    dataKey="profit"
                                    fill="url(#profitGradient)"
                                    radius={[8, 8, 0, 0]}
                                    animationDuration={1000}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
