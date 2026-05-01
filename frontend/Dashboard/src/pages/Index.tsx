import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { StatCard } from "@/components/dashboard/StatCard";
import { AgentTerminal } from "@/components/dashboard/AgentTerminal";
import { AssetTable } from "@/components/dashboard/AssetTable";
import { Wallet, Cpu, TrendingUp } from "lucide-react";

const Index = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25,
      },
    },
  };

  return (
    <AuroraBackground>
      <div className="min-h-screen p-8">
        {/* Header */}
        <motion.header
          className="mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Zkredit Dashboard
          </h1>
          <p className="text-muted-foreground">
            Autonomous lending intelligence powered by neural negotiation agents
          </p>
        </motion.header>

        {/* Bento Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Top Row - Stat Cards */}
          <motion.div variants={itemVariants}>
            <StatCard
              title="Total Borrowed"
              value="$2.4M"
              subtitle="Across 12 protocols"
              icon={Wallet}
              trend="+12.5%"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <StatCard
              title="Active Agents"
              value="24"
              subtitle="Negotiating rates"
              icon={Cpu}
              trend="+3"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <StatCard
              title="Avg APY"
              value="4.8%"
              subtitle="Optimized yield"
              icon={TrendingUp}
              trend="+0.3%"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <StatCard
              title="Saved Fees"
              value="$18.2K"
              subtitle="This month"
              icon={TrendingUp}
              trend="+22%"
            />
          </motion.div>

          {/* Middle Row - Agent Terminal (Left) */}
          <motion.div
            className="md:col-span-2 min-h-[400px]"
            variants={itemVariants}
          >
            <AgentTerminal />
          </motion.div>

          {/* Middle Row - Asset Table (Right) */}
          <motion.div
            className="md:col-span-2 min-h-[400px]"
            variants={itemVariants}
          >
            <AssetTable />
          </motion.div>
        </motion.div>
      </div>
    </AuroraBackground>
  );
};

export default Index;
