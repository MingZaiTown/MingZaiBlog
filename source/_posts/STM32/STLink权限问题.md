---
title: STLink权限问题
date: 2026-02-01
categories:
  - STM32
---

即试图使用OpenOCD连接STLink时出现报错：
Error: libusb_open() failed with LIBUSB_ERROR_ACCESS

解决：
目录/etc/udev/rules.d/下应该有一个 60-openocd.rules文件。如果没有，从openocd的地址找到这个文件来复制到此目录：
首先找到openocd的这个文件：
❯ pacman -Ql openocd | grep rules  
openocd /usr/lib/udev/rules.d/  
openocd /usr/lib/udev/rules.d/60-openocd.rules
然后复制：❯ sudo cp /usr/lib/udev/rules.d/60-openocd.rules /etc/udev/rules.d/

然后修改这个规则文件：
使用 sed 命令把规则里的 plugdev 全部替换为 uucp（Arch 标准） # 顺便把 660 权限改为 666（更保险，允许所有用户读写） 
sudo sed -i 's/GROUP="plugdev"/GROUP="uucp"/g' /etc/udev/rules.d/60-openocd.rules sudo sed -i 's/MODE="660"/MODE="666"/g' /etc/udev/rules.d/60-openocd.rules

确保你的用户在 uucp 组中
sudo usermod -aG uucp $USER

第三步：重新加载并触发
sudo udevadm control --reload
sudo udevadm trigger

**重新插拔 ST-Link**。

- 输入 `lsusb` 找到 ST-Link 的总线号和设备号（例如：`Bus 001 Device 008`）。

- 查看设备文件权限：

    ```
    # 记得替换成你自己的数字
    ls -l /dev/bus/usb/001/008
    ```
1. **如果看到结果是 `crw-rw-rw-`，那么恭喜你，权限彻底打通了。**