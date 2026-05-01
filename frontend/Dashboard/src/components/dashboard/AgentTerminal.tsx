import { motion } from "framer-motion";
import { Activity } from "lucide-react";

interface AgentLog {
  id: string;
  agent: string;
  action: string;
  target: string;
  rate: string;
  status: "negotiating" | "completed" | "analyzing";
  timestamp: string;
}

const mockLogs: AgentLog[] = [
  {
    id: "1",
    agent: "Agent-Alpha",
    action: "Rate Negotiation",
    target: "USDC Pool",
    rate: "4.5%",
    status: "completed",
    timestamp: "2m ago",
  },
  {
    id: "2",
    agent: "Agent-Beta",
    action: "Liquidity Analysis",
    target: "ETH Vault",
    rate: "5.2%",
    status: "negotiating",
    timestamp: "5m ago",
  },
  {
    id: "3",
    agent: "Agent-Gamma",
    action: "Risk Assessment",
    target: "DAI Market",
    rate: "3.8%",
    status: "analyzing",
    timestamp: "8m ago",
  },
  {
    id: "4",
    agent: "Agent-Alpha",
    action: "Term Extension",
    target: "USDT Pool",
    rate: "4.1%",
    status: "completed",
    timestamp: "12m ago",
  },
];

export const AgentTerminal = () => {
  return (
    <motion.div
      className="glass-card rounded-2xl p-6 h-full flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
        <div className="relative">
          <Activity className="w-5 h-5 text-agent" strokeWidth={1.5} />
          <motion.div
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-agent"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
        <h2 className="text-lg font-semibold">Live Agent Status</h2>
      </div>
      
      {/* Logs Container */}
      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {mockLogs.map((log, index) => (
          <motion.div
            key={log.id}
            className="p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-start justify-between gap-4 font-mono text-xs">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-medium">{log.agent}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-foreground">{log.action}</span>
                </div>
                
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>Target: <span className="text-foreground">{log.target}</span></span>
                  <span className="text-success">Rate: {log.rate}</span>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    log.status === "completed"
                      ? "bg-success/20 text-success"
                      : log.status === "negotiating"
                      ? "bg-agent/20 text-agent"
                      : "bg-secondary/20 text-secondary"
                  }`}
                >
                  {log.status}
                </span>
                <span className="text-muted-foreground text-[10px]">{log.timestamp}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
