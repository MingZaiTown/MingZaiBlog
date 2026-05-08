---
layout: page
title: 留言板
---

<div id="twikoo"></div>
<script>
Fluid.utils.loadComments('#twikoo', function() {
  Fluid.utils.createScript('https://lib.baomitu.com/twikoo/1.7.9/twikoo.all.min.js', function() {
    twikoo.init({
      envId: 'https://mingzaiblog.pages.dev/twikoo',
      el: '#twikoo'
    });
  });
});
</script>

欢迎在这里留言！有什么想说的、建议、问题都可以写下来。
