#!/bin/bash
# 批量导入 Obsidian 笔记到 Hexo (v2 - 修复图片冲突)

OBSIDIAN_DIR="/mnt/win_E_Elex/Files/MingNote"
POSTS_DIR="/home/mingzai/Projects/MingZaiBlog/source/_posts"
IMAGES_DIR="/home/mingzai/Projects/MingZaiBlog/source/images"

# 清空重建
rm -rf "$POSTS_DIR"/* "$IMAGES_DIR"/*
mkdir -p "$IMAGES_DIR"

count_md=0
count_img=0

process_md() {
    local md_file="$1"
    local relative_path="${md_file#$OBSIDIAN_DIR/}"
    local dir_part=$(dirname "$relative_path")
    local filename=$(basename "$md_file" .md)

    # 跳过
    if echo "$md_file" | grep -qE "Excalidraw|未命名"; then
        return
    fi
    if [[ "$dir_part" == "." && "$filename" == "未命名" ]]; then
        return
    fi

    # 计算分类
    if [[ "$dir_part" == "." ]]; then
        categories=""
    else
        categories=$(echo "$dir_part" | tr '/' ',')
    fi

    # 日期
    mod_date=$(stat -c '%y' "$md_file" | cut -d' ' -f1)

    # 读取内容
    content=$(cat "$md_file")

    # 收集该笔记所在目录的图片
    local md_dir
    if [[ "$dir_part" == "." ]]; then
        md_dir="$OBSIDIAN_DIR"
    else
        md_dir="$OBSIDIAN_DIR/$dir_part"
    fi

    # 对该笔记中每个 ![[image.ext]] 引用，找到实际图片并复制到 images/ 并替换引用
    local new_content="$content"
    while [[ "$new_content" =~ !\[\[([^]]+)\]\] ]]; do
        local img_tag="${BASH_REMATCH[0]}"
        local img_name="${BASH_REMATCH[1]}"

        # 尝试在同一目录找图片
        local src_img="$md_dir/$img_name"
        # 也尝试在根目录找
        if [[ ! -f "$src_img" ]]; then
            src_img="$OBSIDIAN_DIR/$img_name"
        fi

        local target_name
        if [[ -f "$src_img" ]]; then
            # 用目录前缀避免冲突
            if [[ "$dir_part" == "." ]]; then
                target_name="$img_name"
            else
                target_name="${dir_part}_${img_name}"
                target_name=$(echo "$target_name" | sed 's|/|_|g')
            fi

            cp "$src_img" "$IMAGES_DIR/$target_name"
            ((count_img++))

            # 替换引用
            local new_tag="![${img_name%%.*}](\/images\/$target_name)"
            new_content="${new_content//$img_tag/$new_tag}"
        else
            echo "  图片未找到: $img_tag (在 $md_file)"
            new_content="${new_content//$img_tag/}"
        fi
    done

    # 构建 frontmatter
    local frontmatter="---"
    frontmatter+="\ntitle: $filename"
    frontmatter+="\ndate: $mod_date"
    if [[ -n "$categories" ]]; then
        IFS=',' read -ra cat_array <<< "$categories"
        frontmatter+="\ncategories:"
        for cat in "${cat_array[@]}"; do
            frontmatter+="\n  - $cat"
        done
    fi
    frontmatter+="\n---"

    # 写入
    local out_path="$POSTS_DIR/$relative_path"
    local out_dir=$(dirname "$out_path")
    mkdir -p "$out_dir"
    echo -e "$frontmatter\n\n$new_content" > "$out_path"
    ((count_md++))
    echo "[$count_md] $relative_path"
}

# 主循环
while IFS= read -r md_file; do
    process_md "$md_file"
done < <(find "$OBSIDIAN_DIR" -name "*.md" -not -path "*/Excalidraw/*" -not -path "*/.git/*" -not -path "*/.obsidian/*")

echo ""
echo "完成！共导入 $count_md 篇文章，$count_img 张图片"
