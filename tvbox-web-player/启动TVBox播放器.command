#!/bin/bash
# 启动 TVBox 播放器本地服务（本地代理 + DLNA 投屏）
# 用法：双击本文件即可。关闭本终端窗口 = 停止服务。

SERVER_JS="$HOME/nexus-hub/tvbox/local-server.js"
LOG_FILE="$HOME/.tvbox-local-server.log"
PORT=8080

# ---------- 定位 Node.js（Finder 启动不走 .zshrc，PATH 可能不全） ----------
NODE_BIN="$(command -v node)"
[ -x "$NODE_BIN" ] || NODE_BIN="/opt/homebrew/bin/node"
[ -x "$NODE_BIN" ] || NODE_BIN="/usr/local/bin/node"
[ -x "$NODE_BIN" ] || NODE_BIN="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin/node"

if [ ! -x "$NODE_BIN" ]; then
  echo "❌ 未找到 Node.js，请先安装：https://nodejs.org （装完再双击本文件）"
  read -n 1 -s -r -p "按任意键关闭..."
  exit 1
fi

if [ ! -f "$SERVER_JS" ]; then
  echo "❌ 未找到服务文件：$SERVER_JS"
  echo "   请确认 nexus-hub 仓库在用户目录下且已拉取最新代码。"
  read -n 1 -s -r -p "按任意键关闭..."
  exit 1
fi

# ---------- 清理端口占用 ----------
EXISTING=$(lsof -ti tcp:$PORT 2>/dev/null)
if [ -n "$EXISTING" ]; then
  echo "ℹ️  端口 $PORT 已被占用（旧进程），先结束它..."
  kill $EXISTING 2>/dev/null
  sleep 1
fi

# ---------- 启动 ----------
cd "$(dirname "$SERVER_JS")" || exit 1
echo "🚀 正在启动 TVBox 本地服务（Node: $NODE_BIN）..."
"$NODE_BIN" "$SERVER_JS" > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null; exit 0' INT TERM HUP

sleep 1
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "❌ 服务启动失败，日志如下："
  echo "-----------------------------------"
  cat "$LOG_FILE"
  echo "-----------------------------------"
  read -n 1 -s -r -p "按任意键关闭..."
  exit 1
fi

open "http://localhost:$PORT"

echo ""
echo "✅ TVBox 本地服务已启动（PID $SERVER_PID）"
echo "   • 播放器页面: http://localhost:$PORT （已在浏览器打开）"
echo "   • DLNA 投屏: 已就绪，可发现同一局域网内的小米电视"
echo "   • 运行日志: $LOG_FILE"
echo ""
echo "   ⚠️  保持本窗口开启；关闭本窗口即停止服务。"
echo ""

wait $SERVER_PID
