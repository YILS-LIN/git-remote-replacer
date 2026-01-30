use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use tauri::{Emitter, Manager};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RepoInfo {
    pub path: String,
    pub old_url: String,
    pub new_url: String,
    pub matched: bool,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub total_dirs: i32,
    pub repo_count: i32,
    pub repos: Vec<RepoInfo>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceResult {
    pub success: bool,
    pub path: String,
    pub old_url: String,
    pub new_url: String,
    pub error: Option<String>,
}

fn is_git_repo(directory: &Path) -> bool {
    directory.join(".git").is_dir()
}

#[cfg(windows)]
fn create_hidden_command(program: &str) -> Command {
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    let mut cmd = Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[cfg(not(windows))]
fn create_hidden_command(program: &str) -> Command {
    Command::new(program)
}

fn get_git_origin_url(directory: &Path) -> Option<String> {
    let output = create_hidden_command("git")
        .args(["-C", directory.to_str()?, "remote", "get-url", "origin"])
        .output()
        .ok()?;

    if output.status.success() {
        String::from_utf8(output.stdout)
            .ok()
            .map(|s| s.trim().to_string())
    } else {
        None
    }
}

fn set_git_origin_url(directory: &Path, new_url: &str) -> Result<(), String> {
    let output = create_hidden_command("git")
        .args([
            "-C",
            directory.to_str().unwrap(),
            "remote",
            "set-url",
            "origin",
            new_url,
        ])
        .output()
        .map_err(|e| format!("执行 git 命令失败: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("设置远程 URL 失败: {}", stderr))
    }
}

#[tauri::command]
pub fn scan_repositories(
    work_dir: String,
    old_domain: String,
    new_domain: String,
    app: tauri::AppHandle,
) -> Result<ScanResult, String> {
    let work_path = Path::new(&work_dir);

    if !work_path.exists() {
        return Err("工作目录不存在".to_string());
    }

    if !work_path.is_dir() {
        return Err("指定路径不是目录".to_string());
    }

    let mut total_dirs = 0;
    let mut repos = Vec::new();

    fn scan_directory(
        dir: &Path,
        old_domain: &str,
        new_domain: &str,
        total_dirs: &mut i32,
        repos: &mut Vec<RepoInfo>,
        app: &tauri::AppHandle,
        is_root: bool,
    ) -> Result<(), String> {
        if !is_root {
            // 对于子目录，先检查是否是 Git 仓库
            if is_git_repo(dir) {
                let _ = app.emit("scan-progress", format!("发现 Git 仓库: {}", dir.display()));

                if let Some(old_url) = get_git_origin_url(dir) {
                    if old_url.contains(old_domain) {
                        let new_url = old_url.replacen(old_domain, new_domain, 1);
                        let _ = app.emit("scan-progress", format!("✓ 匹配仓库: {}", dir.display()));
                        repos.push(RepoInfo {
                            path: dir.to_string_lossy().to_string(),
                            old_url,
                            new_url,
                            matched: true,
                        });
                    } else {
                        let _ =
                            app.emit("scan-progress", format!("  不匹配仓库: {}", dir.display()));
                        repos.push(RepoInfo {
                            path: dir.to_string_lossy().to_string(),
                            old_url,
                            new_url: String::new(),
                            matched: false,
                        });
                    }
                    return Ok(());
                }
            }
        }

        // 扫描子目录
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();

                if path.is_dir() {
                    let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

                    if file_name == ".git" || file_name == "node_modules" {
                        continue;
                    }

                    *total_dirs += 1;

                    // 发送扫描进度事件
                    let _ = app.emit("scan-progress", format!("扫描目录: {}", path.display()));

                    scan_directory(&path, old_domain, new_domain, total_dirs, repos, app, false)?;
                }
            }
        }
        Ok(())
    }

    let _ = app.emit("scan-progress", format!("开始扫描目录: {}", work_dir));

    scan_directory(
        work_path,
        &old_domain,
        &new_domain,
        &mut total_dirs,
        &mut repos,
        &app,
        true,
    )?;

    let _ = app.emit(
        "scan-progress",
        format!(
            "扫描完成！共扫描 {} 个目录，发现 {} 个符合条件的仓库",
            total_dirs,
            repos.len()
        ),
    );

    Ok(ScanResult {
        total_dirs,
        repo_count: repos.len() as i32,
        repos,
    })
}

#[tauri::command]
pub fn replace_remote_url(
    repo_path: String,
    old_url: String,
    new_url: String,
) -> Result<ReplaceResult, String> {
    let path = Path::new(&repo_path);

    if !path.exists() {
        return Ok(ReplaceResult {
            success: false,
            path: repo_path,
            old_url,
            new_url,
            error: Some("仓库路径不存在".to_string()),
        });
    }

    if !is_git_repo(path) {
        return Ok(ReplaceResult {
            success: false,
            path: repo_path,
            old_url,
            new_url,
            error: Some("不是有效的 Git 仓库".to_string()),
        });
    }

    if let Some(current_url) = get_git_origin_url(path) {
        if current_url != old_url {
            return Ok(ReplaceResult {
                success: false,
                path: repo_path,
                old_url,
                new_url,
                error: Some(format!("当前远程 URL 不匹配: {}", current_url)),
            });
        }
    } else {
        return Ok(ReplaceResult {
            success: false,
            path: repo_path,
            old_url,
            new_url,
            error: Some("无法获取当前远程 URL".to_string()),
        });
    }

    match set_git_origin_url(path, &new_url) {
        Ok(_) => Ok(ReplaceResult {
            success: true,
            path: repo_path,
            old_url,
            new_url,
            error: None,
        }),
        Err(e) => Ok(ReplaceResult {
            success: false,
            path: repo_path,
            old_url,
            new_url,
            error: Some(e),
        }),
    }
}

#[tauri::command]
pub async fn select_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    // 禁用主窗口交互
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_ignore_cursor_events(true);
    }

    let folder_path = app.dialog().file().blocking_pick_folder();

    // 恢复主窗口交互
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_ignore_cursor_events(false);
    }

    Ok(folder_path.map(|p| p.to_string()))
}
