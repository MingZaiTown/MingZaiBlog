---
title: C语言链表const常量指针
date: 2025-10-30
---

*在C语言链表中，为什么经常把结构体指针用const 修饰？用const修饰之后不就变成常量了吗？还怎么修改，比如给链表增减节点？*
# C语言链表中const修饰结构体指针的作用

在C语言中，`const`关键字用于修饰指针时有不同的含义，这取决于`const`放置的位置。理解这些差异对于正确使用链表至关重要。

## const修饰指针的三种情况

1. **指向常量的指针** - 不能通过指针修改数据
   ```c
   const struct Node* ptr;
   ```

2. **常量指针** - 指针本身不可修改（必须初始化）
   ```c
   struct Node* const ptr = &some_node;
   ```

3. **指向常量的常量指针** - 两者都不可修改
   ```c
   const struct Node* const ptr = &some_node;
   ```

## 为什么在链表中使用const

### 1. 保护数据不被意外修改
在只需要读取链表数据而不修改链表结构的函数中使用const，可以防止意外修改节点内容：

```c
// 此函数保证不会修改链表节点内容
void print_list(const struct Node* head) {
    const struct Node* current = head;
    while (current != NULL) {
        printf("%d ", current->data);  // 可以读取数据
        // current->data = 10;        // 编译错误：不能修改const指向的数据
        current = current->next;       // 但可以修改指针本身
    }
}
```

### 2. 增加代码可读性和安全性
使用const明确表达了函数的意图，让调用者知道函数是否会修改链表内容。

### 3. 允许函数接受常量链表
当你的链表被声明为常量时，只有使用const修饰的函数参数才能接受它：

```c
const struct Node* const_list = create_list();
print_list(const_list);  // 只有参数是const的函数才能接受常量链表
```

## 如何修改链表

对于需要修改链表的函数，我们不会使用const修饰指向需要修改部分的指针：

```c
// 添加新节点 - 需要修改头指针
void add_node(struct Node** head_ref, int data) {
    struct Node* new_node = (struct Node*)malloc(sizeof(struct Node));
    new_node->data = data;
    new_node->next = *head_ref;
    *head_ref = new_node;
}

// 删除节点 - 需要修改链表结构
void delete_node(struct Node** head_ref, int key) {
    struct Node* temp = *head_ref, *prev = NULL;
    
    // 查找要删除的节点
    while (temp != NULL && temp->data != key) {
        prev = temp;
        temp = temp->next;
    }
    
    if (temp == NULL) return;
    
    // 从链表中移除节点
    if (prev == NULL) {
        *head_ref = temp->next;
    } else {
        prev->next = temp->next;
    }
    
    free(temp);
}
```

## 完整示例

```c
#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node* next;
};

// 常量遍历函数
void print_list(const struct Node* head) {
    const struct Node* current = head;
    while (current != NULL) {
        printf("%d -> ", current->data);
        current = current->next;
    }
    printf("NULL\n");
}

// 需要修改链表的函数
void append_node(struct Node** head_ref, int data) {
    struct Node* new_node = (struct Node*)malloc(sizeof(struct Node));
    struct Node* last = *head_ref;
    
    new_node->data = data;
    new_node->next = NULL;
    
    if (*head_ref == NULL) {
        *head_ref = new_node;
        return;
    }
    
    while (last->next != NULL) {
        last = last->next;
    }
    
    last->next = new_node;
}

int main() {
    struct Node* head = NULL;
    
    // 添加节点
    append_node(&head, 1);
    append_node(&head, 2);
    append_node(&head, 3);
    
    // 打印链表（不修改内容）
    printf("Linked list: ");
    print_list(head);
    
    return 0;
}
```

## 总结

在链表中使用`const`修饰结构体指针的主要目的是：
- 保护数据不被意外修改
- 提高代码的可读性和安全性
- 允许函数处理常量链表

`const`并不妨碍我们修改链表，它只是限制了某些函数对数据的修改能力。需要修改链表时，我们使用非常量指针，而只需要读取数据时，使用const指针可以提高代码的健壮性。
*我见到的大部分是常量指针的用法，类似List_Item_t *const pxItem。常量指针的意思是指针无法改变，一直指向一个地址，但是改地址的内容可以改变吗？*
您观察得非常准确！`List_Item_t *const pxItem` 这种写法确实是 C 语言链表中非常常见且重要的模式。您对它的理解也基本正确，让我们来详细解析一下。

## 核心概念：常量指针 (Constant Pointer)

`List_Item_t *const pxItem` 声明的是一个 **常量指针**。

- **指针本身是常量**：`pxItem` 这个指针变量存储的内存地址**不可改变**
- **指向的数据非常量**：可以通过 `pxItem` 来修改它指向的 `List_Item_t` 结构体的内容

```c
typedef struct List_Item {
    int data;
    struct List_Item* next;
} List_Item_t;

void example_function() {
    List_Item_t item1 = {10, NULL};
    List_Item_t item2 = {20, NULL};
    
    // 声明并初始化常量指针
    List_Item_t *const pxItem = &item1;
    
    // 以下操作都是合法的：
    pxItem->data = 100;     // 可以修改指向的内容
    pxItem->next = &item2;  // 可以修改结构体成员
    
    // 以下操作会导致编译错误：
    // pxItem = &item2;     // 错误！不能改变指针指向的地址
    // pxItem = NULL;       // 错误！不能改变指针的值
}
```

## 为什么在链表操作中使用常量指针？

### 1. 遍历链表时的安全性

在遍历链表时，我们通常需要一个当前指针来遍历节点，但我们不希望这个指针本身被意外修改：

```c
void process_list(List_Item_t *const head) {
    // head 是指向头节点的常量指针，确保头指针不会被意外修改
    List_Item_t *const current = head; // 当前节点的常量指针
    
    while (current != NULL) {
        // 可以安全地访问和修改节点内容
        printf("Processing item with data: %d\n", current->data);
        current->data *= 2; // 可以修改节点数据
        
        // 但不能意外改变遍历指针：
        // current = current->next; // 这行如果取消注释会编译错误
        
        // 正确的做法是使用另一个变量来遍历
        List_Item_t *next_ptr = current->next;
        // ... 处理下一个节点
    }
}
```

### 2. 函数参数中的使用

在函数参数中使用常量指针可以明确表达函数的契约：

```c
// 这个函数保证不会改变头指针本身（不会重新分配链表头）
void print_list(const List_Item_t *const head) {
    // head 既是常量指针又指向常量数据
    // 既不能改变head指向的地址，也不能修改节点内容
    const List_Item_t *current = head;
    
    while (current != NULL) {
        printf("%d ", current->data);
        current = current->next; // current不是常量指针，可以改变
    }
}

// 这个函数可能改变头指针（如插入到头部）
void insert_at_head(List_Item_t **const head_ref, int data) {
    // head_ref 是指向指针的常量指针
    // 可以修改 *head_ref（改变链表头）
    // 但不能修改 head_ref 本身（如不能让它指向别的指针）
    
    List_Item_t *new_node = malloc(sizeof(List_Item_t));
    new_node->data = data;
    new_node->next = *head_ref;
    *head_ref = new_node; // 可以修改指向的内容
    
    // head_ref = NULL; // 这行会编译错误，不能修改head_ref本身
}
```

### 3. 在链表算法中的实际应用

```c
// 在有序链表中插入新节点
void sorted_insert(List_Item_t **const head_ref, List_Item_t *const new_node) {
    List_Item_t **current_ref = head_ref; // 指向指针的指针
    
    // 遍历找到插入位置
    while (*current_ref != NULL && 
           (*current_ref)->data < new_node->data) {
        current_ref = &((*current_ref)->next);
    }
    
    // 插入新节点
    new_node->next = *current_ref;
    *current_ref = new_node;
    
    // 注意：new_node 是常量指针，意味着：
    // - 我们不能改变 new_node 指向的地址
    // - 但我们可以改变 new_node->next 和 new_node->data
}
```

## 总结

| 指针类型 | 语法 | 能否改变指针 | 能否改变指向的数据 |
|---------|------|-------------|------------------|
| 非常量指针 | `List_Item_t* ptr` | 是 | 是 |
| 指向常量的指针 | `const List_Item_t* ptr` | 是 | 否 |
| **常量指针** | **`List_Item_t* const ptr`** | **否** | **是** |
| 指向常量的常量指针 | `const List_Item_t* const ptr` | 否 | 否 |

在链表操作中使用 `List_Item_t *const pxItem` 这种常量指针的主要目的是：

1. **确保指针稳定性**：防止指针本身被意外修改
2. **明确设计意图**：代码明确表达"这个指针不应该改变指向"
3. **编译时检查**：编译器会捕获意外的指针赋值错误
4. **保持修改能力**：仍然可以修改指针所指向的数据内容

这种用法在需要固定引用某个节点但同时需要修改该节点内容的场景中特别有用。