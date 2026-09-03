---
title: 基于STM32CubeMX生成的基础工程手动移植FreeRTOS
date: 2026-09-04
categories:
  - STM32
  - 基于STM32CubeMX生成的基础工程手动移植FreeRTOS
---

今天成功手动移植了，于是想记录一下。
手动移植的意义在于大概理解FreeRTOS的工程组织和配置，学习Cmake语法，以及遇到一些头疼的问题（来锻炼自己），非要说一个学习以外的意义的话就是可以使用最新版的FreeRTOS吧……实际生产使用时可以用CubeMX生成，即使不想用cmsis的通用接口，用freertos的原生API也是完全没有问题的，也不用担心配置不正确带来的隐患。

移植的FreeRTOS版本是FreeRTOSv202604.01-LTS即v11.3.1
使用STM32F401CDU6
宿主机采用ArchLinux
编译工具链使用GNU 开源工具链，编译器为GCC
调试器为daplink
# 下载FreeRTOS

在官网下载并解压后：
![](/images/img_44959f6e7a.png)
有很多看不懂的东西。不用管，我们需要的只是这个Kernel目录（即wiki中说的source目录）：
![](/images/img_503c2a387c.png)
待命。
# 使用STM32CubeMX生成工程

需要注意，要在SYS中把Timebase Source改成一个不常用的时钟，如TIM11,来解放systick供FreeRTOS使用：![](/images/img_b235ca8ce2.png)
另外开一个C13待会亮灯来验证即可。最后工具链选Cmake创建工程（生成代码）。
# 搬FreeRTOS库到工程

参考官方Wiki的 内核->编码指南->源代码组织 和 内核->支持的设备->FreeRTOS移植指南（这两写的都不是很清楚，对我来说），可以大概知道这个库的文件和组织架构![](/images/img_66c72bd992.png)

## 创建目录

于是我们先照这个样子创建目录。打开刚刚用CubeMX创建的工程的文件夹，创建文件夹FreeRTOS/Source，Source下创建include和portable/(编译器名)/(处理器架构)，对于我，我使用GCC编译，那么编译器名就是GCC、STM32F401属于ARM_CM4F（F表示带FPU），这也是处理器架构名。当然也可以在下载的FreeRTOS中找到portble中看一下，因为前面说过了，那个Kernel就相当于这里的Source目录：![](/images/img_a373616b08.png)
再加上portable下的MemMang来存放内存管理的程序。创建好后的工程目录belike：
![](/images/img_7f634fe4e0.png)
## 复制文件

根据前面的wiki的内容，从下载的FreeRTOS相应位置复制文件到我们的工程的相应位置。首先是Source下的三个重要的.c文件：tasks.c、queue.c、list.c，然后是Source/include里的很多头文件（复制全部.h文件，注意不要复制CMakeList.txt），接着是Source/portable/GCC/ARM_CM4F下的port.c和portmacro.h两个文件，最后是Source/portable/MemMang下的内存管理文件heap_4.c。
此时我们的库已完成，但是没有配置，即FreeRTOSconfig.h。我们可以在下载的FreeRTOS中的FreeRTOS-LTS/FreeRTOS/FreeRTOS-Kernel/examples/template_configuration目录下找到一个最简示例配置，把它直接复制到我们工程下的FreeRTOS下。最终的FreeRTOS文件夹belike：
```zsh
FreeRTOS
├── FreeRTOSConfig.h
└── Source
    ├── include
    │   ├── atomic.h
    │   ├── croutine.h
    │   ├── deprecated_definitions.h
    │   ├── event_groups.h
    │   ├── FreeRTOS.h
    │   ├── list.h
    │   ├── message_buffer.h
    │   ├── mpu_prototypes.h
    │   ├── mpu_syscall_numbers.h
    │   ├── mpu_wrappers.h
    │   ├── newlib-freertos.h
    │   ├── picolibc-freertos.h
    │   ├── portable.h
    │   ├── projdefs.h
    │   ├── queue.h
    │   ├── semphr.h
    │   ├── stack_macros.h
    │   ├── StackMacros.h
    │   ├── stream_buffer.h
    │   ├── task.h
    │   └── timers.h
    ├── list.c
    ├── portable
    │   ├── GCC
    │   │   └── ARM_CM4F
    │   │       ├── port.c
    │   │       └── portmacro.h
    │   └── MemMang
    │       └── heap_4.c
    ├── queue.c
    └── tasks.c

7 directories, 28 files
```
折叠include的截图示意（因为include中的有点多）：
![](/images/img_f0e23caec8.png)
# 完善编译流程

接下来需要新建一个子目录Cmake文件、修改根目录的CMake文件（添加2行）.

仿照CubeMX生成的编译流程和组织方式，我们在 工程目录/cmake 下创建一个freertos目录，其中创建或一个CmakeList.txt文件：
![](/images/img_af8e6c050c.png)写入以下代码
```cmake
cmake_minimum_required(VERSION 3.22)

set(FreeRTOS_Src
    ${CMAKE_CURRENT_SOURCE_DIR}/../../FreeRTOS/Source/tasks.c
    ${CMAKE_CURRENT_SOURCE_DIR}/../../FreeRTOS/Source/queue.c
    ${CMAKE_CURRENT_SOURCE_DIR}/../../FreeRTOS/Source/list.c
    ${CMAKE_CURRENT_SOURCE_DIR}/../../FreeRTOS/Source/portable/GCC/ARM_CM4F/port.c
    ${CMAKE_CURRENT_SOURCE_DIR}/../../FreeRTOS/Source/portable/MemMang/heap_4.c
)

add_library(freertos OBJECT ${FreeRTOS_Src})

target_include_directories(freertos PUBLIC 
    ${CMAKE_CURRENT_SOURCE_DIR}/../../FreeRTOS
    ${CMAKE_CURRENT_SOURCE_DIR}/../../FreeRTOS/Source/include
    ${CMAKE_CURRENT_SOURCE_DIR}/../../FreeRTOS/Source/portable/GCC/ARM_CM4F
)

```
即先定义了一个所有源代码的变量（如果后面要添加FreeRTOS的源代码如timers.c等其他功能，也要记得在这里添加），然后创建一个名为freertos的对象库，最后再包含头文件目录并指定为PUBLIC来让其他的用户代码也可以include。
接下来修改根目录下的CMake文件。先指定子目录，使得子目录cmake能运行以生成.o文件：
![](/images/img_34f07f3738.png)
再到最后的链接库中加上freertos对象库，确保所有.o文件能够链接：
![](/images/img_84821d2795.png)

# 源代码修改
## stm32f4xx_it.c（中断文件）

需要注释此文件中对SVC_Handler、PendSV_Handler、SysTick_Handler三个中断函数的定义，改为port.c中的实现（这个在后面的FreeRTOSConfig.h中）。但是考虑到每次用CubeMX生成代码都会导致这个文件重新生成，使得我们的注释没有了，所以我的办法是使用条件编译，即把#if0 和#endif放在上下方的函数中的指定的用户代码区，巧妙地注释这三个函数。先在UsageFault_Handler中放入#if 0：
```C
void UsageFault_Handler(void) {
  /* USER CODE BEGIN UsageFault_IRQn 0 */
#if 0
  /* USER CODE END UsageFault_IRQn 0 */
  while (1)
  {
    /* USER CODE BEGIN W1_UsageFault_IRQn 0 */
    /* USER CODE END W1_UsageFault_IRQn 0 */
  }
}

```
这样放的话，把while (1)也注释了，后面要记得补回来。再在最后的SysTick_Handler中放入#endif并补上中间被注释掉的其他无辜的函数和while(1)：
```C
/**
  * @brief This function handles System tick timer.
  */
void SysTick_Handler(void)
{
  /* USER CODE BEGIN SysTick_IRQn 0 */

  /* USER CODE END SysTick_IRQn 0 */

  /* USER CODE BEGIN SysTick_IRQn 1 */
#endif
  while (1) {
  }

  /* USER CODE END SysTick_IRQn 1 */
}

```
这样就完美注释了这三个函数，但是注意到还把一个无辜的DebugMon_Handler也注释了。我们可以在前面的USER CODE BEGIN 0---USER CODE END 0 或者后面的USER CODE BEGIN 1---USER CODE END 1中把这个函数的定义补回来：
```C
/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */
void DebugMon_Handler(void) {}

/* USER CODE END 0 */

```
最终整个文件belike：
```C
/* USER CODE BEGIN Header */
/**
 ******************************************************************************
 * @file    stm32f4xx_it.c
 * @brief   Interrupt Service Routines.
 ******************************************************************************
 * @attention
 *
 * Copyright (c) 2026 STMicroelectronics.
 * All rights reserved.
 *
 * This software is licensed under terms that can be found in the LICENSE file
 * in the root directory of this software component.
 * If no LICENSE file comes with this software, it is provided AS-IS.
 *
 ******************************************************************************
 */
/* USER CODE END Header */

/* Includes ------------------------------------------------------------------*/
#include "stm32f4xx_it.h"
#include "main.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN TD */

/* USER CODE END TD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */

/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/
/* USER CODE BEGIN PV */

/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
/* USER CODE BEGIN PFP */

/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */
void DebugMon_Handler(void) {}

/* USER CODE END 0 */

/* External variables --------------------------------------------------------*/
extern TIM_HandleTypeDef htim11;

/* USER CODE BEGIN EV */

/* USER CODE END EV */

/******************************************************************************/
/*           Cortex-M4 Processor Interruption and Exception Handlers          */
/******************************************************************************/
/**
 * @brief This function handles Non maskable interrupt.
 */
void NMI_Handler(void) {
  /* USER CODE BEGIN NonMaskableInt_IRQn 0 */

  /* USER CODE END NonMaskableInt_IRQn 0 */
  /* USER CODE BEGIN NonMaskableInt_IRQn 1 */
  while (1) {
  }
  /* USER CODE END NonMaskableInt_IRQn 1 */
}

/**
 * @brief This function handles Hard fault interrupt.
 */
void HardFault_Handler(void) {
  /* USER CODE BEGIN HardFault_IRQn 0 */

  /* USER CODE END HardFault_IRQn 0 */
  while (1) {
    /* USER CODE BEGIN W1_HardFault_IRQn 0 */
    /* USER CODE END W1_HardFault_IRQn 0 */
  }
}

/**
 * @brief This function handles Memory management fault.
 */
void MemManage_Handler(void) {
  /* USER CODE BEGIN MemoryManagement_IRQn 0 */

  /* USER CODE END MemoryManagement_IRQn 0 */
  while (1) {
    /* USER CODE BEGIN W1_MemoryManagement_IRQn 0 */
    /* USER CODE END W1_MemoryManagement_IRQn 0 */
  }
}

/**
 * @brief This function handles Pre-fetch fault, memory access fault.
 */
void BusFault_Handler(void) {
  /* USER CODE BEGIN BusFault_IRQn 0 */

  /* USER CODE END BusFault_IRQn 0 */
  while (1) {
    /* USER CODE BEGIN W1_BusFault_IRQn 0 */
    /* USER CODE END W1_BusFault_IRQn 0 */
  }
}

/**
 * @brief This function handles Undefined instruction or illegal state.
 */
void UsageFault_Handler(void) {
  /* USER CODE BEGIN UsageFault_IRQn 0 */
#if 0
  /* USER CODE END UsageFault_IRQn 0 */
  while (1)
  {
    /* USER CODE BEGIN W1_UsageFault_IRQn 0 */
    /* USER CODE END W1_UsageFault_IRQn 0 */
  }
}

/**
  * @brief This function handles System service call via SWI instruction.
  */
void SVC_Handler(void)
{
  /* USER CODE BEGIN SVCall_IRQn 0 */

  /* USER CODE END SVCall_IRQn 0 */
  /* USER CODE BEGIN SVCall_IRQn 1 */

  /* USER CODE END SVCall_IRQn 1 */
}

/**
  * @brief This function handles Debug monitor.
  */
void DebugMon_Handler(void)
{
  /* USER CODE BEGIN DebugMonitor_IRQn 0 */

  /* USER CODE END DebugMonitor_IRQn 0 */
  /* USER CODE BEGIN DebugMonitor_IRQn 1 */

  /* USER CODE END DebugMonitor_IRQn 1 */
}

/**
  * @brief This function handles Pendable request for system service.
  */
void PendSV_Handler(void)
{
  /* USER CODE BEGIN PendSV_IRQn 0 */

  /* USER CODE END PendSV_IRQn 0 */
  /* USER CODE BEGIN PendSV_IRQn 1 */

  /* USER CODE END PendSV_IRQn 1 */
}

/**
  * @brief This function handles System tick timer.
  */
void SysTick_Handler(void)
{
  /* USER CODE BEGIN SysTick_IRQn 0 */

  /* USER CODE END SysTick_IRQn 0 */

  /* USER CODE BEGIN SysTick_IRQn 1 */
#endif
  while (1) {
  }

  /* USER CODE END SysTick_IRQn 1 */
}

/******************************************************************************/
/* STM32F4xx Peripheral Interrupt Handlers                                    */
/* Add here the Interrupt Handlers for the used peripherals.                  */
/* For the available peripheral interrupt handler names,                      */
/* please refer to the startup file (startup_stm32f4xx.s).                    */
/******************************************************************************/

/**
 * @brief This function handles TIM1 trigger and commutation interrupts and
 * TIM11 global interrupt.
 */
void TIM1_TRG_COM_TIM11_IRQHandler(void) {
  /* USER CODE BEGIN TIM1_TRG_COM_TIM11_IRQn 0 */

  /* USER CODE END TIM1_TRG_COM_TIM11_IRQn 0 */
  HAL_TIM_IRQHandler(&htim11);
  /* USER CODE BEGIN TIM1_TRG_COM_TIM11_IRQn 1 */

  /* USER CODE END TIM1_TRG_COM_TIM11_IRQn 1 */
}

/* USER CODE BEGIN 1 */

/* USER CODE END 1 */

```

完美解决了注释的问题。
## FreeRTOSConfig.h

### 重命名
重命名三个函数（在这个.h文件的任意位置处添加）：
```C
#define vPortSVCHandler    SVC_Handler
#define xPortPendSVHandler PendSV_Handler
#define xPortSysTickHandler SysTick_Handler
```

### 参数配置
改CPU频率宏：（SystemCoreClock在Core/Src/system_stm32f4xx.c中定义）
```C
// #define configCPU_CLOCK_HZ    ( ( unsigned long ) 20000000 )
extern uint32_t SystemCoreClock;
#define configCPU_CLOCK_HZ    SystemCoreClock

```

改嘀嗒频率：1000就是1ms触发一次Tick即嘀嗒中断.
```C
/* configTICK_RATE_HZ sets frequency of the tick interrupt in Hz, normally
 * calculated from the configCPU_CLOCK_HZ value. */
#define configTICK_RATE_HZ                         1000

```

取消检查栈溢出（并不推荐取消，此处取消以最小可运行为原则，因为不取消就必须要实现一个栈溢出的钩子函数）
```C
#define configCHECK_FOR_STACK_OVERFLOW 0
```

关闭软件定时器
```C
#define configUSE_TIMERS 0
```

修改临界区中断阈值优先级（目前直接写为80的写法也不标准。可以自行向AI询问更标准通用的写法以及此宏的作用）和内核中断阈值优先级（这个直接设置为240也是不标准的）
```C
#define configMAX_SYSCALL_INTERRUPT_PRIORITY 80



#define configKERNEL_INTERRUPT_PRIORITY 240

```

设置最低优先级为15
```C
#define configMAX_PRIORITIES 15

```

以上参数配置很粗糙。建议详细阅读注释，或者对比STM32CubeMX自动生成的Config.h来得知怎么填。
# 示例用户代码

直接在main.c中创建一个LED灯闪烁的任务并开启调度器。相关代码如下：
先在前面引用`FreeRTOS.h`和`tasks.h`，接着创建任务函数：
```C
static void test_task(void *pvParameters) {
  for (;;) {
    HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
    vTaskDelay(100);
  }
}
```
接着在主函数的循环之前的CODE2中创建任务并开启调度器：
```C
  /* USER CODE BEGIN 2 */
  BaseType_t ret;
  ret = xTaskCreate(test_task, "test task", 128, NULL, 3, NULL);
  if (ret != pdPASS) {
    while (1)
      ;
  }
  vTaskStartScheduler();
  /* USER CODE END 2 */

```

# 烧录与调试配置

我使用VSCode的Cortex Debug插件来烧录与调试，这要求在工程目录下的.vscode目录下创建launch.json并写入有关配置，具体可看[工具链](工具链.md)。

接下来就可以编译并下板测试了！

# 补充

## 优先级阈值的标准写法
```C
   #define configPRIO_BITS        __NVIC_PRIO_BITS          /* =4 */                                                                                  
   #define configLIBRARY_LOWEST_INTERRUPT_PRIORITY   15                                                                                               
   #define configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY 5                                                                                             
   #define configKERNEL_INTERRUPT_PRIORITY \                                                                                                          
       ( configLIBRARY_LOWEST_INTERRUPT_PRIORITY << (8 - configPRIO_BITS) )      /* 240 */                                                            
   #define configMAX_SYSCALL_INTERRUPT_PRIORITY \                                                                                                     
       ( configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY << (8 - configPRIO_BITS) ) /* 80 */                                                             
 
```

## 为什么必须用#define 给三个函数起别名，而不是把port.c中的函数包含到it.c中的三个函数中？

这种好像叫间接路由，就是因为这个问题卡了很久，虽然好像FreeRTOS确实支持间接路由，但是还是会进Hardfault。AI给出的看不懂的解释：
 - Cortex-M 上，FreeRTOS 的 xPortPendSVHandler/vPortSVCHandler 是 naked 裸函数，其正确性依赖异常入口时 r14 就是 EXC_RETURN(0xFFFFFFFD)：tst r14,#0x10 用来判断 FPU 惰性压栈帧是否存在，结尾 bx r14 用 EXC_RETURN 完成异常返回。                                                                       
 - 若用 C 包装函数间接调用，bl 把 r14 换成了"包装函数内部的返回地址"，FPU 帧判断和异常返回语义全错 → 上下文切换时 HardFault。C 包装只有在编译器恰好把 
   返回地址的 bit4 置 1 等巧合下才"看起来能跑"，极易碎。                                                                                              
 - 因此必须让向量表直接指向裸函数（宏改名），或在 FreeRTOSConfig.h 把 configCHECK_HANDLER_INSTALLATION 置 1 让内核启动时自检（V11 的 port.c 会校验向  
   量表 SVC/PendSV 是否直指 vPortSVCHandler/xPortPendSVHandler）。你上一版崩的工程恰好把它设成了 0，等于关掉了这个自检。

## 不再使用configKERNEL_INTERRUPT_PRIORITY
 
 V11.3.1 的 ARM_CM4F port 已不再使用 configKERNEL_INTERRUPT_PRIORITY（它把 PendSV/SysTick 固定写成 255 即最低优先级，见 port.c 的       
 portMIN_INTERRUPT_PRIORITY (255UL)），所以 240 只是"文档性"的；真正影响临界区屏蔽的是 configMAX_SYSCALL_INTERRUPT_PRIORITY（80 = 优先级 5）。        
\_\_NVIC_PRIO_BITS 由 stm32f4xx.h 提供，configPRIO_BITS 用于与硬件自检断言一致。 
