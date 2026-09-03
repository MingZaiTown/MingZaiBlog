---
title: Windows更新导致Grub损坏修复过程
date: 2026-07-02
categories:
  - Linux
  - Arch
---

# 制作Arch Linux Live USB
从Arch 官网列出的镜像源地址下载最新版本的Arch Linux镜像。使用Ventory或balena Etcher烧录。

# BIOS设置
对于我的宏碁掠夺者，开机按F2是打开BIOS。打开BIOS之后要关闭安全启动，即Secure Boot。
由于我的电脑支持开机时手动选择启动环境，因此可以不在BIOS的启动环境设置里特意把USB环境调到最前面。如果电脑不支持开机手动选择启动环境或者不想用这个操作，也可以设置。

# 从U盘启动Live环境
设置完BIOS后重启，对于宏碁掠夺者，开机时按F12进入环境菜单。选择USB启动。
启动后会首先进入Live环境的一个选单，一般选择第一个`Arch Linux install medium (x86_64, UEFI)`启动。（此时会有电脑蜂鸣器倒计时声。不要慌）启动后会显示`root@archiso ~ #`开头的命令行环境。此环境即为U盘内部的小Linux环境即Live环境。

# 联网
第一件事是联网。
1. 宽带使用`sudo dhcpcd`或`sudo pppoe-setup`来联网（前者dhcp，后者拨号。我是后者）；
2. Wi-Fi：`iwctl`进入交互模式、`device list`查找无线网卡名(如wlan0)、 `station wlan0 scan`使用网卡扫描Wi-Fi（这只是扫描了，还要配合下个命令列出Wi-Fi）、  `station wlan0 get-networks`列出搜到的Wi-Fi列表、  `station wlan0 connect 你的WiFi名字`连接、 `exit`退出；
3. 通过手机USB共享网络
# Live环境磁盘操作
下一个任务是进入我们的系统。为了做到这个，我们要将我们的Linux系统的磁盘挂载到Live的/mnt下。因此我们首先要找到我们的Linux 系统的磁盘。使用`lsblk -f`命令（可以看到磁盘名标签）和`lsblk`（可以看磁盘大小）。通过这两个命令可以看到我们的磁盘分区情况。我们需要找到两个分区，对的，除了系统（即“根分区”，一般类型为类型 btrfs）还要找到Linux系统的“EFI分区”（一般类型为类型 vfat）。比如，我的系统的这两个分区为：
* Arch EFI 分区：nvme1n1p3
* Arch 根分区：nvme1n1p4

然后先挂载根分区：`sudo mount -o subvol=@ /dev/nvme1n1p4 /mnt`这里使用`subvol=@`表示挂载Btrfs的默认子卷。

挂载EFI分区：`sudo mount /dev/nvme1n1p3 /mnt/boot`（*如果Live系统上的/mnt/boot目录不存在，则先创建sudo mkdir -p /mnt/boot）*

然后挂载虚拟文件系统：
```bash
sudo mount -o bind /dev /mnt/dev
sudo mount -o bind /run /mnt/run
sudo mount -o bind /tmp /mnt/tmp
```
*同样地，这里也有可能显示/mnt下没有这些目录。我们可以执行以下来创建：*
```zsh
sudo mkdir -p /mnt/proc /mnt/sys /mnt/run /mnt/dev /mnt/tmp
sudo mount -t proc proc /mnt/proc
sudo mount -t sysfs sys /mnt/sys
```

接下来就可以chroot进入我们的arch系统了：`sudo chroot /mnt /bin/zsh`（也可用bash，如果没有用zsh）

# chroot进Arch之后的操作
先挂载 efivarfs（否则 GRUB 安装报错）：
```zsh
mount -t efivarfs efivarfs /sys/firmware/efi/efivars
```
然后重装grub：
```zsh
grub-install --target=x86_64-efi --efi-directory=/boot --bootloader-id="Arch Linux"
```
安装成功显示Installation finished. No error reported.

安装 os-prober 并生成配置：
```zsh
pacman -S os-prober --noconfirm
grub-mkconfig -o /boot/grub/grub.cfg
```

成功后`exit`退出chroot的Arch，进入Live，然后`sudo umount -R /mnt`解除挂载。然后`reboot`重启。
>*grub-mkconfig会在运行时自动调用os-prober探测器，探测除了当前系统以外的其他系统（即Windows）。但是较新版本Grub禁用了os-prober，这需要在/etc/default/grub中解除`GRUB_DISABLE_OS_PROBER=false`的注释来开启*
>
>*/etc/default/grub 是 “用户配置文件”，给你编辑的，简洁易懂。*
  */boot/grub/grub.cfg 是 “最终生成的菜单文件”，给 GRUB 启动时读取的，复杂且自动生成。有点像前者是源代码，后者是编译产物，grub-mkconfig就是在编译。因此当需要修改Grub的默认选项、菜单等待时间等配置时，应该先改前者，然后运行grub-mkconfig编译。*


# 进BIOS调整启动环境顺序
按F2进BIOS，进入Boot设置，找到Grub项（也有可能是完全不显示任何名字的那一项）调到第一个，保存并退出即可。