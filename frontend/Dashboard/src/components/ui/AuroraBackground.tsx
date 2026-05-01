import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AuroraBackgroundProps {
  children: ReactNode;
}

export const AuroraBackground = ({ children }: AuroraBackgroundProps) => {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden transition-colors duration-500">
      {/* Dot Pattern Texture */}
      <div className="absolute inset-0 dot-pattern opacity-10 dark:opacity-10" />
      
      {/* Animated Aurora Gradients */}
      <motion.div
        className="absolute top-0 left-1/4 w-[800px] h-[800px] rounded-full opacity-10 dark:opacity-20 blur-[120px]"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
        }}
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full opacity-10 dark:opacity-20 blur-[120px]"
        style={{
          background: "radial-gradient(circle, hsl(var(--secondary)) 0%, transparent 70%)",
        }}
        animate={{
          x: [0, -80, 0],
          y: [0, -60, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Light mode: Soft gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-pastel-purple/5 via-transparent to-ocean-blue/5 dark:opacity-0 transition-opacity duration-500" />
      
      {/* Content Layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
