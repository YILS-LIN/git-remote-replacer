import { useState, useEffect } from "react";
import { Minus, Square, X, GitBranch, ExternalLink } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();
  }, [appWindow]);

  const handleMinimize = async () => {
    await appWindow.minimize();
  };

  const handleMaximize = async () => {
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      await appWindow.unmaximize();
      setIsMaximized(false);
    } else {
      await appWindow.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = async () => {
    await appWindow.close();
  };

  const handleOpenBlog = async () => {
    try {
      await openUrl("https://yils.blog/?ref=git-remote-replacer");
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  return (
    <div className="h-12 bg-white/95 backdrop-blur-[12px] border-b border-slate-200/80 flex items-center justify-between px-5 pr-4 relative z-[1000]">
      <div className="flex items-center gap-3 flex-1 [app-region:drag] [-webkit-app-region:drag]">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center text-white shadow-sm">
          <GitBranch size={18} />
        </div>
        <span className="text-sm font-semibold text-slate-800 tracking-wide">
          Git远程地址批量替换工具
        </span>
        <a
          onClick={handleOpenBlog}
          className="text-xs text-slate-500 hover:text-blue-600 cursor-pointer transition-colors flex items-center gap-1 [app-region:no-drag] [-webkit-app-region:no-drag]"
          title="访问 YILS 的博客"
        >
          By YILS
          <ExternalLink size={12} />
        </a>
      </div>
      <div className="flex items-center gap-1.5 [app-region:no-drag] [-webkit-app-region:no-drag]">
        <button
          className="w-9 h-9 border-none bg-transparent rounded-lg flex items-center justify-center cursor-pointer text-slate-500 transition-all duration-200 ease-out hover:bg-slate-100 hover:text-slate-800 active:scale-95"
          onClick={handleMinimize}
          title="最小化"
        >
          <Minus size={15} />
        </button>
        <button
          className="w-9 h-9 border-none bg-transparent rounded-lg flex items-center justify-center cursor-pointer text-slate-500 transition-all duration-200 ease-out hover:bg-slate-100 hover:text-slate-800 active:scale-95"
          onClick={handleMaximize}
          title={isMaximized ? "还原" : "最大化"}
        >
          <Square size={13} />
        </button>
        <button
          className="w-9 h-9 border-none bg-transparent rounded-lg flex items-center justify-center cursor-pointer text-slate-500 transition-all duration-200 ease-out hover:bg-red-500 hover:text-white active:scale-95"
          onClick={handleClose}
          title="关闭"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
