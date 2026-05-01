/**
 * Zkredit - Trade Timeline Component
 * Scroll-linked 3D trade cards with Kasane tilt/blur effect
 */

import { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Trade {
    id: string;
    timestamp: Date;
    type: 'loan_accepted' | 'loan_repaid' | 'negotiation';
    principal: number;
    interestRate: number;
    profit?: number;
    status: 'completed' | 'pending';
}

interface TradeTimelineProps {
    trades: Trade[];
}

// Helper component to apply blur as a motion style
function BlurredCard({ 
    children, 
    rotateX, 
    opacity, 
    scale, 
    blur,
    cardRef 
}: { 
    children: React.ReactNode;
    rotateX: MotionValue<number>;
    opacity: MotionValue<number>;
    scale: MotionValue<number>;
    blur: MotionValue<string>;
    cardRef: React.RefObject<HTMLDivElement>;
}) {
    return (
        <motion.div
            ref={cardRef}
            style={{
                rotateX,
                opacity,
                scale,
                filter: blur,
                transformStyle: 'preserve-3d',
                perspective: 1000,
            }}
            className="mb-8"
        >
            {children}
        </motion.div>
    );
}

function TradeCard({ trade }: { trade: Trade; index: number }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: cardRef,
        offset: ["start end", "end start"]
    });

    // Kasane Effect: 3D tilt based on scroll position
    const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -15]);
    const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.3, 1, 1, 0.3]);
    const blur = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], (v) => {
        const blurAmount = v < 0.3 ? 4 * (1 - v / 0.3) : v > 0.7 ? 4 * ((v - 0.7) / 0.3) : 0;
        return blurAmount > 0.1 ? `blur(${blurAmount}px)` : 'none';
    });
    const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);

    const isProfit = (trade.profit ?? 0) > 0;

    return (
        <BlurredCard 
            cardRef={cardRef} 
            rotateX={rotateX} 
            opacity={opacity} 
            scale={scale} 
            blur={blur}
        >
            <Card className="p-6 backdrop-blur-xl bg-white/10 dark:bg-cyber-charcoal/80 border-fog-gray dark:border-neon-cyan/30 hover:border-neon-cyan dark:hover:border-neon-cyan transition-all duration-300">
                {/* Semantic HTML for accessibility */}
                <article aria-label={`Trade ${trade.id}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">
                                {trade.type === 'loan_accepted' && 'Loan Accepted'}
                                {trade.type === 'loan_repaid' && 'Loan Repaid'}
                                {trade.type === 'negotiation' && 'Negotiation'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {trade.timestamp.toLocaleString()}
                            </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${trade.status === 'completed'
                                ? 'bg-profit-green/20 text-profit-green'
                                : 'bg-amber-500/20 text-amber-500'
                            }`}>
                            {trade.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Principal</p>
                            <p className="text-2xl font-bold text-foreground">
                                {trade.principal} ADA
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Interest Rate</p>
                            <p className="text-2xl font-bold text-electric-blue">
                                {trade.interestRate}%
                            </p>
                        </div>
                    </div>

                    {trade.profit !== undefined && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg ${isProfit
                                ? 'bg-profit-green/10 border border-profit-green/30'
                                : 'bg-loss-red/10 border border-loss-red/30'
                            }`}>
                            {isProfit ? (
                                <TrendingUp className="w-5 h-5 text-profit-green" />
                            ) : (
                                <TrendingDown className="w-5 h-5 text-loss-red" />
                            )}
                            <span className={`text-lg font-bold ${isProfit ? 'text-profit-green' : 'text-loss-red'
                                }`}>
                                {isProfit ? '+' : ''}{trade.profit} ADA
                            </span>
                        </div>
                    )}
                </article>
            </Card>
        </BlurredCard>
    );
}

export function TradeTimeline({ trades }: TradeTimelineProps) {
    return (
        <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-neon-cyan to-transparent dark:via-neon-cyan/50" />

            <div className="pl-8">
                <h2 className="text-4xl font-bold mb-8 text-foreground">
                    Trade History
                </h2>

                {trades.map((trade, index) => (
                    <TradeCard key={trade.id} trade={trade} index={index} />
                ))}
            </div>
        </div>
    );
}
