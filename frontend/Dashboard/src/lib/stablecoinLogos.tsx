/**
 * Stablecoin Logo URLs
 * Maps stablecoin symbols to their logo image URLs
 */

import React, { useState } from 'react';

export type Stablecoin = 'USDT' | 'USDC' | 'DAI' | 'USDD' | 'TUSD' | 'BUSD';

// Using CoinGecko CDN for stablecoin logos
const STABLECOIN_LOGOS: Record<Stablecoin, string> = {
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  DAI: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
  USDD: 'https://assets.coingecko.com/coins/images/25380/small/USDD.jpg',
  TUSD: 'https://assets.coingecko.com/coins/images/3449/small/tusd.png',
  BUSD: 'https://assets.coingecko.com/coins/images/9576/small/BUSD.png',
};

/**
 * Get logo URL for a stablecoin
 */
export function getStablecoinLogo(symbol: Stablecoin): string {
  return STABLECOIN_LOGOS[symbol] || STABLECOIN_LOGOS.USDT;
}

/**
 * Stablecoin logo component props
 */
export interface StablecoinLogoProps {
  symbol: Stablecoin;
  size?: number;
  className?: string;
}

/**
 * Stablecoin Logo Component
 */
export function StablecoinLogo({ symbol, size = 24, className = '' }: StablecoinLogoProps) {
  const logoUrl = getStablecoinLogo(symbol);
  const [imgError, setImgError] = useState(false);
  
  if (imgError) {
    // Fallback to a simple colored circle if image fails to load
    return (
      <div
        className={`rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary ${className}`}
        style={{ width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, minHeight: `${size}px` }}
      >
        {symbol[0]}
      </div>
    );
  }
  
  return (
    <img
      src={logoUrl}
      alt={symbol}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      style={{ minWidth: `${size}px`, minHeight: `${size}px` }}
      onError={() => setImgError(true)}
    />
  );
}

