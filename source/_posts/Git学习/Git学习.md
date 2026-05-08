---
title: Git学习
date: 2025-10-30
categories:
  - Git学习
---

# Git学习

## 三个区
### 工作区
工作区就是指当前的目录，用ls命令查看到的就是工作区的内容  
*工作区就是生产车间*
### 暂存区
*暂存区就是小货车*，~~用git ls-files就能查看暂存区内容~~ 并非，这个命令是查看所有被跟踪的文件，不只是暂存区的
### 仓库区
*就是存储仓库*

## 三个区之间的“货物”流转
### `git add` 工作区到暂存区
![alt text](/images/img_070a81d087.png)
这个是可以一个文件一个文件地往货车上搬运的，与后面的`git commit`不同  
`git add .`表示提交当前目录的所有文件
### `git commit` 暂存区到仓库
可选参数：`--m <提交版本说明>`
![alt text](/images/img_3ea1cfb6db.png)
与git add不同，这个直接是把一整个货车上的货物卸到仓库里。
## Git reset 回退版本
### `git reset --soft <上一个版本的ID>`:
回退到某个版本，保留工作区和暂存区的内容
### `git reset --hard <上一个版本的ID>`:
回退到某个版本，丢弃工作区和暂存区的内容
### `git reset --mixed <上一个版本的ID>`:
回退到某个版本，保留工作区内容丢弃暂存区的内容
![alt text](/images/img_4588481562.png)

## 文件的状态
![alt text](/images/img_a71b992218.png)

## `git diff`
查看差异
![alt text](/images/img_c21f80a34b.png)
默认查看工作区和暂存区两个区之间的差异  
但若加上`HEAD`,就表示比较工作区和版本库之间的差异  
***HEAD表示版本库的指针***  
### 加上`--cached`表示比较暂存区和版本库之间的差异
### git diff还能用于比较两个特定的版本库之间的差异。
在`git diff`后加上两次提交的id即可
### `git diff`搭配head
![alt text](/images/img_a2c965c03f.png)

***在以上介绍的所有`git diff ...`命令的后面还可以加上特定的文件名，那么就会只查看这个文件的差异***
### *git diff summary*
![alt text](/images/img_38519e2c54.png)


## 从版本库中删除文件
### 方法1(不推荐)：在工作区删除，然后提交
现在工作区中删除，然后提交到暂存区中，再提交
### 方法2：`git rm`然后提交
参数：`--cached`，表示只删除暂存区，不删除工作区
![alt text](/images/img_692d659e77.png)

## .gitignore
用于忽略一些文件，不提交到版本库中。**前提：这些文件不能是已经被添加到版本库中的！***这个文件本身也需要提交*
![alt text](/images/img_1525f7e307.png)![alt text](/images/img_94c38a1508.png)
使用方法是，只需要创建这个.gitignore文件，再把需要忽略的文件名或者文件夹名**文件夹最后要加斜线**输入其中即可。***支持通配符***，即类似`*.log`
![alt text](/images/img_d9645e1861.png)
![alt text](/images/img_db3d838d52.png)


## 远程仓库
远程连接有两种方式，HTTPS和SSH协议，前者已停用，所以使用后者。使用后者需要配置SSH密钥。  
1. 先检查本地主机是否已经存在ssh key。  
`cd `到用户名录，ls查看有无.ssh文件夹，如有，看里面是否存在 id_rsa 和 id_rsa.pub文件，如果存在，说明已经有SSH Key。存在的话直接跳转到第三步。
2. 生成SSH Key

        ssh-keygen -t rsa -C "xxx@xxx.com"
        //执行后一直回车即可
    生成完以后再去查看。
![alt text](/images/img_557c1d660a.png)  
前面那个是私钥，后面那个是公钥
3. 获取ssh key公钥内容（id_rsa.pub）  
   `cat id_rsa.pub`，并复制
4. 仓库账号添加公钥
5. SSH连接仓库（以gitee为例）
```bash
ssh -T git@gitee.com
```
6. 连接仓库：
```bash
git remote add origin git@gitee.com:your_username/your_notes_repo.git
```
`origin` 是远程仓库的别名，通常都用这个。
### 本地仓库和远程仓库的关联
![alt text](/images/img_a30664eb31.png)
![alt text](/images/img_92cad63a27.png)


## 常用命令
### `git status`
查看仓库目前的状态。
### `git log (--oneline)`
查看仓库的提交日志。若加上`--oneline`参数，则表示以精简形式显示。
### `git ls-files`
查看被跟踪的文件。


## Gemini 总结的笔记


---

## 💻 Git 笔记：从零开始到远程同步（使用 SSH）

### 一、 首次设置：安装与身份配置

|**步骤**|**目的**|**Arch Linux 安装命令**|**配置命令**|
|---|---|---|---|
|**1. 安装 Git/SSH**|确保系统拥有 Git 和 SSH 工具。|`sudo pacman -S openssh git`|(无)|
|**2. 配置身份**|设置 Git 记录提交者信息。|(无)|`git config --global user.name "你的Gitee用户名"`<br><br>  <br><br>`git config --global user.email "你的Gitee邮箱"`|

### 二、 SSH 密钥设置（实现免密连接）

这是连接远程仓库的关键，只需要做一次。

|**步骤**|**目的**|**命令及操作说明**|
|---|---|---|
|**1. 生成密钥对**|在用户主目录 (`~/.ssh/`) 下生成公钥和私钥。|`ssh-keygen -t rsa -b 4096 -C "你的Gitee邮箱"`<br><br>  <br><br>（一路回车使用默认设置）|
|**2. 复制公钥**|获取公钥文件的内容。|`cat ~/.ssh/id_rsa.pub`|
|**3. 添加公钥到 Gitee**|登录 Gitee -> **设置** -> **SSH公钥**，将复制的内容粘贴并保存。|(Gitee 网站操作)|
|**4. 测试连接**|验证 SSH 密钥是否设置成功。|`ssh -T git@gitee.com`<br><br>  <br><br>（看到 "successfully authenticated" 即为成功）|

### 三、 初次连接本地与 Gitee 仓库

假设您已经在 Gitee 上创建了一个名为 `notes` 的空仓库。

|**步骤**|**目的**|**命令**|**SSH 远程地址示例**|
|---|---|---|---|
|**1. 进入目录**|切换到您存放笔记的本地文件夹。|`cd /path/to/your/local/notes`|(无)|
|**2. 初始化仓库**|将本地文件夹变成 Git 仓库。|`git init`|(无)|
|**3. 添加远程地址**|告知本地仓库 Gitee 仓库的位置。|`git remote add origin git@gitee.com:用户名/notes.git`|`git@gitee.com:mingzai/mynotes.git`|
|**4. 暂存文件**|将本地笔记文件添加到暂存区。|`git add .`|(无)|
|**5. 提交到本地**|将暂存区文件保存到本地仓库历史。|`git commit -m "Initial commit of notes"`|(无)|
|**6. 推送到 Gitee**|将本地内容推送到远程仓库。|`git push -u origin master`|(无)|
|**注意：** `-u origin master` 只需要在第一次推送时使用，它会建立本地分支与远程分支的关联。||||

---

## ⚡ 日常使用与维护核心命令

一旦初次设置完成，您只需要专注于以下四个核心命令。

| **命令**           | **目的**    | **说明**                           | **示例**                                                           |
| ---------------- | --------- | -------------------------------- | ---------------------------------------------------------------- |
| **`git status`** | **查看状态**  | 检查哪些文件被修改、新增或删除，以及哪些文件已暂存。       | `git status`                                                     |
| **`git add`**    | **暂存更改**  | 将修改或新增的文件添加到下一次提交的“清单”（暂存区）。     | `git add .` (添加所有更改)<br><br>  <br><br>`git add file.md` (添加特定文件) |
| **`git commit`** | **提交更改**  | 将暂存区的文件永久保存到本地仓库的历史记录中。          | `git commit -m "更新了 [文件名] 的内容"`                                  |
| **`git push`**   | **推送到远程** | 将您的本地提交同步到 Gitee 上的远程仓库。         | `git push`                                                       |
| **`git pull`**   | **拉取更新**  | 将 Gitee 上其他人（或在其他电脑上）的最新更改下载到本地。 | `git pull`                                                       |