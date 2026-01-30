import { useState, useCallback, useEffect, useRef } from "react";
import {
  Button,
  Input,
  Form,
  Typography,
  List,
  Badge,
  Progress,
  Empty,
  Tag,
  Tooltip,
  message,
  Divider,
  Modal,
} from "antd";
import {
  FolderOpen,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  Trash2,
  CloudOff,
  Cloud,
  GitPullRequest,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  ScanResult,
  RepoInfo,
  ReplaceProgress,
  ReplaceResult,
} from "../types";
import TitleBar from "./TitleBar";
import "./MainLayout.scss";

const { Text, Title } = Typography;

const MainLayout = () => {
  const [form] = Form.useForm();
  const [workDir, setWorkDir] = useState("");
  const [oldDomain, setOldDomain] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isSelectingDir, setIsSelectingDir] = useState(false);
  const [replaceProgress, setReplaceProgress] =
    useState<ReplaceProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [replaceResults, setReplaceResults] = useState<ReplaceResult[]>([]);
  const listenerRegistered = useRef(false); // 跟踪监听器是否已注册

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${message}`,
      ...prev,
    ]);
  }, []);

  // 监听扫描进度事件
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      // 防止重复注册监听器
      if (listenerRegistered.current) {
        return;
      }

      try {
        unlisten = await listen<string>(
          "scan-progress",
          (event: { payload: string }) => {
            addLog(event.payload);
          },
        );
        listenerRegistered.current = true;
      } catch (error) {
        console.error("Failed to setup scan-progress listener:", error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
        listenerRegistered.current = false;
      }
    };
  }, []); // 移除 addLog 依赖，防止重复注册监听器

  const handleSelectDir = async () => {
    setIsSelectingDir(true);
    try {
      const result = await invoke<string | null>("select_directory");
      if (result) {
        setWorkDir(result);
        form.setFieldsValue({ workDir: result });
        addLog(`已选择工作目录: ${result}`);
      }
    } catch (error) {
      message.error("选择目录失败");
      console.error(error);
    } finally {
      setIsSelectingDir(false);
    }
  };

  const handleScan = async () => {
    if (!workDir) {
      message.warning("请先选择工作目录");
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    setReplaceResults([]);
    // 删除了前端的 "开始扫描工作目录..." 日志，因为后端会通过事件发送

    try {
      const result = await invoke<ScanResult>("scan_repositories", {
        workDir,
        oldDomain,
        newDomain,
      });
      setScanResult(result);
      // 删除了前端的完成日志，因为后端会通过事件发送
      message.success(`扫描完成！发现 ${result.repoCount} 个仓库`);
    } catch (error) {
      message.error("扫描失败");
      addLog(`扫描失败: ${error}`);
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  const executeReplace = async (matchedRepos: RepoInfo[]) => {
    setIsReplacing(true);
    setReplaceResults([]);
    addLog("开始替换远程地址...");

    const total = matchedRepos.length;

    for (let i = 0; i < total; i++) {
      const repo = matchedRepos[i];
      setReplaceProgress({
        current: i + 1,
        total,
        currentRepo: repo.path,
        message: `正在处理: ${repo.path}`,
      });
      addLog(`[${i + 1}/${total}] 处理: ${repo.path}`);

      try {
        const result = await invoke<ReplaceResult>("replace_remote_url", {
          repoPath: repo.path,
          oldUrl: repo.oldUrl,
          newUrl: repo.newUrl,
        });
        setReplaceResults((prev) => [...prev, result]);
        if (result.success) {
          addLog(`✓ 成功: ${repo.path}`);
        } else {
          addLog(`✗ 失败: ${repo.path} - ${result.error}`);
        }
      } catch (error) {
        const failedResult: ReplaceResult = {
          success: false,
          path: repo.path,
          oldUrl: repo.oldUrl,
          newUrl: repo.newUrl,
          error: String(error),
        };
        setReplaceResults((prev) => [...prev, failedResult]);
        addLog(`✗ 失败: ${repo.path} - ${error}`);
      }
    }

    setReplaceProgress(null);
    setIsReplacing(false);
    addLog("替换操作完成");
    message.success("替换完成！");
  };

  const handleReplace = async () => {
    if (!scanResult || scanResult.repos.length === 0) {
      message.warning("没有可替换的仓库");
      return;
    }

    // 获取匹配的仓库数量
    const matchedRepos = scanResult.repos.filter((r) => r.matched);
    if (matchedRepos.length === 0) {
      message.warning("没有匹配的仓库需要替换");
      return;
    }

    // 显示确认对话框
    Modal.confirm({
      title: "确认替换",
      content: `即将替换 ${matchedRepos.length} 个匹配仓库的远程地址。是否继续？`,
      okText: "确认",
      cancelText: "取消",
      onOk: () => {
        // 立即关闭弹窗，让用户可以看到实时进度
        Modal.destroyAll();
        // 执行替换操作
        executeReplace(matchedRepos);
      },
    });
  };

  const handleClear = () => {
    setWorkDir("");
    setScanResult(null);
    setReplaceResults([]);
    setLogs([]);
    setReplaceProgress(null);
    form.resetFields();
    addLog("已清空所有数据");
  };

  const successCount = replaceResults.filter((r) => r.success).length;
  const failCount = replaceResults.filter((r) => !r.success).length;
  const matchedCount = scanResult?.repos.filter((r) => r.matched).length || 0;

  return (
    <div className="main-layout">
      <TitleBar />

      <div className="main-container">
        {/* Left Panel - Configuration */}
        <div className="left-panel">
          <div className="panel-header">
            <GitPullRequest size={18} />
            <span>配置设置</span>
          </div>

          <div className="panel-content">
            <Form form={form} layout="vertical" className="config-form">
              <Form.Item label="工作目录" required className="form-item">
                <div className="input-with-button">
                  <Input
                    value={workDir}
                    readOnly
                    placeholder="请选择工作目录"
                    prefix={<FolderOpen size={16} />}
                    className="custom-input"
                  />
                  <Button
                    type="primary"
                    icon={<FolderOpen size={16} />}
                    onClick={handleSelectDir}
                  >
                    选择
                  </Button>
                </div>
              </Form.Item>

              <Form.Item label="原仓库域名" required className="form-item">
                <Input
                  value={oldDomain}
                  onChange={(e) => setOldDomain(e.target.value)}
                  placeholder="例如: https://deprecated.example.com/"
                  prefix={<CloudOff size={16} />}
                  className="custom-input"
                  disabled={isScanning || isReplacing || isSelectingDir}
                />
              </Form.Item>

              <Form.Item label="新仓库域名" required className="form-item">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="例如: https://gitlab.example.com/"
                  prefix={<Cloud size={16} />}
                  className="custom-input"
                  disabled={isScanning || isReplacing || isSelectingDir}
                />
              </Form.Item>
            </Form>

            <Divider style={{ margin: "16px 0" }} />

            <div className="action-buttons">
              <Button
                type="primary"
                size="large"
                icon={<Search size={18} />}
                loading={isScanning}
                onClick={handleScan}
                disabled={!workDir || isSelectingDir}
                block
                className="action-btn scan-btn"
              >
                开始扫描
              </Button>

              <Button
                type="primary"
                size="large"
                icon={<RefreshCw size={18} />}
                loading={isReplacing}
                onClick={handleReplace}
                disabled={
                  !scanResult ||
                  scanResult.repos.length === 0 ||
                  isReplacing ||
                  isSelectingDir
                }
                className="action-btn replace-btn"
                block
              >
                开始替换
              </Button>

              <Button
                icon={<Trash2 size={16} />}
                onClick={handleClear}
                disabled={isScanning || isReplacing || isSelectingDir}
                className="clear-btn"
                block
              >
                清空数据
              </Button>
            </div>

            {isReplacing && replaceProgress && (
              <div className="progress-section">
                <Progress
                  percent={Math.round(
                    (replaceProgress.current / replaceProgress.total) * 100,
                  )}
                  status="active"
                  strokeColor={{ from: "#2563eb", to: "#3b82f6" }}
                  size="small"
                />
                <Text className="progress-text">
                  {replaceProgress.current} / {replaceProgress.total}
                </Text>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="right-panel">
          {/* Stats Bar */}
          {scanResult && (
            <div className="stats-bar">
              <div className="stat-item">
                <span className="stat-label">扫描目录</span>
                <span className="stat-value">{scanResult.totalDirs}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Git仓库</span>
                <span className="stat-value primary">
                  {scanResult.repoCount}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">匹配仓库</span>
                <span className="stat-value matched">{matchedCount}</span>
              </div>
              {replaceResults.length > 0 && (
                <>
                  <div className="stat-item">
                    <span className="stat-label">成功</span>
                    <span className="stat-value success">{successCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">失败</span>
                    <span
                      className={`stat-value ${failCount > 0 ? "error" : ""}`}
                    >
                      {failCount}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Content Area */}
          <div className="content-area">
            {/* Repository List */}
            {scanResult ? (
              <div className="repo-list-container">
                <div className="section-header">
                  <GitPullRequest size={16} />
                  <span>仓库列表</span>
                  <div className="badges-group">
                    <Badge
                      count={matchedCount}
                      style={{ backgroundColor: "#10b981" }}
                    />
                    <Badge
                      count={scanResult.repos.length}
                      style={{ backgroundColor: "#2563eb" }}
                    />
                  </div>
                </div>

                {scanResult.repos.length > 0 ? (
                  <List
                    className="repo-list"
                    dataSource={scanResult.repos.sort(
                      (a, b) => Number(b.matched) - Number(a.matched),
                    )}
                    renderItem={(repo: RepoInfo, index) => {
                      const replaceResult = replaceResults.find(
                        (r) => r.path === repo.path,
                      );
                      return (
                        <List.Item
                          className={`repo-item ${!repo.matched ? "unmatched" : ""}`}
                        >
                          <div className="repo-content">
                            <div className="repo-header">
                              <Tag
                                color={repo.matched ? "blue" : "default"}
                                className="repo-index"
                              >
                                {index + 1}
                              </Tag>
                              <Text
                                className="repo-path"
                                ellipsis={{ tooltip: repo.path }}
                              >
                                {repo.path}
                              </Text>
                              {!repo.matched && (
                                <Tag color="default" className="unmatched-tag">
                                  不匹配
                                </Tag>
                              )}
                              {replaceResult && (
                                <Tooltip
                                  title={
                                    replaceResult.success
                                      ? "成功"
                                      : replaceResult.error
                                  }
                                >
                                  {replaceResult.success ? (
                                    <CheckCircle2
                                      size={18}
                                      className="status-icon success"
                                    />
                                  ) : (
                                    <XCircle
                                      size={18}
                                      className="status-icon error"
                                    />
                                  )}
                                </Tooltip>
                              )}
                            </div>
                            <div className="repo-urls">
                              <div className="url-row">
                                <span className="url-label">原地址</span>
                                <Text
                                  className="url-value"
                                  code
                                  copyable={{ text: repo.oldUrl }}
                                >
                                  {repo.oldUrl}
                                </Text>
                              </div>
                              {repo.matched && (
                                <div className="url-row">
                                  <span className="url-label">新地址</span>
                                  <Text
                                    className="url-value new"
                                    code
                                    copyable={{ text: repo.newUrl }}
                                  >
                                    {repo.newUrl}
                                  </Text>
                                </div>
                              )}
                            </div>
                          </div>
                        </List.Item>
                      );
                    }}
                  />
                ) : (
                  <Empty
                    description="未找到符合条件的 Git 仓库"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    className="custom-empty"
                  />
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <GitPullRequest size={64} />
                </div>
                <Title level={4} className="empty-title">
                  开始扫描
                </Title>
                <Text className="empty-desc">
                  选择工作目录并点击"开始扫描"按钮查找Git仓库
                </Text>
              </div>
            )}

            {/* Logs Panel */}
            {logs.length > 0 && (
              <div className="logs-panel">
                <div className="section-header">
                  <FileText size={16} />
                  <span>操作日志</span>
                </div>
                <div className="logs-content">
                  {logs.map((log, index) => (
                    <div key={index} className="log-line">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
