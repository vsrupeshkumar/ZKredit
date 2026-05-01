import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Network, Zap, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface HydraStatusProps {
  mode: 'hydra' | 'direct' | 'unavailable';
  connected?: boolean;
  headState?: string;
  activeNegotiations?: number;
  currentHeadId?: string;
}

export function HydraStatus({ mode, connected, headState, activeNegotiations, currentHeadId }: HydraStatusProps) {
  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'hydra':
        return 'bg-green-500';
      case 'direct':
        return 'bg-blue-500';
      case 'unavailable':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'hydra':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'direct':
        return <Network className="w-4 h-4" />;
      case 'unavailable':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getHeadStateColor = (state?: string) => {
    switch (state) {
      case 'Open':
        return 'bg-green-500';
      case 'Initializing':
        return 'bg-yellow-500';
      case 'Closed':
        return 'bg-red-500';
      case 'Idle':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="glass-panel p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <Zap className="w-5 h-5 text-primary" />
          Hydra Network Status
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${getModeColor(mode)} text-white border-0`}>
            {getModeIcon(mode)}
            <span className="ml-1 capitalize">{mode}</span>
          </Badge>
          {connected !== undefined && (
            <Badge variant="outline" className={connected ? 'bg-green-500 text-white border-0' : 'bg-red-500 text-white border-0'}>
              {connected ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              <span className="ml-1 text-xs">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Head State */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Head State</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${getHeadStateColor(headState)} text-white border-0`}>
              {headState || 'Unknown'}
            </Badge>
          </div>
        </div>

        {/* Active Negotiations */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Active Negotiations</p>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-foreground">
              {activeNegotiations || 0}
            </div>
            <span className="text-sm text-muted-foreground">heads</span>
          </div>
        </div>
      </div>

      {/* Mode Description */}
      <div className="mt-4 p-4 rounded-lg bg-secondary/30 border border-border">
        <div className="flex items-start gap-3">
          {mode === 'hydra' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
          ) : mode === 'direct' ? (
            <Network className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          )}

          <div>
            <p className="text-sm font-semibold mb-1 text-foreground">
              {mode === 'hydra'
                ? 'Hydra Layer 2 Active'
                : mode === 'direct'
                ? 'Direct Cardano Transactions'
                : 'Layer 2 Unavailable'
              }
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {mode === 'hydra'
                ? 'Zero-fee negotiations on Cardano Layer 2'
                : mode === 'direct'
                ? 'Direct blockchain transactions with gas fees'
                : 'Layer 2 connection required for optimal performance'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Head Information */}
      {((activeNegotiations && activeNegotiations > 0) || currentHeadId) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/30"
        >
          <p className="text-sm font-semibold text-primary mb-3">
            Active Hydra Heads
          </p>
          <div className="space-y-2">
            {/* Display current head if available */}
            {currentHeadId && (
              <div className="flex items-center justify-between text-sm p-3 rounded bg-secondary/30 border border-border">
                <div className="flex flex-col">
                  <span className="font-mono font-semibold text-foreground text-xs">{currentHeadId}</span>
                  <span className="text-muted-foreground text-xs mt-1">Current negotiation head</span>
                </div>
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/40">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {headState || 'Open'}
                </Badge>
              </div>
            )}

            {/* Display additional active heads */}
            {activeNegotiations && activeNegotiations > (currentHeadId ? 1 : 0) && (
              <>
                {Array.from({ length: Math.min(activeNegotiations - (currentHeadId ? 1 : 0), 4) }, (_, i) => (
                  <div key={i + (currentHeadId ? 1 : 0)} className="flex items-center justify-between text-sm p-3 rounded bg-secondary/30 border border-border">
                    <div className="flex flex-col">
                      <span className="font-mono font-semibold text-foreground text-xs">head_{String(i + 1).padStart(3, '0')}</span>
                      <span className="text-muted-foreground text-xs mt-1">Zero-gas negotiation active</span>
                    </div>
                    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/40">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Open
                    </Badge>
                  </div>
                ))}
              </>
            )}

            {/* Show count if no specific heads */}
            {!currentHeadId && activeNegotiations && activeNegotiations > 0 && (
              <div className="text-sm text-muted-foreground text-center py-2">
                {activeNegotiations} active negotiation{activeNegotiations !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </Card>
  );
}
