---
title: 四轴无人机：标准的内外环PID
date: 2026-01-24
categories:
  - STM32
---


## 1. 外环（角度环）不需要 $D$ 和 $I$

在串级 PID 架构中，外环（角度环）通常**只使用 P 控制**。

- **为什么不需要 $D$？**
    
    外环的输出是“期望角速度”。角度的微分就是角速度，而你的内环（角速度环）本身就在控制角速度。如果在两层环路都加 $D$，会产生严重的相位叠加干扰，导致系统极度不稳定。
    
- **为什么不需要 $I$？**
    
    外环的任务是把“角度误差”转换成“角速度指令”。静态误差通常是由内环去消除的。绝大多数主流飞控（Betaflight, PX4）的角度环都只有一个 $Kp$。
    
- **推论**：外环公式通常简化为：`Target_Gyro = (Target_Angle - Current_Angle) * Outer_Kp;`

## 2. 显式输入时间单位

在D项和I项的计算中，最好是要显示地输入时间单位dt。当循环时间不一定时，能够更精准地计算。

## 3. D项：约等于直接的反馈值的微分而非误差微分

虽然看似PID的自变量是“误差”，即P项是Kp乘误差，I是Ki乘误差的积分，那么D也应该是Ki乘以误差的导数。但是：
展开来看：

$$D = \frac{(tarVel_{now} - crtVel_{now}) - (tarAng_{last} - crtVel_{last})}{dt}$$

**场景模拟：**

假设无人机正在平稳悬停，$crtVel$ 是 $0$，遥控器摇杆也是 $0$，所以误差是 $0$。

突然，你猛地把摇杆推到底，希望无人机以 $100^\circ/s$ 翻转。

- 这一瞬间，$tarVel$ 从 $0$ 变到了 $100$。
    
- 在这一微秒内，`Error` 瞬间从 $0$ 变成了 $100$。
    
- 你的 $D$ 项会计算出一个巨大的值：$100 / 0.001 = 100,000$！
    

**后果：** 你的电机 PWM 会瞬间跳变到极限，飞机发出一声尖锐的啸叫，甚至结构受损。这就是所谓的**“微分冲击”（Derivative Kick）**。

**解决方案：**

因为我们不希望 D 项对“目标值的改变”做出反应，只希望它对“飞机的剧烈抖动（反馈值改变）”做出反应。

既然 $Error = Target - Current$，而微分具有线性性质，那么：

$$\frac{d(Error)}{dt} = \frac{d(Target)}{dt} - \frac{d(Current)}{dt}$$

在绝大多数时间里，我们的目标值 $Target$ 是阶跃变化的（或者干脆不变），所以 $\frac{d(Target)}{dt}$ 通常为 $0$。

于是：**误差的微分 $\approx$ 负的反馈值的微分**。

**结论：** 使用 `- (crtVel - lastVel) / dt`，当目标值突变时，D 项不会产生爆炸级的输出，只有当飞机被风吹动或者自己转动时，D 项才起到平滑稳定的作用。

D还可以加一个IIR滤波器来平滑数据。最后的代码be like：
```C
typedef struct{

float Kp, Ki, Kd, Kp_Outer;

float Alpha;

float Integral[3];

float Last_Vel[3];

float P[3], I[3], D[3];

float Integral_Max;

}PID_Controller_TypeDef;

#include "PID.h"

  

#define roll 0

#define pitch 1

#define yaw 2

  

void PID_ComputeOuter(PID_Controller_TypeDef *ctrl, float *crtAng, float *tarAng, float *output)

{

output[roll] = ctrl->Kp_Outer * (tarAng[roll] - crtAng[roll]);

output[pitch] = ctrl->Kp_Outer * (tarAng[pitch] - crtAng[pitch]);

output[yaw] = ctrl->Kp_Outer * (tarAng[yaw] - crtAng[yaw]);

}

  

static inline void PID_ComputeInner_SingleAxis(PID_Controller_TypeDef *ctrl, uint8_t axis,

float crtVel, float tarVel, float *output, float dt)

{

float Current_Error;

  

Current_Error = tarVel - crtVel;

ctrl->P[axis] = ctrl->Kp * Current_Error;

  

ctrl->Integral[axis] += Current_Error * dt;

if (ctrl->Integral[axis] > ctrl->Integral_Max) ctrl->Integral[axis] = ctrl->Integral_Max;

else if (ctrl->Integral[axis] < -ctrl->Integral_Max) ctrl->Integral[axis] = -ctrl->Integral_Max;

ctrl->I[axis] = ctrl->Ki * ctrl->Integral[axis];

//D还有低通滤波

ctrl->D[axis] = ctrl->Alpha * (-ctrl->Kd * (crtVel - ctrl->Last_Vel[axis]) / dt) + (1.0f - ctrl->Alpha) * ctrl->D[axis];

ctrl->Last_Vel[axis] = crtVel;

  

*output = ctrl->P[axis] + ctrl->I[axis] + ctrl->D[axis];

}

  

void PID_ComputeInner(PID_Controller_TypeDef *ctrl, float *crtVel, float *tarVel, float *output, float dt)

{

PID_ComputeInner_SingleAxis(ctrl, roll, crtVel[roll], tarVel[roll], &output[roll], dt);

PID_ComputeInner_SingleAxis(ctrl, pitch, crtVel[pitch], tarVel[pitch], &output[pitch], dt);

// PID_ComputeInner_SingleAxis(ctrl, yaw, crtVel[yaw], tarVel[yaw], &output[yaw], dt);

}
```

## 4.Yaw轴参数独立
yaw和roll、pitch的力学结构完全不同（没有重力），因此PID的参数也不同。这里选择直接无视Yaw轴