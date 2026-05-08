---
title: fcitx5输入法在KDE中的微信、QQ、Obsidian等应用中无法使用
date: 2025-11-01
categories:
  - Linux
  - Arch
---

***
### 原因：（引用Gemini的话）
>您遇到的 QQ、微信、Obsidian 等应用无法调出输入法的问题是 **Linux 桌面生态中一个非常普遍的兼容性问题**，它的根本原因在于：这些应用都基于 Electron/Chromium 框架，以及现代 Linux 桌面环境（Wayland）与传统输入法机制（XIM）之间的协议差异。

大概就是说KDE使用的Wayland环境与QQ等应用使用的框架不兼容，这些框架使用传统的协议与输入法通信。

***
# 优雅的、强制应用使用wayland框架的解决方案

参考链接🔗： https://forum.archlinuxcn.org/t/topic/13464
（其实archlinux官方的wiki（fcitx5相关）里面描述了这个问题）
.desktop是应用的启动文件，负责描述当应用的可执行文件启动时做什么。一般存在于`/usr/share/applications`目录下，应用更新时就会覆盖。然而可以通过把这儿的文件复制到`~/.local/share/applications`来规避应用更新的覆盖，而且：“`~/.local/share/applications/` 优先于 `/usr/share/applications/`，这称为 **XDG Base Directory Specification** 规范中的配置优先级（优先级：`~/.local/share/applications` > `/usr/local/share/applications` > `/usr/share/applications`）。”
我们的思路就是把相应应用的.desktop 复制到用户目录下，然后修改.desktop文件中的`Exec=`行（这一行描述了当点击应用时执行的命令），通过给这一行增加参数，或者增加一些环境变量来解决。
### 解决方法
```bash
cp /usr/share/applications/app.desktop ~/.local/share/applications/app.desktop
kate ~/.local/share/applications/app.desktop
```

编辑Exec=行：
```
Exec=/usr/bin/obsidian #这是应用原来的地址，不要变 --ozone-platform-hint=auto --enable-wayland-ime %U #这个%U原来也在，保留就行
```
添加的这两个参数将会使应用在打开后的输入法强制使用wayland框架。
对于某些应用，如微信，这样修改后仍然无法调用输入法。这时候可以再加入一个环境变量来解决：
```
Exec=env QT_QPA_PLATFORM=wayland QT_IM_MODULE=fcitx /opt/wechat/wechat --enable-wayland-ime --ozone-platform-hint=auto %U

```
env QT_IM_MODULE=fcitx意思是它的QT（一种框架）的输入法使用fcitx。这是一句环境变量。
***
# 不优雅的、强制使用旧框架的解决方案：

今天折腾了好久，终于是折腾成功了。（当然主要归功于Gemini）
### 解决方法
先说折腾了一天的解决方法：
1. **设置全局变量并重启**：在`/etc/environment` 文件（这是一个*在系统启动和所有用户会话启动时最早被加载的配置文件之一，是设置全局环境变量最推荐的位置*）中写入：
```
XMODIFIERS=@im=fcitx
```
之后重启；
  重启后若无效，则使用局部方法：
2. **修改1. 无效应用的.desktop文件**：一般在`/usr/share/applications`下，比如`qq.desktop`。打开，修改`exec=`行，这一行描述了运行此应用时的行为。这一行默认只会有app的位置，我们保留该位置，在应用位置和=之间加上环境变量：`env GTK_IM_MODULE=fcitx QT_IM_MODULE=fcitx`，然后运行更新数据库：`sudo update-desktop-database`，注销账户后再进入即可。
### 其他说明
解决方法的思路就是给这些应用在运行时加上环境变量。通过我查找资料、问AI，与此相关的环境变量有3个：`GTK_IM_MODULE=fcitx QT_IM_MODULE=fcitx XMODIFIERS=@im=fcitx`，（其实还有一个AI说的`QT_QPA_PLATFORM=xcb`），本来是可以把这三个变量都设置成全局的的，但是fcitx官方wiki只建议设置最后一个为全局变量 https://fcitx-im.org/wiki/Using_Fcitx_5_on_Wayland#KDE_Plasma 。于是我采用这种全局➕局部的方法。

未解决的问题：
本软件（Obsidian）和QQ、vscode等有二次上屏的问题。。。
我草真的完美解决了！