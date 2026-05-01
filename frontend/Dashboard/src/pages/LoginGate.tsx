/**
 * Zkredit - Login Gate
 * Portal entrance with HeroCube and wallet connection
 */

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeroCube } from '@/components/3d/HeroCube';
import { ParticleField } from '@/components/3d/ParticleField';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ChevronDown, ExternalLink, AlertCircle, Loader2, Sun, Moon } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useTheme } from 'next-themes';
import type { WalletName } from '@/lib/wallet/cardano-wallet';

const ANIMATION_DURATION = 1500;

export default function LoginGate() {
    const [isAnimating, setIsAnimating] = useState(false);
    const [showWalletList, setShowWalletList] = useState(false);
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();

    const {
        installedWallets,
        isConnecting,
        isConnected,
        error,
        shortAddress,
        balance,
        network,
        connect,
        disconnect,
    } = useWallet();

    const handleWalletSelect = async (walletName: WalletName) => {
        try {
            await connect(walletName);
            setShowWalletList(false);

            // Animate and navigate after successful connection
            setIsAnimating(true);
            setTimeout(() => {
                navigate('/dashboard');
            }, ANIMATION_DURATION);
        } catch {
            // Error is handled by the hook
        }
    };

    const handleDemoMode = () => {
        setIsAnimating(true);
        setTimeout(() => {
            navigate('/dashboard');
        }, ANIMATION_DURATION);
    };

    const installedCount = installedWallets.filter(w => w.installed).length;

    return (
        <div className="relative w-full h-screen overflow-hidden bg-background transition-colors duration-500">
            {/* Theme Toggle */}
            <div className="absolute top-4 right-4 z-50">
                <Button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    variant="outline"
                    size="icon"
                    className="backdrop-blur-xl bg-card/50 border-border"
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
            </div>

            {/* 3D Background Canvas */}
            <div className="absolute inset-0">
                <Canvas
                    camera={{ position: [0, 0, 8], fov: 50 }}
                    dpr={[1, 2]}
                    performance={{ min: 0.5 }}
                >
                    <ParticleField count={typeof window !== 'undefined' && window.innerWidth < 768 ? 1500 : 3000} />
                    <HeroCube isAnimating={isAnimating} />
                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        maxPolarAngle={Math.PI / 2}
                        minPolarAngle={Math.PI / 2}
                    />
                </Canvas>
            </div>

            {/* UI Overlay */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full pointer-events-none px-4">
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="text-center mb-8 md:mb-12"
                >
                    <h1 className="text-5xl md:text-8xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-4">
                        Zkredit
                    </h1>
                    <p className="text-lg md:text-2xl text-muted-foreground font-light">
                        Privacy-First DeFi Lending on Cardano
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 1 }}
                    className="pointer-events-auto w-full max-w-md"
                >
                    <Card className="p-6 md:p-8 backdrop-blur-2xl bg-card/90 border-2 border-primary/20 shadow-2xl">
                        <div className="text-center mb-6">
                            <motion.div
                                className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-full hero-gradient flex items-center justify-center"
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Wallet className="w-8 md:w-10 h-8 md:h-10 text-primary" />
                            </motion.div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gradient mb-2">
                                {isConnected ? '✨ Connected!' : 'Connect Wallet'}
                            </h2>
                            {isConnected ? (
                                <div className="space-y-1">
                                    <p className="text-sm font-mono text-foreground">{shortAddress}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {balance} ₳ • {network}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                    Choose your Cardano wallet to access privacy-first DeFi lending with AI-powered negotiations
                                </p>
                            )}
                        </div>

                        {/* Error Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-destructive">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-3">
                            {isConnected ? (
                                <>
                                    <Button
                                        onClick={handleDemoMode}
                                        size="lg"
                                        className="w-full gradient-glow text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                                        disabled={isAnimating}
                                    >
                                        {isAnimating ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Entering Portal...
                                            </>
                                        ) : (
                                            'Enter Dashboard →'
                                        )}
                                    </Button>
                                    <Button
                                        onClick={disconnect}
                                        variant="outline"
                                        size="lg"
                                        className="w-full"
                                    >
                                        Disconnect Wallet
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {installedCount > 0 ? (
                                        <>
                                            <Button
                                                onClick={() => setShowWalletList(!showWalletList)}
                                                size="lg"
                                                className="w-full gradient-glow text-lg font-semibold shadow-lg hover:shadow-xl transition-all group"
                                                disabled={isConnecting}
                                            >
                                                {isConnecting ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                        Connecting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wallet className="mr-2 h-5 w-5" />
                                                        Select Wallet ({installedCount} found)
                                                        <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showWalletList ? 'rotate-180' : ''}`} />
                                                    </>
                                                )}
                                            </Button>

                                            <AnimatePresence>
                                                {showWalletList && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="space-y-2 pt-2"
                                                    >
                                                        {installedWallets
                                                            .filter(w => w.installed)
                                                            .map((wallet) => (
                                                                <motion.button
                                                                    key={wallet.name}
                                                                    onClick={() => handleWalletSelect(wallet.name as WalletName)}
                                                                    className="wallet-card w-full flex items-center justify-between text-left"
                                                                    whileHover={{ scale: 1.02 }}
                                                                    whileTap={{ scale: 0.98 }}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                                            <span className="text-primary font-bold text-lg">
                                                                                {wallet.name[0].toUpperCase()}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-semibold capitalize">{wallet.name}</p>
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {wallet.name === 'eternl' ? 'Recommended' : 'Fast & Secure'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                                                </motion.button>
                                                            ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    ) : (
                                        <div className="text-center p-6 bg-muted/50 rounded-xl">
                                            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground mb-4">
                                                No Cardano wallets detected. Install one to continue.
                                            </p>
                                            <a
                                                href="https://eternl.io"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                                            >
                                                Get Eternl Wallet
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    )}

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-border" />
                                        </div>
                                        <div className="relative flex justify-center text-xs">
                                            <span className="bg-card px-2 text-muted-foreground">or</span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleDemoMode}
                                        variant="ghost"
                                        className="w-full text-muted-foreground hover:text-foreground"
                                    >
                                        Continue in Demo Mode
                                    </Button>
                                </>
                            )}
                        </div>
                    </Card>
                </motion.div>

                {/* Feature badges */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1.5 }}
                    className="absolute bottom-6 md:bottom-8 flex flex-wrap justify-center gap-4 md:gap-6 text-sm px-4"
                >
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span>AI Negotiation</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                        <span>Hydra L2</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span>ZK Privacy</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
