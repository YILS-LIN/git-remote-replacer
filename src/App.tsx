import { useState, useCallback } from "react";
import { ConfigProvider, theme, App as AntdApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import Splash from "./components/BuddhaSplash";
import MainLayout from "./components/MainLayout";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#2563eb",
          colorBgBase: "#f0f4ff",
          colorBgContainer: "#ffffff",
          colorBgElevated: "#ffffff",
          colorTextBase: "#1e293b",
          colorBorder: "#e2e8f0",
          borderRadius: 12,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        components: {
          Button: {
            borderRadius: 10,
            controlHeight: 44,
          },
          Input: {
            borderRadius: 10,
            controlHeight: 44,
          },
          Card: {
            borderRadius: 16,
          },
        },
      }}
    >
      <AntdApp>
        <div className="w-full h-full">
          {showSplash && <Splash onComplete={handleSplashComplete} />}
          <MainLayout />
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
