---
title: pynq库基本使用
date: 2025-11-28
---

# Overlay

## 什么叫做Overlay

Overlay可以说是PYNQ的核心，其目的就是把**写好的硬件设计加载到FPGA上**。一般Overlay需要包含一下几个部分：

1. **比特流文件**：配置FPGA的基本结构
2. **HWH文件**：确定VIVADO中可用的IP
3. **Python API**：公开的python可以使用的API

## 操作方法

- **Overlay设计文件**：最基本的操作方式就是直接使用`Overlay`函数加载比特流，同时会解析HWH文件：

```python
from pynq import Overlay
overlay = Overlay("base.bit")
```

- **查询设计相关信息**：可以直接使用`help`来查看已经Overlay的对象，将会输出**设计中各个对象和结构**

```python
help(overlay)
```

- **查询并控制相关对象**：有了整个硬件设计的对象，可以直接操控子内容：

```python
help(overlay.leds)
overlay.leds[0].toggle() # 点亮该led
```

## IP字典调用

- 通过上面得到的整个设计的对象，一般我们是进行IP的相关操作，可以使用更加方便的方式得到所有的IP：

```python
overlay.ip_dict # 整个设计中的所有ip保存形式就是一个字典
# 常用手段：打印所有IP
for ip in overlay.ip_dict:
    print(f"Found IP:{ip}\n")
```

- 然后可以直接通过上面打印的IP得到对应的操作对象

```python
overlay.axi_dma_0
```

# allocate内存分配

## allocate的功能

- 在硬件设计中或者干脆说**DMA的数据读取**是按照**连续内存地址**进行相应的数据读取的，因此在PS端的python控制代码中，相应数据的分配也就应该分配到**连续内存地址**上
- python中通常用于内存地址分配的是numpy，但是计算机会进行**虚拟内存分配**，不符合我们的要求
- 于是，必须使用`allocate`创建`buffer`进行内存地址的分配

> 任何需要给 DMA 发送或从 DMA 接收数据的 `buffer`，**必须**使用 `pynq.allocate` 创建

## 使用方法

```python
from pynq import allocate

buffer = allocate(shape = (rows,cols), dtype = datatype)
```

### 参数确定

1. `shape`：与Numpy中shape完全相同，表示分配的内存缓冲区的形状
   1. `shape=(100,)`：创建一个**一维数组**（向量），包含 **100 个元素**。
   2. `shape=(10, 5)`：创建一个**二维数组**（矩阵），包含 10 行 5 列，总共 **50 个元素**。
2. `dtype`：**必须匹配硬件PL端的位宽**，在DMA中就是必须匹配`TDATA`的位宽。PL端是以内存地址进行数据的读入，则每个地址的数据必须是DMA读取数据的数据位宽
   1. `TDATA` 是 64 位： `dtype=np.uint64`
   2. `TDATA` 是 32 位： `dtype=np.uint32`

> `allocate` 中的 `dtype` **必须**与你 Vivado 设计中 AXI-Stream 接口的 `TDATA` 宽度**严格匹配**。

### 将数据读入缓冲区

- **数据格式处理**：数据的读取不会自动处理格式，那么必须事先把数据格式处理成需要的样式
- **数据填充**：把处理好的数据填充进分配的`buffer`中

```python
file_path = "nn_input_data.txt"
logical_dtype = np.int8     # 逻辑数据类型
physical_dtype = np.uint64  # 硬件接口类型
packing_ratio = 8           # 打包比例 (64 / 8)

# 从txt文件中加载数据
try:
    # 以字符串形式读取所有行
    data_as_strings = np.loadtxt(file_path, dtype=str) # 由于二进制形式，必须使用字符串形式读取
    print(f"成功加载 {len(data_as_strings)} 个 8-bit 字符串。")

except Exception as e:
    print(f"读取文件失败: {e}")
    exit()

# 将字符串转换为无符号正数uint8
try:
    # 使用 NumPy 列表推导式高效完成循环
    temp_uint_list = [int(s.strip(), 2) for s in data_as_strings]
    
    # 将列表转换为一个普通的 NumPy 数组，类型为 uint8
    data_uint8 = np.array(temp_uint_list, dtype=np.uint8)

except ValueError as e:
    print(f"数据转换失败: {e}")
    print("请检查 .txt 文件是否包含非 0 或 1 的字符。")
    exit()
    
data_int8 = data_uint8.view(logical_dtype) # 将 uint8 数组 "重新解释" 为 int8 数组

print(f"数据转换完成。")
print(f"文件中的前4个字符串: {data_as_strings[0:4]}")
print(f"转换后的 (uint8): {data_uint8[0:4]}")
print(f"最终的 (int8):   {data_int8[0:4]}")

# 数据打包，匹配位宽
if len(data_int8) % packing_ratio != 0:
    print(f"错误：数据总量 ({len(data_int8)}) 不是 {packing_ratio} 的倍数。")
    # (在这里添加填充逻辑或报错退出)
    exit()

data_packed_64bit = data_int8.view(physical_dtype)
print(f"已将 {len(data_int8)} 个 int8 数据打包成 {len(data_packed_64bit)} 个 {physical_dtype} 字。")

# 分配内存空间，⚠️PL端并不知道python这边的内存分配数据形式，所以可以直接使用uint64
num_packed_words = len(data_packed_64bit) 
input_buffer = allocate(shape=(num_packed_words,), dtype=physical_dtype)
output_buffer = allocate(shape=(num_packed_words,), dtype=physical_dtype)
print(f"已分配 {num_packed_words} 个元素的 64-bit PYNQ 缓冲区。")
```

> ⚠️从txt中读取的数据必须是8位有符号二进制数，或者是通过各种方式转换为这种形式
>
> ⚠️给到内存的数据需要进行数据位宽的匹配，在上面就进行了数据打包

# DMA

![../_images/dma.png](https://raw.gitcode.com/huang_hk/PicBed/raw/main/assets//20251128225650348.png)

> ✅DMA的工作就是进行数据的转发，在python中的控制方式十分简单，就只是**发送**与**接收**两种

如果`dma`就是`Overlay`得到的相应IP，则有：

- `dma.sendchannel`：这是“**发件**”通道 (PS -> PL)。

- `dma.recvchannel`：这是“**收件**”通道 (PL -> PS)。

这两个通道的控制进行数据的发送和接收：

1. `dma.sendchannel.transfer(input_buffer)`：让 DMA 控制器现在开始从 `input_buffer` 这块内存中读取数据，并把它们**流式传输 (stream)** 到 PL 硬件。并且python不会等待这个过程，而是**直接开始下一个代码任务**
2. `dma.recvchannel.transfer(output_buffer)`：告诉 DMA 控制器，现在开始监听来自 PL 硬件的数据流，一旦有数据过来，就把它们**写入**到 `output_buffer` 这块内存里。同样也不会进行等待而是直接开始下一个任务
3. `wait()`：一个**阻塞过程**，等待相应的任务完成

```python
# 1. 告诉“收件”通道：准备好接收
dma.recvchannel.transfer(output_buffer) 

# 2. 告诉“发件”通道：开始发送
dma.sendchannel.transfer(input_buffer) 

# 3. 等待“发件”通道确认：所有数据都已发出
dma.sendchannel.wait() 

# 4. 等待“收件”通道确认：所有结果都已收到
dma.recvchannel.wait() 

# 5. 在这里，你可以安全地使用 output_buffer 了
print(output_buffer)
```

> `recv.transfer` 要在 `send.transfer` 之前防止**死锁**