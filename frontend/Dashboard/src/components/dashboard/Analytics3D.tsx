/**
 * Zkredit - 3D Analytics Dashboard
 * Holographic charts for loan analytics
 */

import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsChart3D } from '@/components/3d/AnalyticsChart3D';
import { TrendingUp, DollarSign, Activity } from 'lucide-react';
import { buildApiUrl } from '@/lib/api/config';

interface AnalyticsData {
    profit: Array<{ x: number; y: number; value: number; label: string }>;
    loans: Array<{ x: number; y: number; value: number; label: string }>;
    rates: Array<{ x: number; y: number; value: number; label: string }>;
}

export function Analytics3D() {
    const [data, setData] = useState<AnalyticsData>({
        profit: [],
        loans: [],
        rates: []
    });
    const [activeTab, setActiveTab] = useState<'profit' | 'loans' | 'rates'>('profit');

    useEffect(() => {
        // Fetch analytics data
        const fetchData = async () => {
            try {
                const res = await fetch(buildApiUrl('/api/analytics'));
                
                if (res.ok) {
                    const analytics = await res.json();
                    setData(analytics);
                } else {
                    // Generate mock data
                    generateMockData();
                }
            } catch (err) {
                console.error('Failed to fetch analytics:', err);
                generateMockData();
            }
        };

        fetchData();
    }, []);

    const generateMockData = () => {
        // Generate sample data for visualization
        const profitData = Array.from({ length: 12 }, (_, i) => ({
            x: i,
            y: 0,
            value: 1000 + Math.random() * 2000 + i * 100,
            label: `Month ${i + 1}`
        }));

        const loansData = Array.from({ length: 10 }, (_, i) => ({
            x: i,
            y: 0,
            value: 5 + Math.random() * 10,
            label: `Loan ${i + 1}`
        }));

        const ratesData = Array.from({ length: 8 }, (_, i) => ({
            x: i,
            y: 0,
            value: 6.5 + Math.random() * 2,
            label: `${(6.5 + Math.random() * 2).toFixed(1)}%`
        }));

        setData({
            profit: profitData,
            loans: loansData,
            rates: ratesData
        });
    };

    const getCurrentData = () => {
        switch (activeTab) {
            case 'profit':
                return { data: data.profit, color: '#00FF88', type: 'line' as const };
            case 'loans':
                return { data: data.loans, color: '#0080FF', type: 'bar' as const };
            case 'rates':
                return { data: data.rates, color: '#FFA500', type: 'scatter' as const };
            default:
                return { data: data.profit, color: '#00FF88', type: 'line' as const };
        }
    };

    const current = getCurrentData();

    return (
        <Card className="glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">3D Analytics</h3>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="profit">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Profit
                    </TabsTrigger>
                    <TabsTrigger value="loans">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Loans
                    </TabsTrigger>
                    <TabsTrigger value="rates">
                        <Activity className="w-4 h-4 mr-2" />
                        Rates
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    <div className="h-96 w-full rounded-lg overflow-hidden bg-gradient-to-br from-background to-muted">
                        <Canvas>
                            <PerspectiveCamera makeDefault position={[0, 2, 5]} />
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} />
                            <directionalLight position={[-10, -10, -5]} intensity={0.3} />
                            
                            <AnalyticsChart3D
                                data={current.data}
                                type={current.type}
                                color={current.color}
                                height={2}
                                width={4}
                                animated={true}
                            />
                            
                            <OrbitControls
                                enablePan={true}
                                enableZoom={true}
                                enableRotate={true}
                                minDistance={3}
                                maxDistance={10}
                            />
                        </Canvas>
                    </div>
                </TabsContent>
            </Tabs>
        </Card>
    );
}

