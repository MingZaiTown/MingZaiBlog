---
title: reg != 寄存器
date: 2026-07-07
categories:
  - FPGA
---


综合工具是否生成寄存器（触发器）的唯一标准，只是always块里的敏感列表里有没有posedge clk。而如果写了always @(\*)，里面的reg会被综合成纯组合逻辑即与门或门MUX。
wire只是代表导线的概念，reg也只是代表变量容器的概念。