import { motion } from "framer-motion";
import { ArrowRight, Coins } from "lucide-react";
import { StablecoinLogo, Stablecoin } from "@/lib/stablecoinLogos";

interface Asset {
  id: string;
  name: string;
  symbol: string;
  apr: string;
  liquidity: string;
  icon: string;
}

const mockAssets: Asset[] = [
  {
    id: "1",
    name: "USD Coin",
    symbol: "USDC",
    apr: "4.5%",
    liquidity: "$12.4M",
    icon: "$",
  },
  {
    id: "2",
    name: "Ethereum",
    symbol: "ETH",
    apr: "5.2%",
    liquidity: "$8.7M",
    icon: "E",
  },
  {
    id: "3",
    name: "Dai Stablecoin",
    symbol: "DAI",
    apr: "3.8%",
    liquidity: "$15.2M",
    icon: "D",
  },
  {
    id: "4",
    name: "Tether USD",
    symbol: "USDT",
    apr: "4.1%",
    liquidity: "$9.8M",
    icon: "T",
  },
];

const STABLECOIN_SYMBOLS: Stablecoin[] = ["USDT", "USDC", "DAI", "USDD", "TUSD", "BUSD"];

function isStablecoinSymbol(symbol: string): symbol is Stablecoin {
  return STABLECOIN_SYMBOLS.includes(symbol as Stablecoin);
}

export const AssetTable = () => {
  return (
    <motion.div
      className="glass-card rounded-2xl p-6 h-full flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
        <Coins className="w-5 h-5 text-secondary" strokeWidth={1.5} />
        <h2 className="text-lg font-semibold">Available Assets</h2>
      </div>
      
      {/* Table */}
      <div className="flex-1 space-y-2">
        {mockAssets.map((asset, index) => (
          <motion.div
            key={asset.id}
            className="group flex items-center justify-between p-4 rounded-full bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ x: 4 }}
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                {isStablecoinSymbol(asset.symbol) ? (
                  <StablecoinLogo symbol={asset.symbol} size={40} />
                ) : (
                  <span className="text-xl">{asset.icon}</span>
                )}
              </div>
              
              <div>
                <p className="font-medium text-foreground">{asset.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{asset.symbol}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm font-mono tabular-nums text-success font-medium">
                  {asset.apr}
                </p>
                <p className="text-xs text-muted-foreground">APR</p>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-mono tabular-nums text-foreground">
                  {asset.liquidity}
                </p>
                <p className="text-xs text-muted-foreground">Liquidity</p>
              </div>
              
              <motion.button
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
