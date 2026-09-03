---
title: 嵌入式Linux基础学习笔记
date: 2026-09-01
categories:
  - Linux
---

# Chap4 Linux内核

这一章主要讲了Linux内核源码的结构。首先下载，可以从www.kernel.org下载内核的源码。然后在源码顶层目录，可使用make 配合一些构建目标来完成配置。如make help获取帮助，make gconfig来进行图形化配置。配置的内容会写入顶层的.config文件中。另外，每个子目录下都有Kconfig文件，这个相当于是给make gconfig等等配置提供配置的选项的文件。

make 编译的最终产物是vmlinux，一个ELF格式的二进制镜像。但是这个文件很大，包含了很多调试信息，所以一般到机器里真正运行的不是这个，而是使用这个vmlinux压缩后的zImage文件。vmlinux只是在运行的时候系统出问题崩溃时，可以用vmlinux来找问题。

这章说了很多有关.../arch/arm/mach-xxx的内容。arch表示架构，然后arm下的mach-xxx（machine）表示具体的芯片类型。这些目录里的文件和具体的SoC有关。但是这个其实是过时了，现在好像使用设备树来替代这些具体的配置，比如.../arch/arm64下就没有mach-xxx的目录了。