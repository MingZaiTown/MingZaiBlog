#!/bin/bash
# 一键同步 Obsidian 笔记并部署博客
# 用法: bash sync.sh

set -e

echo "===== 1. 从 Obsidian 导入笔记 ====="
python3 import_notes.py

echo ""
echo "===== 2. 生成静态文件 ====="
npx hexo generate

echo ""
echo "===== 3. 推送到 GitHub（Cloudflare 自动部署）====="
git add -A
git commit -m "sync: $(date '+%Y-%m-%d %H:%M')"
git push

echo ""
echo "✅ 完成！等待 1-2 分钟后 Cloudflare 自动部署"
