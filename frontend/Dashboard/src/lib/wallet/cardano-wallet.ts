/**
 * Zkredit - Cardano Wallet Integration
 * CIP-30 compliant wallet connection for Nami, Eternl, Yoroi, Lace
 */

// Helper to convert hex address to bech32 using Cardano library
async function convertHexToBech32(hexAddress: string, networkId: number): Promise<string | null> {
    try {
        // Dynamically import Cardano serialization library
        const CardanoSerializationLib = await import('@emurgo/cardano-serialization-lib-browser');
        
        // Convert hex string to bytes
        const hexBytes = Uint8Array.from(
            hexAddress.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
        );
        
        if (hexBytes.length === 0) {
            console.warn('[Wallet] Invalid hex address length');
            return null;
        }
        
        // Try to decode as address using Cardano library
        if (!CardanoSerializationLib || !CardanoSerializationLib.Address) {
            console.warn('[Wallet] Cardano library not properly loaded');
            return null;
        }
        
        const address = CardanoSerializationLib.Address.from_bytes(hexBytes);
        if (!address) {
            console.warn('[Wallet] Failed to decode address from bytes');
            return null;
        }
        
        const bech32 = address.to_bech32();
        if (!bech32 || typeof bech32 !== 'string') {
            console.warn('[Wallet] Failed to convert address to bech32');
            return null;
        }
        
        // Validate the bech32 address format
        if (bech32 && (bech32.startsWith('addr1') || bech32.startsWith('addr_test1'))) {
            console.log(`[Wallet] ✅ Successfully converted hex to bech32: ${bech32.substring(0, 30)}...`);
            return bech32;
        } else {
            console.warn(`[Wallet] Converted address not in expected format: ${bech32}`);
            return null;
        }
    } catch (err) {
        console.warn('[Wallet] Hex to bech32 conversion failed:', err);
        return null;
    }
}

// CIP-30 Wallet API Types
interface CardanoWalletApi {
    getNetworkId(): Promise<number>;
    getUtxos(): Promise<string[] | undefined>;
    getBalance(): Promise<string>;
    getUsedAddresses(): Promise<string[]>;
    getUnusedAddresses(): Promise<string[]>;
    getChangeAddress(): Promise<string>;
    getRewardAddresses(): Promise<string[]>;
    signTx(tx: string, partialSign?: boolean): Promise<string>;
    signData(addr: string, payload: string): Promise<{ signature: string; key: string }>;
    submitTx(tx: string): Promise<string>;
    getCollateral(): Promise<string[] | undefined>;
}

interface CardanoWallet {
    name: string;
    icon: string;
    apiVersion: string;
    enable(): Promise<CardanoWalletApi>;
    isEnabled(): Promise<boolean>;
}

interface ZkreditWindow extends Window {
    eternl?: CardanoWallet;
    zkreditWalletDiagnostics?: () => void;
}

export type WalletName = 'nami' | 'eternl' | 'yoroi' | 'flint' | 'typhon' | 'gerowallet' | 'lace';

export interface WalletInfo {
    name: WalletName;
    displayName: string;
    icon: string;
    installed: boolean;
}

export interface ConnectedWallet {
    name: WalletName;
    api: CardanoWalletApi;
    address: string;
    balance: string;
    networkId: number;
}

// Wallet metadata
const WALLET_METADATA: Record<WalletName, { displayName: string; icon: string }> = {
    nami: { displayName: 'Nami', icon: 'N' },
    eternl: { displayName: 'Eternl', icon: 'E' },
    yoroi: { displayName: 'Yoroi', icon: 'Y' },
    flint: { displayName: 'Flint', icon: 'F' },
    typhon: { displayName: 'Typhon', icon: 'T' },
    gerowallet: { displayName: 'Gero', icon: 'G' },
    lace: { displayName: 'Lace', icon: 'L' },
};

/**
 * Get the Cardano wallet window object
 */
function getCardanoWindow(): Record<string, CardanoWallet> | undefined {
    if (typeof window !== 'undefined') {
        const cardano = (window as Window & { cardano?: Record<string, CardanoWallet> }).cardano;
        console.log('[Wallet] Window.cardano exists:', !!cardano);
        if (cardano) {
            console.log('[Wallet] Cardano object keys:', Object.keys(cardano));
        }
        return cardano;
    }
    console.log('[Wallet] Window not available');
    return undefined;
}

/**
 * Check which wallets are installed in the browser
 */
export function getInstalledWallets(): WalletInfo[] {
    console.log('[Wallet] Checking for installed wallets...');
    const cardano = getCardanoWindow();
    const wallets: WalletInfo[] = [];

    // Check for Eternl (also known as ccvault in some versions)
    // Eternl can appear as 'eternl', 'ccvault', 'eternlwallet', or other variations
    let eternlInstalled = false;

    if (cardano) {
        console.log('[Wallet] Available cardano keys:', Object.keys(cardano));

        // Check all possible Eternl keys
        const eternlKeys = ['eternl', 'ccvault', 'eternlwallet', 'eternl-wallet', 'ccvaultio', 'eternl_ccvault'];
        eternlInstalled = eternlKeys.some(key => {
            const exists = !!cardano[key];
            if (exists) console.log(`[Wallet] Found Eternl under key: ${key}`);
            return exists;
        });

        // Also check window.eternl directly
        if (!eternlInstalled && typeof window !== 'undefined' && (window as ZkreditWindow).eternl) {
            eternlInstalled = true;
            console.log(`[Wallet] Found Eternl through window.eternl`);
        }

        // Also check wallet names in the cardano object
        if (!eternlInstalled) {
            for (const key in cardano) {
                const wallet = cardano[key];
                if (wallet && typeof wallet === 'object' && wallet.name) {
                    const name = wallet.name.toLowerCase();
                    if (name.includes('eternl') || name.includes('ccvault')) {
                        eternlInstalled = true;
                        console.log(`[Wallet] Found Eternl by name under key: ${key} (${wallet.name})`);
                        break;
                    }
                }
            }
        }

        console.log('[Wallet] Eternl detected:', eternlInstalled);
    } else {
        console.log('[Wallet] No cardano object found');
    }

    for (const [key, meta] of Object.entries(WALLET_METADATA)) {
        let installed = false;

        // Special handling for Eternl - check multiple possible names
        if (key === 'eternl') {
            installed = eternlInstalled;
        } else if (key === 'lace') {
            // Lace wallet can appear as 'lace' or 'lacewallet'
            installed = cardano ? (!!cardano['lace'] || !!cardano['lacewallet']) : false;
        } else if (key === 'nami') {
            // Nami wallet detection - check multiple possible keys
            installed = cardano ? (!!cardano['nami'] || !!cardano['Nami']) : false;
        } else {
            installed = cardano ? !!cardano[key] : false;
        }

        wallets.push({
            name: key as WalletName,
            displayName: meta.displayName,
            icon: meta.icon,
            installed,
        });
    }

    // Sort: Eternl first if installed, then other installed wallets, then uninstalled
    return wallets.sort((a, b) => {
        if (a.name === 'eternl' && a.installed) return -1;
        if (b.name === 'eternl' && b.installed) return 1;
        if (a.installed && !b.installed) return -1;
        if (!a.installed && b.installed) return 1;
        return 0;
    });
}

/**
 * Connect to a Cardano wallet
 */
export async function connectWallet(walletName: WalletName): Promise<ConnectedWallet> {
    console.log('[Wallet] Starting connection process for:', walletName);

    const cardano = getCardanoWindow();
    console.log('[Wallet] Cardano object found:', !!cardano);

    if (!cardano) {
        console.error('[Wallet] Cardano interface not available');
        throw new Error('Cardano wallet interface not found. Please install a wallet extension like Eternl, Nami, or Lace.');
    }

    // Debug: Log available wallet keys
    console.log('[Wallet] Available wallet keys:', Object.keys(cardano));
    console.log('[Wallet] Checking for wallet:', walletName);

    // Special handling for different wallets
    let wallet = cardano[walletName];

    if (walletName === 'eternl' && !wallet) {
        // Try all possible Eternl keys (including newer versions)
        const eternlKeys = ['ccvault', 'eternlwallet', 'eternl-wallet', 'ccvaultio', 'eternl_ccvault'];
        for (const key of eternlKeys) {
            if (cardano[key]) {
                wallet = cardano[key];
                console.log(`[Wallet] Found Eternl under key: ${key}`);
                break;
            }
        }

        // Also try accessing through window.eternl directly (some versions expose it this way)
        if (!wallet && typeof window !== 'undefined' && (window as ZkreditWindow).eternl) {
            wallet = (window as ZkreditWindow).eternl;
            console.log(`[Wallet] Found Eternl through window.eternl`);
        }

        // Also check if it's available but under a different key by wallet name
        if (!wallet) {
            // Check all keys in cardano object
            for (const key in cardano) {
                const w = (cardano as Record<string, CardanoWallet>)[key];
                if (w && w.name && (w.name.toLowerCase().includes('eternl') || w.name.toLowerCase().includes('ccvault'))) {
                    wallet = w;
                    console.log(`[Wallet] Found Eternl by name under key: ${key}`);
                    break;
                }
            }
        }
    } else if (walletName === 'lace' && !wallet) {
        // Try alternative names for Lace
        wallet = cardano['lacewallet'] || (cardano as Record<string, CardanoWallet>)?.lace;

        // Also check if it's available but under a different key
        if (!wallet) {
            // Check all keys in cardano object
            for (const key in cardano) {
                const w = (cardano as Record<string, CardanoWallet>)[key];
                if (w && w.name?.toLowerCase().includes('lace')) {
                    wallet = w;
                    console.log(`[Wallet] Found Lace under key: ${key}`);
                    break;
                }
            }
        }
    } else if (walletName === 'nami' && !wallet) {
        // Nami might be under different keys
        wallet = cardano['nami'] || cardano['Nami'] || (cardano as Record<string, CardanoWallet>)?.nami;

        if (!wallet) {
            // Check all keys for Nami
            for (const key in cardano) {
                const w = (cardano as Record<string, CardanoWallet>)[key];
                if (w && w.name?.toLowerCase().includes('nami')) {
                    wallet = w;
                    console.log(`[Wallet] Found Nami under key: ${key}`);
                    break;
                }
            }
        }
    }

    if (!wallet) {
        const displayName = WALLET_METADATA[walletName].displayName;
        console.error(`[Wallet] ${walletName} not found in cardano object`);
        console.error('[Wallet] Available wallets:', Object.keys(cardano).filter(key =>
            !key.startsWith('_') && !key.startsWith('$') && typeof cardano[key] === 'object'
        ));

        if (walletName === 'eternl') {
            throw new Error(`${displayName} wallet not found. Please:\n1. Install Eternl from https://eternl.io/\n2. Make sure it's enabled in your browser extensions\n3. Refresh this page\n4. Try again`);
        } else if (walletName === 'nami') {
            throw new Error(`${displayName} wallet not found. Please install Nami from the Chrome Web Store and refresh the page.`);
        } else if (walletName === 'lace') {
            throw new Error(`${displayName} wallet not found. Please install Lace from the Chrome Web Store and refresh the page.`);
        }
        throw new Error(`${displayName} wallet not found. Please install the ${displayName} extension and refresh the page.`);
    }

    console.log(`[Wallet] Found ${walletName} wallet, attempting to connect...`);

    try {
        console.log(`[Wallet] Attempting to connect to ${walletName}...`);

        // Check if wallet is already enabled (for Eternl compatibility)
        let api: CardanoWalletApi;
        try {
            const isEnabled = await wallet.isEnabled();
            console.log(`[Wallet] ${walletName} isEnabled result:`, isEnabled);

            if (isEnabled) {
                // Wallet is already enabled, try to get API directly
                console.log(`[Wallet] ${walletName} already enabled, using existing connection`);
                api = await wallet.enable();
            } else {
                // Enable the wallet (user will see connection popup)
                console.log(`[Wallet] Enabling ${walletName} wallet...`);
                api = await wallet.enable();
            }
        } catch (enableError) {
            console.warn(`[Wallet] isEnabled check failed, trying direct enable:`, enableError);
            // Fallback to direct enable
            api = await wallet.enable();
        }

        console.log(`[Wallet] ${walletName} enabled successfully`);

        // Get wallet details with better error handling
        let balance = '0';
        let networkId = 0;
        let address = '';

        try {
            // Get network ID first (usually most reliable)
            try {
                networkId = await api.getNetworkId();
                console.log(`[Wallet] Network ID: ${networkId} (${networkId === 1 ? 'Mainnet' : 'Testnet'})`);
            } catch (err) {
                console.warn('[Wallet] Failed to get network ID:', err);
            }

            // Try to get address - use multiple methods with better error handling
            const addressAttempts: string[] = [];
            
            // Method 1: Try getChangeAddress (most reliable for most wallets)
            try {
                const rawAddress = await api.getChangeAddress();
                console.log(`[Wallet] getChangeAddress returned: ${rawAddress ? (typeof rawAddress === 'string' ? rawAddress.substring(0, 50) + '...' : String(rawAddress)) : 'null/undefined'}`);
                console.log(`[Wallet] Address type: ${typeof rawAddress}, length: ${rawAddress?.length}, is bech32: ${rawAddress && typeof rawAddress === 'string' && (rawAddress.startsWith('addr1') || rawAddress.startsWith('addr_test1'))}`);
                
                // Check if it's already in bech32 format
                if (rawAddress && typeof rawAddress === 'string' && (rawAddress.startsWith('addr1') || rawAddress.startsWith('addr_test1'))) {
                    address = rawAddress;
                    addressAttempts.push(`change:${rawAddress}`);
                    console.log(`[Wallet] ✅ Valid bech32 address from getChangeAddress`);
                } else if (rawAddress && typeof rawAddress === 'string') {
                    // Try to convert hex/CBOR to bech32 (for Nami/Lace compatibility)
                    console.log('[Wallet] Address not in bech32 format, attempting conversion...');
                    const converted = await convertAddressToBech32(rawAddress, networkId, api);
                    if (converted) {
                        address = converted;
                        addressAttempts.push(`change(converted):${converted}`);
                        console.log(`[Wallet] ✅ Successfully converted hex to bech32`);
                    } else {
                        // Store raw address temporarily, we'll try other methods
                        console.warn('[Wallet] Could not convert address, will try other methods');
                    }
                } else if (!rawAddress) {
                    console.warn('[Wallet] getChangeAddress returned null/undefined');
                }
            } catch (err) {
                console.warn('[Wallet] getChangeAddress failed:', err);
            }

            // Method 2: Try getUsedAddresses (only if Method 1 didn't work)
            if (!address || (typeof address === 'string' && !address.startsWith('addr1') && !address.startsWith('addr_test1'))) {
                try {
                    const usedAddresses = await api.getUsedAddresses();
                    console.log(`[Wallet] getUsedAddresses returned: ${usedAddresses ? (Array.isArray(usedAddresses) ? `${usedAddresses.length} addresses` : String(usedAddresses)) : 'null/undefined'}`);
                    
                    if (usedAddresses && Array.isArray(usedAddresses) && usedAddresses.length > 0) {
                        // Log all addresses for debugging
                        usedAddresses.forEach((addr, idx) => {
                            if (addr && typeof addr === 'string') {
                                const isValid = addr.startsWith('addr1') || addr.startsWith('addr_test1');
                                console.log(`[Wallet] Used address ${idx}: ${isValid ? '✅' : '❌'} ${addr.substring(0, 50)}...`);
                            } else {
                                console.log(`[Wallet] Used address ${idx}: ❌ ${typeof addr} (${addr})`);
                            }
                        });
                        
                        const validAddr = usedAddresses.find(addr => 
                            addr && typeof addr === 'string' && (addr.startsWith('addr1') || addr.startsWith('addr_test1'))
                        );
                        if (validAddr) {
                            address = validAddr;
                            addressAttempts.push(`used:${validAddr}`);
                            console.log(`[Wallet] ✅ Found valid address from getUsedAddresses`);
                        } else {
                            console.warn('[Wallet] getUsedAddresses returned addresses but none are in bech32 format');
                            // Try to convert hex addresses to bech32
                            for (const addr of usedAddresses) {
                                if (addr && typeof addr === 'string' && /^[0-9a-fA-F]+$/.test(addr)) {
                                    console.log(`[Wallet] Attempting to convert hex address from getUsedAddresses...`);
                                    const converted = await convertHexToBech32(addr, networkId);
                                    if (converted) {
                                        address = converted;
                                        addressAttempts.push(`used(converted):${converted}`);
                                        console.log(`[Wallet] ✅ Successfully converted hex address from getUsedAddresses`);
                                        break;
                                    }
                                }
                            }
                        }
                    } else if (!usedAddresses) {
                        console.warn('[Wallet] getUsedAddresses returned null/undefined');
                    } else if (!Array.isArray(usedAddresses)) {
                        console.warn(`[Wallet] getUsedAddresses returned non-array: ${typeof usedAddresses}`);
                    }
                } catch (err) {
                    console.warn('[Wallet] getUsedAddresses failed:', err);
                }
            }

            // Method 3: Try getUnusedAddresses as last resort
            if (!address || (typeof address === 'string' && !address.startsWith('addr1') && !address.startsWith('addr_test1'))) {
                try {
                    const unusedAddresses = await api.getUnusedAddresses();
                    console.log(`[Wallet] getUnusedAddresses returned: ${unusedAddresses ? (Array.isArray(unusedAddresses) ? `${unusedAddresses.length} addresses` : String(unusedAddresses)) : 'null/undefined'}`);
                    
                    if (unusedAddresses && Array.isArray(unusedAddresses) && unusedAddresses.length > 0) {
                        // Log all addresses for debugging
                        unusedAddresses.forEach((addr, idx) => {
                            if (addr && typeof addr === 'string') {
                                const isValid = addr.startsWith('addr1') || addr.startsWith('addr_test1');
                                console.log(`[Wallet] Unused address ${idx}: ${isValid ? '✅' : '❌'} ${addr.substring(0, 50)}...`);
                            } else {
                                console.log(`[Wallet] Unused address ${idx}: ❌ ${typeof addr} (${addr})`);
                            }
                        });
                        
                        const validAddr = unusedAddresses.find(addr => 
                            addr && typeof addr === 'string' && (addr.startsWith('addr1') || addr.startsWith('addr_test1'))
                        );
                        if (validAddr) {
                            address = validAddr;
                            addressAttempts.push(`unused:${validAddr}`);
                            console.log(`[Wallet] ✅ Found valid address from getUnusedAddresses`);
                        } else {
                            console.warn('[Wallet] getUnusedAddresses returned addresses but none are in bech32 format');
                            // Try to convert hex addresses to bech32
                            for (const addr of unusedAddresses) {
                                if (addr && typeof addr === 'string' && /^[0-9a-fA-F]+$/.test(addr)) {
                                    console.log(`[Wallet] Attempting to convert hex address from getUnusedAddresses...`);
                                    const converted = await convertHexToBech32(addr, networkId);
                                    if (converted) {
                                        address = converted;
                                        addressAttempts.push(`unused(converted):${converted}`);
                                        console.log(`[Wallet] ✅ Successfully converted hex address from getUnusedAddresses`);
                                        break;
                                    }
                                }
                            }
                        }
                    } else if (!unusedAddresses) {
                        console.warn('[Wallet] getUnusedAddresses returned null/undefined');
                    } else if (!Array.isArray(unusedAddresses)) {
                        console.warn(`[Wallet] getUnusedAddresses returned non-array: ${typeof unusedAddresses}`);
                    }
                } catch (err) {
                    console.warn('[Wallet] getUnusedAddresses failed:', err);
                }
            }
            
            // Method 4: Try getRewardAddresses (stake addresses, but might help)
            if (!address || (typeof address === 'string' && !address.startsWith('addr1') && !address.startsWith('addr_test1'))) {
                try {
                    const rewardAddresses = await api.getRewardAddresses();
                    console.log(`[Wallet] getRewardAddresses returned: ${rewardAddresses ? (Array.isArray(rewardAddresses) ? `${rewardAddresses.length} addresses` : String(rewardAddresses)) : 'null/undefined'}`);
                    
                    // Reward addresses are stake addresses, but some wallets might return payment addresses here
                    if (rewardAddresses && Array.isArray(rewardAddresses) && rewardAddresses.length > 0) {
                        const validAddr = rewardAddresses.find(addr => 
                            addr && typeof addr === 'string' && (addr.startsWith('addr1') || addr.startsWith('addr_test1'))
                        );
                        if (validAddr) {
                            address = validAddr;
                            addressAttempts.push(`reward:${validAddr}`);
                            console.log(`[Wallet] ✅ Found valid address from getRewardAddresses`);
                        }
                    }
        } catch (err) {
                    console.warn('[Wallet] getRewardAddresses failed:', err);
                }
            }

            // Get balance
            try {
                balance = await api.getBalance();
                if (balance && typeof balance === 'string' && balance.length > 20) {
                    console.log(`[Wallet] Balance retrieved: ${balance.substring(0, 20)}...`);
                } else {
                    console.log(`[Wallet] Balance retrieved: ${balance}`);
                }
            } catch (err) {
                console.warn('[Wallet] Failed to get balance:', err);
                balance = '0';
            }

            // Final validation
            if (!address || (typeof address !== 'string') || (!address.startsWith('addr1') && !address.startsWith('addr_test1'))) {
                console.error('[Wallet] All address retrieval methods failed');
                console.error('[Wallet] Attempted methods:', addressAttempts);
                console.error('[Wallet] Final address value:', address);
                console.error('[Wallet] Address type:', typeof address);
                console.error('[Wallet] Address length:', address?.length);
                console.error('[Wallet] Network ID:', networkId);
                
                // If address is null/undefined, try one more comprehensive attempt
                if (!address || address === 'null' || address === 'undefined') {
                    console.log('[Wallet] Address is null, trying comprehensive final attempt with all methods...');
                    try {
                        // Try all methods in parallel with better error handling
                        const allResults = await Promise.allSettled([
                            api.getChangeAddress().catch(e => { console.warn('[Wallet] getChangeAddress error:', e); return null; }),
                            api.getUsedAddresses().catch(e => { console.warn('[Wallet] getUsedAddresses error:', e); return []; }),
                            api.getUnusedAddresses().catch(e => { console.warn('[Wallet] getUnusedAddresses error:', e); return []; }),
                            api.getRewardAddresses().catch(e => { console.warn('[Wallet] getRewardAddresses error:', e); return []; })
                        ]);
                        
                        const allAddresses: string[] = [];
                        
                        // Process getChangeAddress
                        if (allResults[0].status === 'fulfilled' && allResults[0].value && typeof allResults[0].value === 'string') {
                            allAddresses.push(allResults[0].value);
                            console.log(`[Wallet] getChangeAddress (final): ${allResults[0].value.substring(0, 40)}...`);
                        }
                        
                        // Process getUsedAddresses
                        if (allResults[1].status === 'fulfilled' && Array.isArray(allResults[1].value)) {
                            const validAddrs = allResults[1].value.filter(addr => addr && typeof addr === 'string');
                            allAddresses.push(...validAddrs);
                            console.log(`[Wallet] getUsedAddresses (final): ${validAddrs.length} addresses`);
                        }
                        
                        // Process getUnusedAddresses
                        if (allResults[2].status === 'fulfilled' && Array.isArray(allResults[2].value)) {
                            const validAddrs = allResults[2].value.filter(addr => addr && typeof addr === 'string');
                            allAddresses.push(...validAddrs);
                            console.log(`[Wallet] getUnusedAddresses (final): ${validAddrs.length} addresses`);
                        }
                        
                        // Process getRewardAddresses
                        if (allResults[3].status === 'fulfilled' && Array.isArray(allResults[3].value)) {
                            const validAddrs = allResults[3].value.filter(addr => addr && typeof addr === 'string');
                            allAddresses.push(...validAddrs);
                            console.log(`[Wallet] getRewardAddresses (final): ${validAddrs.length} addresses`);
                        }
                        
                        console.log(`[Wallet] Comprehensive attempt collected ${allAddresses.length} total addresses`);
                        allAddresses.forEach((addr, idx) => {
                            const isValid = addr.startsWith('addr1') || addr.startsWith('addr_test1');
                            console.log(`[Wallet] Collected addr ${idx}: ${isValid ? '✅' : '❌'} ${addr.substring(0, 40)}...`);
                        });
                        
                        // Find first valid bech32 address
                        const bech32Addr = allAddresses.find(addr => 
                            addr && typeof addr === 'string' && (addr.startsWith('addr1') || addr.startsWith('addr_test1'))
                        );
                        
                        if (bech32Addr) {
                            address = bech32Addr;
                            console.log('[Wallet] ✅ Found bech32 address in comprehensive final attempt!');
                        } else {
                            // Check if we got any addresses at all
                            if (allAddresses.length === 0) {
                                throw new Error(`All wallet methods returned null or empty. This usually means: 1) Your ${walletName} wallet is locked, 2) Your wallet has no addresses/transaction history, or 3) Your wallet doesn't fully support CIP-30. Please try: unlocking your wallet, making a transaction first to generate addresses, or using Eternl wallet which has better CIP-30 support.`);
                            } else {
                                throw new Error(`Wallet returned ${allAddresses.length} addresses but none are in valid bech32 format (addr1/addr_test1). Please try updating your ${walletName} wallet extension or use Eternl wallet.`);
                            }
                        }
                    } catch (finalErr) {
                        if (finalErr instanceof Error) {
                            throw finalErr;
                        }
                        throw new Error(`Wallet returned null address. Please ensure your ${walletName} wallet is unlocked, has been used (has transaction history), and supports CIP-30. Try refreshing the page or using Eternl wallet.`);
                    }
                }
                
                // Provide helpful error message for hex addresses
                if (address && typeof address === 'string' && /^[0-9a-fA-F]+$/.test(address)) {
                    // For Nami/Lace, try one more time with different approach
                    console.log('[Wallet] Final attempt: trying to get address from all methods simultaneously...');
                    try {
                        const [changeAddr, usedAddrs, unusedAddrs] = await Promise.allSettled([
                            api.getChangeAddress(),
                            api.getUsedAddresses(),
                            api.getUnusedAddresses()
                        ]);
                        
                        // Check all results for bech32 addresses
                        const allAddresses: string[] = [];
                        if (changeAddr.status === 'fulfilled' && changeAddr.value) allAddresses.push(changeAddr.value);
                        if (usedAddrs.status === 'fulfilled' && usedAddrs.value) allAddresses.push(...usedAddrs.value);
                        if (unusedAddrs.status === 'fulfilled' && unusedAddrs.value) allAddresses.push(...unusedAddrs.value);
                        
                        const bech32Addr = allAddresses.find(addr => 
                            addr && (addr.startsWith('addr1') || addr.startsWith('addr_test1'))
                        );
                        
                        if (bech32Addr) {
                            address = bech32Addr;
                            console.log('[Wallet] ✅ Found bech32 address in final attempt!');
                        } else {
                            throw new Error(`Wallet (${walletName}) returned addresses in hex format. This may be a wallet compatibility issue. Please try: 1) Updating your wallet extension, 2) Using Eternl wallet, or 3) Contacting wallet support.`);
                        }
                    } catch (finalErr) {
                        throw new Error(`Wallet returned address in hex format (${address.substring(0, 20)}...). Please try updating your ${walletName} wallet or use Eternl wallet for better compatibility.`);
                    }
                } else {
                    throw new Error(`Failed to retrieve valid wallet address. Wallet returned: ${address || 'null'}. Please ensure your wallet is unlocked, supports CIP-30, and try again.`);
                }
            }
            
            console.log(`[Wallet] Successfully retrieved address: ${address.substring(0, 20)}...${address.substring(address.length - 10)}`);
        } catch (err) {
            console.error('[Wallet] Error during wallet info retrieval:', err);
            if (err instanceof Error) {
                // Re-throw with more context
                throw new Error(err.message);
            }
            throw new Error('Failed to retrieve wallet information. Please ensure your wallet is unlocked and try again.');
        }

        // Convert balance from hex CBOR to lovelace
        const balanceInLovelace = parseBalance(balance);
        const balanceInAda = (balanceInLovelace / 1_000_000).toFixed(2);

        // Final address validation before returning
        if (!address || typeof address !== 'string' || (!address.startsWith('addr1') && !address.startsWith('addr_test1'))) {
            console.error('[Wallet] Final validation failed. Address:', address);
            console.error('[Wallet] Address type:', typeof address);
            console.error('[Wallet] Address length:', address?.length);
            
            if (!address || address === 'null' || address === 'undefined') {
                throw new Error(`Wallet returned null address. This usually means: 1) Wallet is locked, 2) Wallet has no addresses/transaction history, or 3) Wallet doesn't fully support CIP-30. Please try: unlocking your wallet, making a transaction first, or using Eternl wallet.`);
            } else {
                throw new Error(`Invalid wallet address format: "${address}". Expected address starting with addr1 or addr_test1.`);
            }
        }

        console.log(`[Wallet] ✅ Successfully connected to ${walletName}`);
        console.log(`[Wallet] Address: ${address.substring(0, 20)}...${address.substring(address.length - 10)}`);
        console.log(`[Wallet] Network: ${networkId === 1 ? 'Mainnet' : 'Testnet'}`);
        console.log(`[Wallet] Balance: ${balanceInAda} ADA`);

        return {
            name: walletName,
            api,
            address,
            balance: balanceInAda,
            networkId,
        };
    } catch (error) {
        console.error('[Wallet] Connection failed:', error);

        if (error instanceof Error) {
            const errorMsg = error.message.toLowerCase();
            console.error('[Wallet] Error message:', errorMsg);

            if (errorMsg.includes('user') || errorMsg.includes('reject') || errorMsg.includes('denied') || errorMsg.includes('cancel')) {
                throw new Error('Connection rejected. Please approve the connection in your wallet popup.');
            }
            if (errorMsg.includes('enable') || errorMsg.includes('not enabled')) {
                if (walletName === 'eternl') {
                    throw new Error(`Please unlock Eternl wallet and try again. Make sure:\n1. Eternl is unlocked\n2. You're on a Cardano-compatible site\n3. You approve the connection popup`);
                } else {
                    throw new Error(`Please unlock ${WALLET_METADATA[walletName].displayName} wallet and try again. Make sure your wallet is unlocked and ready to connect.`);
                }
            }
            if (errorMsg.includes('timeout')) {
                throw new Error('Connection timeout. Please make sure your wallet is unlocked and try again.');
            }
            // Return the original error message for debugging
            throw new Error(`Failed to connect: ${error.message}`);
        }
        throw new Error('Failed to connect to wallet. Please try again.');
    }
}

/**
 * Check if a wallet is currently connected
 */
export async function isWalletConnected(walletName: WalletName): Promise<boolean> {
    const cardano = getCardanoWindow();

    if (!cardano) {
        return false;
    }

    // Special handling for Eternl
    let wallet = cardano[walletName];
    if (walletName === 'eternl' && !wallet) {
        wallet = cardano['ccvault'];
    }

    if (!wallet) {
        return false;
    }

    try {
        return await wallet.isEnabled();
    } catch {
        return false;
    }
}

/**
 * Parse balance from CBOR hex string
 * Simplified version - in production use a proper CBOR library
 */
function parseBalance(balanceHex: string): number {
    try {
        // Simple case: just a number encoded
        if (balanceHex.length <= 18) {
            return parseInt(balanceHex, 16);
        }

        // For complex CBOR (with tokens), we need proper parsing
        // This is a simplified version that handles basic cases
        const bytes = hexToBytes(balanceHex);

        // Check if it's a simple integer or a map/array (multi-asset)
        if (bytes[0] <= 0x1b) {
            // Simple integer
            return parseCborInt(bytes);
        }

        // Multi-asset case: [lovelace, {policy: {asset: amount}}]
        // For now, return 0 if we can't parse
        return 0;
    } catch {
        return 0;
    }
}

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

function parseCborInt(bytes: Uint8Array): number {
    const major = bytes[0] >> 5;
    const additional = bytes[0] & 0x1f;

    if (major !== 0) return 0; // Not an unsigned int

    if (additional < 24) {
        return additional;
    } else if (additional === 24) {
        return bytes[1];
    } else if (additional === 25) {
        return (bytes[1] << 8) | bytes[2];
    } else if (additional === 26) {
        return (bytes[1] << 24) | (bytes[2] << 16) | (bytes[3] << 8) | bytes[4];
    } else if (additional === 27) {
        // 64-bit - JavaScript can handle up to 2^53
        let value = 0;
        for (let i = 1; i <= 8; i++) {
            value = value * 256 + bytes[i];
        }
        return value;
    }

    return 0;
}

/**
 * Get human-readable network name
 */
export function getNetworkName(networkId: number): string {
    switch (networkId) {
        case 0:
            return 'Testnet';
        case 1:
            return 'Mainnet';
        default:
            return 'Unknown';
    }
}

/**
 * Convert hex/CBOR address to bech32 format
 * Some wallets (like Nami, Lace) return addresses in hex/CBOR format that need conversion
 */
async function convertAddressToBech32(rawAddress: string, networkId: number, api: CardanoWalletApi): Promise<string | null> {
    try {
        // Check if it's already bech32
        if (rawAddress.startsWith('addr1') || rawAddress.startsWith('addr_test1')) {
            return rawAddress;
        }

        // If it's hex/CBOR, try to get bech32 from other wallet methods first
        // This is more reliable than trying to convert hex
        if (/^[0-9a-fA-F]+$/.test(rawAddress)) {
            console.log('[Wallet] Hex address detected, trying alternative wallet methods for bech32...');
            
            // Try getUsedAddresses - Nami/Lace often return bech32 here even if getChangeAddress returns hex
            try {
                const usedAddresses = await api.getUsedAddresses();
                console.log(`[Wallet] getUsedAddresses returned ${usedAddresses?.length || 0} addresses during conversion`);
                if (usedAddresses && usedAddresses.length > 0) {
                    // Log all addresses for debugging
                    usedAddresses.forEach((addr, idx) => {
                        const isValid = addr && (addr.startsWith('addr1') || addr.startsWith('addr_test1'));
                        console.log(`[Wallet] Used addr ${idx}: ${isValid ? '✅' : '❌'} ${addr?.substring(0, 30)}...`);
                    });
                    
                    const bech32Addr = usedAddresses.find(addr => 
                        addr && (addr.startsWith('addr1') || addr.startsWith('addr_test1'))
                    );
                    if (bech32Addr) {
                        console.log('[Wallet] ✅ Found bech32 address from getUsedAddresses during conversion');
                        return bech32Addr;
                    }
                }
            } catch (err) {
                console.warn('[Wallet] getUsedAddresses failed during conversion:', err);
            }
            
            // Try getUnusedAddresses
            try {
                const unusedAddresses = await api.getUnusedAddresses();
                console.log(`[Wallet] getUnusedAddresses returned ${unusedAddresses?.length || 0} addresses during conversion`);
                if (unusedAddresses && unusedAddresses.length > 0) {
                    unusedAddresses.forEach((addr, idx) => {
                        const isValid = addr && (addr.startsWith('addr1') || addr.startsWith('addr_test1'));
                        console.log(`[Wallet] Unused addr ${idx}: ${isValid ? '✅' : '❌'} ${addr?.substring(0, 30)}...`);
                    });
                    
                    const bech32Addr = unusedAddresses.find(addr => 
                        addr && (addr.startsWith('addr1') || addr.startsWith('addr_test1'))
                    );
                    if (bech32Addr) {
                        console.log('[Wallet] ✅ Found bech32 address from getUnusedAddresses during conversion');
                        return bech32Addr;
                    }
                }
            } catch (err) {
                console.warn('[Wallet] getUnusedAddresses failed during conversion:', err);
            }
            
            // Try using Cardano serialization library if available (for future use)
            if (Cardano && typeof Cardano.Address !== 'undefined') {
                try {
                    // Convert hex to bytes
                    const hexBytes = Uint8Array.from(
                        rawAddress.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
                    );
                    
                    // Try to decode as address
                    const address = Cardano.Address.from_bytes(hexBytes);
                    const bech32 = address.to_bech32();
                    
                    if (bech32 && (bech32.startsWith('addr1') || bech32.startsWith('addr_test1'))) {
                        console.log('[Wallet] ✅ Successfully converted hex to bech32 using Cardano library');
                        return bech32;
                    }
                } catch (libErr) {
                    console.warn('[Wallet] Cardano library conversion failed:', libErr);
                }
            }
        }

        console.warn('[Wallet] Could not convert address to bech32. Raw address:', rawAddress.substring(0, 50) + '...');
        return null;
    } catch (err) {
        console.error('[Wallet] Address conversion error:', err);
        return null;
    }
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string, chars: number = 8): string {
    if (!address) return '';
    if (address.length <= chars * 2 + 3) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Diagnostic function for wallet connection issues
 * Call this from browser console: window.zkreditWalletDiagnostics()
 */
export function walletDiagnostics(): void {
    console.log('🔍 Zkredit - Wallet Diagnostics');
    console.log('==================================');

    // Check if cardano object exists
    const cardano = getCardanoWindow();
    console.log('✅ Cardano object exists:', !!cardano);

    if (cardano) {
        console.log('📋 Available wallet keys:', Object.keys(cardano));

        // Check each wallet
        const wallets = ['eternl', 'ccvault', 'nami', 'lace', 'yoroi'];
        wallets.forEach(wallet => {
            const exists = !!cardano[wallet];
            const walletObj = cardano[wallet];
            console.log(`🔹 ${wallet}:`, exists ? '✅' : '❌');
            if (exists && walletObj) {
                console.log(`   - Name: ${walletObj.name || 'unknown'}`);
                console.log(`   - Version: ${walletObj.apiVersion || 'unknown'}`);
            }
        });

        // Check window.eternl directly
        const windowEternl = typeof window !== 'undefined' && (window as ZkreditWindow).eternl;
        console.log('🔹 window.eternl exists:', !!windowEternl);
    }

    // Instructions
    console.log('\n📖 Troubleshooting:');
    console.log('1. Make sure Eternl is installed and enabled');
    console.log('2. Unlock Eternl wallet');
    console.log('3. Refresh the page');
    console.log('4. Check browser console for errors');
    console.log('5. Try manual address entry as fallback');
}

// Make diagnostics available globally
if (typeof window !== 'undefined') {
    (window as ZkreditWindow).zkreditWalletDiagnostics = walletDiagnostics;
}

