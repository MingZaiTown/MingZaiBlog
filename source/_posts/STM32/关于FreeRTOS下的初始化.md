---
title: 关于FreeRTOS下的初始化
date: 2026-02-03
categories:
  - STM32
---

在移植LVGL时一直遇到HardFault问题，无论把内存改到多大仍然没有用。。。结果是初始化工程的问题。

*我靠，我好像找到解决办法了，但是我仍然不是很知道这是什么原因，但是直觉告诉我就是这个问题。我的这个.c任务文件是：*
*#include "app_resources.h"//*
*#include "main.h"//*
*#include "MingLog.h"//*
*#include "lvgl.h" /定义 LV_LVGL_H_INCLUDE_SIMPLE 可直接使用 "lvgl.h"/*
*#include "ST7735S.h"//*
*#include "projdefs.h"*

*#define TFT_HOR_RES 160*
*#define TFT_VER_RES 128*

*static void my_flush_cb(lv_display_t * disp, const lv_area_t * area, uint8_t * px_map)*
*{*
  *ST7735_Display_Area((uint16_t)area->x1, (uint16_t)area->x2, (uint16_t)area->y1, (uint16_t)area->y2, px_map);*
*}*

*static void LCD_Task_Entry(void pvParameters)*
*{*
  *Ming_print_dynamic("进行到%s,%d\n", _func_, _LINE_);*

  *for (;;) {*
    *Ming_print_dynamic("进行到%s,%d\n", __func__, __LINE__);*

    *lv_timer_handler();*
    *vTaskDelay(pdMS_TO_TICKS(5));*
  *}*
*}*

*static uint8_t buf[TFT_HOR_RES * TFT_VER_RES / 10 * 2];*

*void Start_LCD_Task(void)*
*{*
  *ST7735S_Init();*

    */*初始化 LVGL*/*
    *lv_init();*

    */*设置毫秒级时钟回调，用于 LVGL 计时*/*
    *lv_tick_set_cb(xTaskGetTickCount);*

    */*创建显示对象，用于添加屏幕和控件*/*
    *lv_display_t * display = lv_display_create(TFT_HOR_RES, TFT_VER_RES);*

    */*添加渲染缓冲，这里假设使用 16 位 RGB565 格式*/*
    *lv_display_set_buffers(display, buf, NULL, sizeof(buf), LV_DISPLAY_RENDER_MODE_PARTIAL);*

    */*设置刷新回调，将缓冲内容写入显示设备*/*
    *lv_display_set_flush_cb(display, my_flush_cb);*

    */*驱动已就绪，创建 UI*/*
    *lv_obj_t * label = lv_label_create(lv_screen_active());*
    *lv_label_set_text(label, "Hello world");*
    *lv_obj_center(label);*

      *Ming_print_dynamic("进行到%s,%d\n", __func__, __LINE__);*

  *xTaskCreate(LCD_Task_Entry,* 
    *"LCD_Task",* 
    *1024,* 
    *NULL,* 
    *1,* 
  *NULL);*

  *Ming_print_dynamic("进行到%s,%d\n", __func__, __LINE__);*
*}*
*有两个函数，一个是start初始化创建函数（外部可见，用于创建任务），另一个是任务的入口函数，是内部函数，也就是任务的本体。我的习惯就是在另一个app_main.c中的默认任务中调用所有的创建函数来创建任务：*
*#include "app_tasks.h"//*
*#include "app_resources.h"//*

*void StartDefaultTask(void argument)*
*{*
  *Resources_Init();*

  *// Start_Key_Task();*
  *// Start_LED_Task();*
  *// Start_SX1280_Task();*
  *Start_Log_Task();*
  *// Start_Joystick_Task();*
  *Start_LCD_Task();*
  
  *vTaskDelete(NULL);*
*}*
*因此自然而然地，我就会把Start_LCD_Task等等一系列start函数当作和这个任务相关的“所有初始化”函数。因此，我会把所有初始化写在这个Start函数里，而且一般都写在xTaskCreate函数之前。之前的任务都是这样写的，但是好像都没有报错，但是现在想来，尤其是这个lvgl任务，任务都没有创建就进行了大规模初始化（或者是其他原因？）总是就是说start函数“仅仅”只是freertos的start，是任务创建的start，不能用于初始化硬件（可能可以？）和任务相关的变量，这些初始化应该放到任务入口函数即任务内部的for(;;)之前！我按这个想法修改以后就好了。但是我可能对错误的地方描述的不是很准确。。*


你的直觉非常准确！这确实是嵌入式开发，尤其是 **RTOS（实时操作系统）+ 复杂库（如 LVGL）** 结合时最容易踩到的“时序陷阱”。

你之所以把初始化挪到任务函数（`LCD_Task_Entry`）内部就解决了 `HardFault`，核心原因有以下三点：

### 1. 任务栈（Stack） vs. 系统栈（MSP）

这是最根本的原因。

- **在 `Start_LCD_Task` 中初始化**：此时代码运行在“父任务”（默认任务）的环境下。如果你在 `Start_LCD_Task` 里面定义了较大的局部变量，或者 `lv_init` 触发了深层嵌套的函数调用，它使用的是**默认任务的栈空间**。如果默认任务的栈不够大，在 `xTaskCreate` 之前系统就已经因为**栈溢出**踩坏了内存。
    
- **在任务函数内部初始化**：代码运行在 `LCD_Task` 自己的环境下。此时它使用的是你分配的那 **1024/2048 Words** 独立空间。由于你为这个任务专门预留了足够的栈，初始化过程中的大量内存操作就变得安全了。
    

### 2. LVGL 的“全局假设”与并发冲突

LVGL 是一个有状态的库。

- 当你在 `StartDefaultTask` 中调用 `Start_LCD_Task` 时，CPU 还在忙着跑初始化代码。
    
- 但由于 FreeRTOS 是抢占式的，万一在 `lv_init` 运行到一半时，系统发生了一次任务切换，或者其他任务（如 `Log_Task`）干扰了内存布局，就会导致未初始化完成的指针被访问，从而触发 `0xfffffffe` 这种非法跳转。
    
- **将初始化放入任务内部**，确保了“配置”与“执行（`lv_timer_handler`）”在同一个逻辑流中，符合**线性初始化**的原则。
    

### 3. 硬件初始化时机（关键）

对于 LCD 驱动（ST7735S），初始化往往涉及延迟（`HAL_Delay`）和 SPI 操作。

- 在任务创建之前调用 `HAL_Delay` 有时会产生问题，因为 `HAL_Delay` 依赖于 `SysTick` 中断，而 FreeRTOS 接管 `SysTick` 后，其优先级和行为会发生变化。
    
- **在任务内部初始化**，意味着所有的硬件操作都发生在 RTOS 调度器（Scheduler）完全接管系统之后，此时系统的中断环境、时钟环境是最稳定的。
    

---

### 💡 为什么之前的任务没报错？

那是因为 `Key_Task` 或 `LED_Task` 太简单了。它们可能只是初始化一两个 GPIO，占用的栈空间极小（几十个字节）。

而 **LVGL 是个巨无霸**。它在初始化时会：

1. 分配内存池。
    
2. 注册数百个样式属性。
    
3. 构建默认主题。
    
4. 递归计算屏幕坐标。
    
    这些操作对栈的需求是**指数级增长**的。
    

---

### 现在的正确结构示例（验证你的想法）：

C

```
static void LCD_Task_Entry(void *pvParameters)
{
    /* --- 1. 任务相关的初始化全部放在这里 --- */
    ST7735S_Init();
    lv_init();
    lv_tick_set_cb(xTaskGetTickCount);
    
    lv_display_t * display = lv_display_create(160, 128);
    lv_display_set_buffers(display, buf, NULL, sizeof(buf), LV_DISPLAY_RENDER_MODE_PARTIAL);
    lv_display_set_flush_cb(display, my_flush_cb);

    /* 创建简单的 UI */
    lv_obj_t * label = lv_label_create(lv_screen_active());
    lv_label_set_text(label, "Hello world");
    lv_obj_center(label);

    /* --- 2. 进入循环 --- */
    for (;;) {
        lv_timer_handler();
        vTaskDelay(pdMS_TO_TICKS(5));
    }
}

void Start_LCD_Task(void)
{
    /* 这个函数只负责“下令”创建任务，不干重活 */
    xTaskCreate(LCD_Task_Entry, "LCD_Task", 2048, NULL, 1, NULL);
}
```

### 总结

你的经验总结非常到位：**`Start` 函数仅用于任务的“启动/创建”，而任务相关的“业务初始化”应尽量闭环在任务函数内部。** 这不仅解决了内存冲突，还让代码的耦合度更低。

**既然现在 UI 能跑起来了，需要我帮你看看如何利用 DMA 彻底消除 `lv_timer_handler` 造成的刷新卡顿吗？**