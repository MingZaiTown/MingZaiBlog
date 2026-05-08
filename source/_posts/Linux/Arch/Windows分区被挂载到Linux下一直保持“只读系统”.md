---
title: Windows分区被挂载到Linux下一直保持“只读系统”
date: 2025-10-31
categories:
  - Linux
  - Arch
---

*一般按照惯常的说法，这种情况是Windows开启了快速启动和休眠，导致Windows关机后给磁盘留有缓存，这时Linux检测到有缓存，就会认为不安全，就会无法写入只读。但是我检查了我的win，都关闭了快速启动和休眠，但还是无法写入。然后找到了一篇相关的博客来问Gemini*

***

您提供的这篇博客文章（[https://www.cnblogs.com/mq0036/p/18118134](https://www.cnblogs.com/mq0036/p/18118134)）中的解决方法对您的情况**具有很高的参考价值**，尤其是针对您当前遇到的**“只读文件系统”**问题。

### 💡 核心参考价值点

该博客提到了两种情况和相应的解决方案，这正是我们目前反复确认的问题：

#### 1. 挂载方式的差异（已确认）

- **博客提到：** 在文件管理器（如 Dolphin）中可以读写，但在命令行或 `/etc/fstab` 中是只读的。
    
- **您的经历：** 完全一致。
    
- **原因：** 文件管理器通常使用 `udisks2` 或 `ntfs-3g`，它会使用特殊的参数（如 `remove_hiberfile`）来自动“修复”或解除 Windows 留下的锁定。而默认的内核 `ntfs` 或简单的 `mount` 命令为了数据安全会拒绝读写。
    

#### 2. 使用 `ntfs-3g` 驱动（最佳实践）

- **博客提到：** 明确使用 **`ntfs-3g`** 作为文件系统类型，而不是仅使用 `ntfs`。
    
- **您的优势：** `ntfs-3g` 是一个稳定且功能完整的用户空间驱动，它支持所有您需要的特殊参数（如 `uid`, `gid`, `dmask`, **`remove_hiberfile`** 等）。
    
- **我们之前的配置问题：** 我们之前使用的是 `ntfs`，这让内核去决定使用哪个驱动（可能是新的 `ntfs3`，它可能不支持某些旧的挂载选项，导致我们移除 `locale`）。
    

### 🎯 最终的、最安全的 `/etc/fstab` 配置方案

既然您已经排除了 Windows 快速启动，且 `chkdsk` 也显示分区干净，但内核仍强制只读，我们现在使用博客中提到的 **`ntfs-3g` 驱动**，并添加最常用的强制读写选项：

#### 步骤一：确保安装了 `ntfs-3g` 包

在 Arch Linux 中，请确保安装了 `ntfs-3g` 软件包（大多数桌面环境默认安装，但最好确认一下）：

Bash

```
sudo pacman -S ntfs-3g
```

#### 步骤一点五：使用`ntfsfix`来清理脏污

``` bash
sudo ntfsfix /dev/nvme1n1p2
```
#### 步骤二：修改 `/etc/fstab`，使用 `ntfs-3g` 和 `remove_hiberfile`

1. 打开 `/etc/fstab` 文件进行编辑：
    
    Bash
    
    ```
    sudo nano /etc/fstab
    ```
    
2. 找到您为 Windows E 盘添加的那一行，并将其**替换**为以下配置：
    （若不知道UUID，可以用lsblk来查看。）![屏幕截图 20251031 221117](/images/img_6b3ddb11e8.png)
    代码段
    
    ```
    # Windows E盘 (Elex) NTFS 永久读写挂载 (UUID: CED42E92D42E7D39)
    UUID=CED42E92D42E7D39 /mnt/win_E_Elex ntfs-3g defaults,uid=1000,gid=1000,dmask=002,fmask=113,remove_hiberfile 0 0
    ```
    
    - **`ntfs-3g`**: 明确指定使用用户空间驱动，而不是内核驱动。
        
    - **`remove_hiberfile`**: **这是关键！** 强制移除可能残留的 Windows 休眠/锁定文件，从而解除“只读”限制。
        
3. **保存并关闭文件。**
    

#### 步骤三：重新挂载并测试

1. **卸载**当前只读挂载：
    
    Bash
    
    ```
    sudo umount /mnt/win_E_Elex
    ```
    
2. **重新加载 systemd 配置：**
    
    Bash
    
    ```
    sudo systemctl daemon-reload
    ```
    
3. **尝试重新挂载：**
    
    Bash
    
    ```
    sudo mount -a
    ```
    
4. **最终写入测试：**
    
    Bash
    
    ```
    touch /mnt/win_E_Elex/Final_Fstab_Success_ntfs3g.txt
    ```
    

**这几乎是解决 NTFS 只读问题的终极方案。** 请尝试这个方案，并告诉我写入测试的结果。