/**
 * Zkredit - Stablecoin Selector
 * Select which stablecoin to lend/borrow with suggestions
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { StablecoinLogo } from '@/lib/stablecoinLogos';

export type Stablecoin = 'USDT' | 'USDC' | 'DAI' | 'USDD' | 'TUSD' | 'BUSD';

interface StablecoinData {
    symbol: Stablecoin;
    name: string;
    apy: number;
    liquidity: number;
    trend: 'up' | 'down' | 'stable';
    recommendation: 'high' | 'medium' | 'low';
    description: string;
}

const STABLECOIN_DATA: Record<Stablecoin, StablecoinData> = {
    USDT: {
        symbol: 'USDT',
        name: 'Tether USD',
        apy: 8.5,
        liquidity: 95,
        trend: 'up',
        recommendation: 'high',
        description: 'Highest liquidity, most stable'
    },
    USDC: {
        symbol: 'USDC',
        name: 'USD Coin',
        apy: 7.8,
        liquidity: 88,
        trend: 'stable',
        recommendation: 'high',
        description: 'Regulated, trusted by institutions'
    },
    DAI: {
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        apy: 9.2,
        liquidity: 72,
        trend: 'up',
        recommendation: 'medium',
        description: 'Decentralized, over-collateralized'
    },
    USDD: {
        symbol: 'USDD',
        name: 'Decentralized USD',
        apy: 10.1,
        liquidity: 45,
        trend: 'down',
        recommendation: 'low',
        description: 'Higher yield, lower liquidity'
    },
    TUSD: {
        symbol: 'TUSD',
        name: 'TrueUSD',
        apy: 7.2,
        liquidity: 38,
        trend: 'stable',
        recommendation: 'low',
        description: 'Audited, lower volume'
    },
    BUSD: {
        symbol: 'BUSD',
        name: 'Binance USD',
        apy: 6.8,
        liquidity: 52,
        trend: 'down',
        recommendation: 'low',
        description: 'Being phased out by Binance'
    },
};

interface StablecoinSelectorProps {
    value?: Stablecoin;
    onChange?: (coin: Stablecoin) => void;
    showSuggestions?: boolean;
}

export function StablecoinSelector({ value, onChange, showSuggestions = true }: StablecoinSelectorProps) {
    const [selected, setSelected] = useState<Stablecoin>(value || 'USDT');
    const [suggestions, setSuggestions] = useState<StablecoinData[]>([]);

    useEffect(() => {
        // Calculate suggestions based on APY, liquidity, and trends
        const sorted = Object.values(STABLECOIN_DATA)
            .sort((a, b) => {
                // Score: (APY * 0.4) + (Liquidity * 0.4) + (Trend bonus * 0.2)
                const scoreA = (a.apy * 0.4) + (a.liquidity * 0.4) + (a.trend === 'up' ? 2 : a.trend === 'stable' ? 1 : 0);
                const scoreB = (b.apy * 0.4) + (b.liquidity * 0.4) + (b.trend === 'up' ? 2 : b.trend === 'stable' ? 1 : 0);
                return scoreB - scoreA;
            })
            .slice(0, 3);
        
        setSuggestions(sorted);
    }, []);

    const handleChange = (coin: Stablecoin) => {
        setSelected(coin);
        if (onChange) {
            onChange(coin);
        }
    };

    const selectedData = STABLECOIN_DATA[selected];

    return (
        <div className="space-y-4">
            <div>
                <Label className="text-sm mb-2 block">Select Stablecoin</Label>
                <Select value={selected} onValueChange={handleChange}>
                    <SelectTrigger className="w-full bg-card/80 border-2 border-primary/20 hover:border-primary/40 focus:border-primary/60 transition-colors">
                        <SelectValue>
                            <div className="flex items-center gap-2">
                                <StablecoinLogo symbol={selected} size={20} />
                                {selectedData.name} ({selectedData.symbol})
                            </div>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="glass-card border border-white/[0.15]">
                        {Object.values(STABLECOIN_DATA).map((coin) => (
                            <SelectItem
                                key={coin.symbol}
                                value={coin.symbol}
                                className="hover:bg-white/[0.06] focus:bg-white/[0.08] cursor-pointer transition-all duration-200"
                            >
                                <div className="flex items-center justify-between w-full gap-4">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <StablecoinLogo symbol={coin.symbol} size={24} className="flex-shrink-0" />
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                coin.recommendation === 'high' ? 'bg-green-500' :
                                                coin.recommendation === 'medium' ? 'bg-yellow-500' :
                                                'bg-red-500'
                                            }`} />
                                            <span className="font-medium truncate">{coin.name} ({coin.symbol})</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 min-w-[110px]">
                                        <div className="text-sm font-semibold text-primary whitespace-nowrap">
                                            <span className="inline-block w-10 text-right tabular-nums">{coin.apy.toFixed(1)}</span>% APY
                                        </div>
                                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                                            <span className="inline-block w-10 text-right tabular-nums">{coin.liquidity}</span>% liquidity
                                        </div>
                                    </div>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Selected Coin Info */}
            <Card className="glass-card p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <StablecoinLogo symbol={selected} size={32} />
                        <span className="font-medium">{selectedData.name}</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedData.recommendation === 'high' ? 'bg-green-500/20 text-green-500' :
                        selectedData.recommendation === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-red-500/20 text-red-500'
                    }`}>
                        {selectedData.recommendation === 'high' ? 'Recommended' :
                         selectedData.recommendation === 'medium' ? 'Good' : 'Consider'}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{selectedData.description}</p>
                
                <div className="grid grid-cols-3 gap-4 text-xs">
                    <div className="text-center">
                        <p className="text-muted-foreground mb-1">APY</p>
                        <p className="font-semibold text-foreground text-sm">{selectedData.apy}%</p>
                    </div>
                    <div className="text-center">
                        <p className="text-muted-foreground mb-1">Liquidity</p>
                        <p className="font-semibold text-foreground text-sm">{selectedData.liquidity}%</p>
                    </div>
                    <div className="text-center">
                        <p className="text-muted-foreground mb-1">Trend</p>
                        <div className="flex items-center justify-center gap-1">
                            {selectedData.trend === 'up' ? (
                                <TrendingUp className="w-3 h-3 text-green-500" />
                            ) : selectedData.trend === 'down' ? (
                                <TrendingDown className="w-3 h-3 text-red-500" />
                            ) : (
                                <div className="w-3 h-3 rounded-full bg-gray-500" />
                            )}
                            <span className="capitalize text-foreground">{selectedData.trend}</span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
                <Card className="glass-card p-3">
                    <div className="flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4 text-primary" />
                        <Label className="text-sm">Top Recommendations</Label>
                    </div>
                    <div className="space-y-2">
                        {suggestions.map((coin, idx) => (
                            <motion.div
                                key={coin.symbol}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                                    selected === coin.symbol ? 'bg-primary/20 border border-primary' :
                                    'hover:bg-white/[0.08] border border-white/[0.05]'
                                }`}
                                onClick={() => handleChange(coin.symbol)}
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <StablecoinLogo symbol={coin.symbol} size={20} className="flex-shrink-0" />
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        idx === 0 ? 'bg-green-500' :
                                        idx === 1 ? 'bg-yellow-500' : 'bg-gray-500'
                                    }`} />
                                    <span className="font-medium text-sm">{coin.symbol}</span>
                                </div>
                                <div className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                    <span className="font-semibold text-foreground">{coin.apy}%</span> APY • <span className="font-semibold text-foreground">{coin.liquidity}%</span> Liquidity
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}

