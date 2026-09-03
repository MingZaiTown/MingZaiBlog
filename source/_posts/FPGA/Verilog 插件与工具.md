---
title: Verilog 插件与工具
date: 2026-08-24
categories:
  - FPGA
---

# VS Code 插件
## slang-server: Verilog/SystemVerilog LSP—Hudson River Trading
![](/images/img_45992c52e0.png)
一个Verilog的语言服务器（当然主要支持的是SV)。功能很强大，语法检查、跳转、鼠标悬停、一键重命名等应有尽有，甚至还有非常好用的一键例化，.v文件也终于有图标了。安装插件后会提示你下载slang-server，按照提示一键下载即可。
美中不足的是这个slang-server主要是为SV设计的，对verilog的一些语法检查也是基于SV的，比如在.v文件中也会检查出“logic”这种类型（就是reg）。不过这一点无伤大雅；另外一点较为遗憾的是它的代码补全也是为SV设计的，甚至没有单纯的always块补全，输入alw只会弹出SV的always_comb等。

## Verilog-HDL/SystemVerilog—Masahiro Hiramori
![](/images/img_995d7f7917.png)
除了没有slang LSP支持以外，这是一个完美的工具，也是一个传统的工具，有完备的代码补全、支持ctags、支持formatter、使用linter进行代码检错，也支持一些较为传统的语言服务器。最大的优点是它只是一个前端工具，可以自由选择搭配不同的后端工具，如不同的linter。
因此，在安装了第一个slang-server后还需启用这个插件，虽然在打开VS Code时slang-server会提醒你卸载此插件（可能他们的功能冲突了），但是只需关闭ctags、设置linter为none、关闭语言服务器，只打开formatter来提供代码格式化和verilog的代码补全即可。

## Oxocarbon Theme—Nyoom Engineering
![](/images/img_a25bb18da1.png)
这个主题明确说明支持verilog。并且也比较好看。但是这个主题本身是来自于Nvim的。
## indent-rainbow
![](/images/img_92905098ee.png)
彩色缩进显示，不仅适用于Verilog

# 后端工具

## verible
![](/images/img_23a46467f9.png)
配合Verilog-HDL/SystemVerilog插件提供fomatting功能。
## Maple Mono NF CN
![](/images/img_55d7b0fa70.png)
这是一款非常强大现代的等宽字体，支持连字，并且支持nerd font（图标），即可用于终端显示（这些截图中都是使用的这款字体）。最重要的是，大部分字体解析都会把<=解析为小于等于号≤。要知道这个符号在verilog中是非阻塞赋值，小于等于简直太难受了。而这款字体专门有一个机制，可以通过简单的设置使得<=渲染为漂亮的左箭头：
![](/images/img_d20e38a93a.png)
*如上，通过fontLigatures的calt开启连字功能，cv63变换<=的渲染*
![](/images/img_a9e25e61bc.png)

## iverilog
![](/images/img_ab8b524854.png)
可以理解为一个用于仿真的编译器。十分轻量与快速。它会把.v文件们编译生成一个vvp assembly，一个中间文件。然后在通过iverilog自带的vvp，一个仿真运行引擎来运行这个中间文件进行仿真（可以进入CLI交互界面），但一般在testbench中使用$dumpfile 和 $dumpvars 系统函数，直接用vvp运行中间文件，来生成xxx.vcd波形文件。

## gtkwave
![](/images/img_360ce4375a.png)
简单轻量的波形查看器软件。

## GNU make
不必多说，配合前面的后端工具自动化仿真编译流程