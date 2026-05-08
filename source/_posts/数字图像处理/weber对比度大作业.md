---
title: weber对比度大作业
date: 2025-11-16
categories:
  - 数字图像处理
---

## $C_w$取值范围分析
$$\begin{align}
C_w &=\frac{I-I_s}{I_s} \\
&=\frac{I}{I_s} - 1.
\end{align}$$
设灰度最大值为$g_{max}$，那么$I$和$I_{s}$的范围都是$[0,g_{max}]$，因此$\frac{I}{I_{s}}$的范围为$[0,+\infty]$，那么$C_{w}$的范围为$[-1,+\infty]$。$C_{w}=0$表明$I=I_{s}$，即当前点和它周围的像素的某种均值完全一致；以$C_{w}=0$为界限，$C_{w}$小于$0$则表明当前点相比周围点的平均程度更暗；反之，$C_{w}$大于$0$则表示当前点比周围点更加亮。
## ~~$C_{w}$线性归一化可视化~~ 可视化（归一化）
$$
C_{wview}=\frac{C_{w}}{C_{wmax}-C_{wmin}}\times g_{max}
$$
~~采用8位灰度时，$g_{max}$等于255。~~
以上线性归一化有误，因为有负值，所以上面这个公式永远不可能达到极值。因此直接把$C_{w}$线性放大然后叠加灰度加钳位的方法：
$$
C_{wview}=\max\{0,~\min\{255,~A\cdot C_{w}+\frac{g_{max}}{2}\}\}
$$

***

11/16今天突然意识到这个作业的所有滤波操作甚至卷积都是要自己手动实现的。。。所以现在开始先写卷积函数

## 高斯窗（高斯滤波器的生成）
由标准二维正态分布的函数表达式：
$$
f(x,y)=\frac{1}{2\pi \sigma^2}\exp \left[ -\frac{1}{2}\left( \frac{ {x^2+y^2} }{\sigma^2} \right) \right]
$$
平移到窗中心后，即得表达式。记窗的边长为$filterLength$，则需要平移的距离其实就是$filterLength$除以$2$向下取整，记为$d_{move}= \lfloor \frac{filterLength}{2} \rfloor$。所以高斯窗就是
$$
g(x,y)=f(x-d_{move},y-d_{move})=\frac{1}{2\pi \sigma^2}\exp \left[ -\frac{1}{2}\left( \frac{ {(x-d_{move})^2+(y-d_{move})^2} }{\sigma^2} \right) \right]
$$
AI说我自己写的卷积的时间复杂度是$$\text{复杂度} \approx O(\text{图像像素数} \times \text{卷积核像素数})$$
计算351窗宽时的计算量为3.6 亿亿次。
经过测试，自己写的卷积在计算窗宽351就算不动了，因此有些时候采用matlab的卷积函数conv2。

## 要求1：*编程实现提取图像的Weber对比度，并设计对比度的可视化方法显示该对比度。显示手段视觉愉悦度越高越好。可以考虑在rgb分别计算后合成三通道显示，也可以在某个颜色空间仅操作强度通道。*

提取方法已经在前面探讨过了，现在来探讨用什么方法来可视化显示更好。

***

我的代码们：
```Matlab
% myConv.m

function convResult = myConv(img, kernal)

%MYCONV 此处显示有关此函数的摘要

% 此处显示详细说明

kernalSize = size(kernal);

imgSize = size(img);

if length(imgSize) == 3

if imgSize(3) == 3

convResultr = myConv(img(:,:,1),kernal);

convResultg = myConv(img(:,:,2),kernal);

convResultb = myConv(img(:,:,3),kernal);

convResult(:,:,1) = convResultr;

convResult(:,:,2) = convResultg;

convResult(:,:,3) = convResultb;

return;

else

error('输入的图像的格式错误')

end

elseif length(imgSize) ~= 2

error('输入的图像的格式错误')

end

if length(kernalSize) ~= 2

error('卷积核必须是一个二维数组')

elseif kernalSize(1) ~= kernalSize(2)

error('卷积核的长和宽不相等')

elseif mod(kernalSize(1), 2) ~= 1

error('卷积核的边长不是奇数')

end

imgHeight = imgSize(1);

imgWidth = imgSize(2);

kernalLength = kernalSize(1);

% 扩展

padLength = idivide(kernalLength, uint32(2));

imgPad = zeros([imgHeight+2*padLength imgWidth+2*padLength], "double");

imgDouble = double(img);

imgPad(padLength+1:end-padLength, padLength+1:end-padLength) = imgDouble;

% 卷积

convResult = zeros([imgSize(1),imgSize(2)], "double");

for imgHeightIndex = 1:imgHeight

for imgWidthIndex = 1:imgWidth

convResult(imgHeightIndex,imgWidthIndex) = ...

sum(imgPad(imgHeightIndex:imgHeightIndex+kernalLength-1,...

imgWidthIndex:imgWidthIndex+kernalLength-1) .* kernal, "all");

end

end

% % 钳位一下

% convResult = max(0, min(255, convResult));

end
```

```Matlab
% myFilter.m
function filtResult = myFilter(img,filterType,filterLength,varargin)

%MYFILTER 此处显示有关此函数的摘要

% 此处显示详细说明

if mod(filterLength, 2) ~= 1

error('滤波器的窗宽错误，只能为奇数')

end

if strcmpi(filterType, 'Average')

filtKernal = ones([filterLength filterLength], "double") ./ filterLength ^ 2;

elseif strcmpi(filterType, 'Gauss')

if isempty(varargin)

error('Gauss滤波器还需要一个sigma参数')

else

mySigma = varargin{1};

end

center = idivide(filterLength+1, int32(2));

[X,Y] = meshgrid(1:filterLength,1:filterLength);

X = X - double(center);

Y = Y - double(center);

filtKernal = 1/(2*pi*mySigma^2)*exp(-1/2*((X.^2+Y.^2)/mySigma^2));

filtKernal = filtKernal ./ sum(filtKernal, "all");

else

error('滤波器类型错误');

end

% filtResult = myConv(img, filtKernal);

filtResult = conv2(img, filtKernal, "same");

end
```
```Matlab
% myWeber.m
function img_weber = myWeber(img, filter_type, filter_size, varargin)

%WEBER 此处显示有关此函数的摘要

% 此处显示详细说明

if strcmpi(filter_type, 'Gauss')

if isempty(varargin)

error('Gauss滤波还需要一个sigma参数')

else

sigma = varargin{1};

end

img_s = myFilter(img, filter_type, filter_size, sigma);

elseif strcmpi(filter_type, 'Average')

img_s = myFilter(img, filter_type, filter_size);

else

error('未知的滤波类型')

end

img_weber = (double(img) - img_s) ./ img_s;
```