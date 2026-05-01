/**
 * Zkredit - Wallet Connection Hook
 * React hook for managing Cardano wallet state
 */

import { useState, useEffect, useCallback } from 'react';
import {
    WalletName,
    WalletInfo,
    ConnectedWallet,
    getInstalledWallets,
    connectWallet,
    isWalletConnected,
    getNetworkName,
    shortenAddress,
} from '@/lib/wallet/cardano-wallet';

interface UseWalletReturn {
    // Wallet discovery
    installedWallets: WalletInfo[];

    // Connection state
    isConnecting: boolean;
    isConnected: boolean;
    error: string | null;

    // Connected wallet info
    wallet: ConnectedWallet | null;
    address: string;
    shortAddress: string;
    balance: string;
    network: string;

    // Actions
    connect: (walletName: WalletName) => Promise<void>;
    disconnect: () => void;
    refreshBalance: () => Promise<void>;
}

const STORAGE_KEY = 'zkredit_wallet';

export function useWallet(): UseWalletReturn {
    const [installedWallets, setInstalledWallets] = useState<WalletInfo[]>([]);
    const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Discover installed wallets on mount
    // Discover installed wallets on mount with polling
    useEffect(() => {
        let attempts = 0;
        const maxAttempts = 10; // 5 seconds total

        const checkWallets = () => {
            const wallets = getInstalledWallets();
            if (wallets.some(w => w.installed)) {
                setInstalledWallets(wallets);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkWallets, 500);
            } else {
                // Final check
                setInstalledWallets(getInstalledWallets());
            }
        };

        checkWallets();

        // Also listen for injection events if supported by some wallets
        window.addEventListener('load', checkWallets);
        return () => window.removeEventListener('load', checkWallets);
    }, []);

    // Try to reconnect to previously connected wallet (only if explicitly requested)
    // Removed auto-reconnect to prevent model from starting before user connects
    // Users must manually connect their wallet

    const connect = useCallback(async (walletName: WalletName) => {
        setIsConnecting(true);
        setError(null);

        try {
            console.log(`[useWallet] Attempting to connect to ${walletName}...`);
            const connectedWallet = await connectWallet(walletName);
            console.log(`[useWallet] Connection successful:`, {
                name: connectedWallet.name,
                address: connectedWallet.address?.substring(0, 20) + '...',
                networkId: connectedWallet.networkId
            });
            setWallet(connectedWallet);
            localStorage.setItem(STORAGE_KEY, walletName);
        } catch (err) {
            console.error(`[useWallet] Connection failed:`, err);
            const message = err instanceof Error ? err.message : 'Failed to connect wallet';
            setError(message);
            // Don't throw - let the UI handle the error
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        setWallet(null);
        setError(null);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const refreshBalance = useCallback(async () => {
        if (!wallet) return;

        try {
            const balance = await wallet.api.getBalance();
            // Parse and update balance
            const balanceNum = parseInt(balance, 16) / 1_000_000;
            setWallet((prev) => prev ? { ...prev, balance: balanceNum.toFixed(2) } : null);
        } catch (err) {
            console.error('Failed to refresh balance:', err);
        }
    }, [wallet]);

    // Validate address format
    const walletAddress = wallet?.address || '';
    const isValidAddress = walletAddress && (walletAddress.startsWith('addr1') || walletAddress.startsWith('addr_test1'));

    return {
        installedWallets,
        isConnecting,
        isConnected: !!wallet && isValidAddress,
        error: error || (!isValidAddress && walletAddress ? 'Invalid address format' : null),
        wallet: isValidAddress ? wallet : null,
        address: isValidAddress ? walletAddress : '',
        shortAddress: isValidAddress ? shortenAddress(walletAddress) : '',
        balance: wallet?.balance || '0',
        network: wallet ? getNetworkName(wallet.networkId) : '',
        connect,
        disconnect,
        refreshBalance,
    };
}

