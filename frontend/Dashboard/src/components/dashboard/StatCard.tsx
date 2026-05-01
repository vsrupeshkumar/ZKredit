import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useRef } from "react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  trend?: string;
}

export const StatCard = ({ title, value, subtitle, icon: Icon, trend }: StatCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useSpring(useTransform(mouseY, [-100, 100], [5, -5]), {
    stiffness: 400,
    damping: 25,
  });
  const rotateY = useSpring(useTransform(mouseX, [-100, 100], [-5, 5]), {
    stiffness: 400,
    damping: 25,
  });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };
  
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };
  
  return (
    <motion.div
      ref={cardRef}
      className="glass-card rounded-2xl p-6 relative overflow-hidden group cursor-pointer"
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{
        y: -4,
        scale: 1.01,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
    >
      {/* Internal Glow on Hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "radial-gradient(circle at center, hsl(var(--primary) / 0.1), transparent 70%)",
        }}
      />
      
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-white/5">
            <Icon className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </div>
          {trend && (
            <span className="text-sm font-mono text-success">
              {trend}
            </span>
          )}
        </div>
        
        <div>
          <h3 className="text-sm text-muted-foreground mb-2">{title}</h3>
          <p className="text-3xl font-semibold tabular-nums tracking-tight">
            {value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
};
