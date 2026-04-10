#!/bin/bash

# BridgeAI Issue 合并管理脚本
# 将已完成的issue分支合并到master

set -e

PROJECT_PATH="/Users/apple/projects/bridgeai"
cd "$PROJECT_PATH"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              🔀 BridgeAI Issue 合并管理                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 已完成的issue列表
COMPLETED_ISSUES=("ISSUE-A002" "ISSUE-F005" "ISSUE-F006" "ISSUE-T001")

echo "📋 已完成的Issue:"
for issue in "${COMPLETED_ISSUES[@]}"; do
  echo "  • $issue"
done
echo ""

# 检查master分支状态
echo "🔍 当前分支状态:"
git branch -v | grep "^\*"
echo ""

# 检查每个issue分支的合并状态
echo "🔍 检查各issue分支是否可以干净合并:"
for issue in "${COMPLETED_ISSUES[@]}"; do
  branch="issue/${issue}"

  # 检查分支是否存在
  if ! git branch -a | grep -q "$branch"; then
    echo "  ❌ $issue: 分支不存在"
    continue
  fi

  # 检查是否已经合并
  if git branch -a --merged master | grep -q "$branch"; then
    echo "  ✅ $issue: 已合并到master"
    continue
  fi

  # 尝试合并测试（不实际合并）
  if git merge-tree $(git merge-base master $branch) master $branch | grep -q "<<<<<<<"; then
    echo "  ⚠️  $issue: 存在合并冲突"
  else
    echo "  ✓  $issue: 可以干净合并"
  fi
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🎮 操作选项:"
echo ""
echo "1) 合并所有可干净合并的issue"
echo "2) 逐个合并并解决冲突"
echo "3) 仅查看状态"
echo "4) 退出"
echo ""

if [ "$1" == "auto" ]; then
  choice="1"
else
  read -p "请选择 (1-4): " choice
fi

case $choice in
  1)
    echo ""
    echo "🔄 开始合并..."
    git checkout master

    for issue in "${COMPLETED_ISSUES[@]}"; do
      branch="issue/${issue}"

      # 跳过已合并的
      if git branch -a --merged master | grep -q "$branch"; then
        echo "  ⏭️  $issue: 已合并，跳过"
        continue
      fi

      # 检查是否有冲突
      if git merge-tree $(git merge-base master $branch) master $branch | grep -q "<<<<<<<"; then
        echo "  ⚠️  $issue: 有冲突，跳过（请手动合并）"
        continue
      fi

      # 合并
      echo "  🔀 合并 $issue..."
      if git merge "$branch" --no-edit -m "Merge $issue: Implementation"; then
        echo "  ✅ $issue: 合并成功"
      else
        echo "  ❌ $issue: 合并失败"
        git merge --abort 2>/dev/null || true
      fi
    done

    echo ""
    echo "✅ 合并完成"
    git log --oneline -5
    ;;

  2)
    echo ""
    echo "🔄 逐个合并模式..."
    git checkout master

    for issue in "${COMPLETED_ISSUES[@]}"; do
      branch="issue/${issue}"

      # 跳过已合并的
      if git branch -a --merged master | grep -q "$branch"; then
        echo "  ⏭️  $issue: 已合并，跳过"
        continue
      fi

      echo ""
      read -p "是否合并 $issue? (y/n/skip): " confirm

      if [ "$confirm" == "y" ]; then
        echo "  🔀 合并 $issue..."
        if git merge "$branch" --no-edit; then
          echo "  ✅ $issue: 合并成功"
        else
          echo "  ⚠️  $issue: 有冲突，请手动解决"
          echo "  解决后运行: git add -A && git commit -m \"Merge $issue\""
          echo "  或取消: git merge --abort"
          exit 1
        fi
      else
        echo "  ⏭️  跳过 $issue"
      fi
    done
    ;;

  3)
    echo "仅查看状态，不进行合并"
    ;;

  *)
    echo "退出"
    exit 0
    ;;
esac

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "完成！"
