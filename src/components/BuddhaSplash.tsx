import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, Zap, Shield, CheckCircle2 } from "lucide-react";

interface SplashProps {
  onComplete: () => void;
}

const features = [
  {
    icon: <GitBranch size={24} />,
    title: "批量替换",
    description: "一次性修改多个Git仓库的远程地址",
  },
  {
    icon: <Zap size={24} />,
    title: "快速扫描",
    description: "自动识别工作目录中的所有Git仓库",
  },
  {
    icon: <Shield size={24} />,
    title: "安全可靠",
    description: "TypeScript + Rust构建，高速安全无忧",
  },
];

const tips = [
  // "支持 Git 和 SVN 仓库",
  "保留仓库历史记录",
  "操作日志实时查看",
  "批量替换仓库远程地址",
  "优雅的界面交互",
  "简洁明了的操作流程",
  "极速响应，流畅体验",
];

const Splash: React.FC<SplashProps> = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    const tipsTimer = setTimeout(() => setShowTips(true));
    const exitTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500);
    }, 2500);

    return () => {
      clearTimeout(tipsTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center z-[9999]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated Background */}
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(37,99,235,0.04)_0%,transparent_70%)] animate-[rotate_20s_linear_infinite]" />

          <div className="relative z-10 text-center px-10 max-w-[800px]">
            {/* Logo */}
            <motion.div
              className="mb-8 inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl shadow-lg"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <GitBranch size={40} className="text-white" />
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                Git远程地址批量替换工具
              </h1>
              <p className="text-lg text-slate-600 mb-12">
                高效、安全、易用的Git仓库管理工具
              </p>
            </motion.div>

            {/* Features */}
            <motion.div
              className="grid grid-cols-3 gap-6 mb-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-slate-100 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <div className="text-blue-600 mb-3 flex justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* Tips */}
            <AnimatePresence>
              {showTips && (
                <motion.div
                  className="mb-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.4 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-sm text-blue-700">
                    <CheckCircle2 size={16} />
                    {tips[Math.floor(Math.random() * tips.length)]}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading Bar */}
            <motion.div
              className="w-full max-w-md mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Splash;
