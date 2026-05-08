---
title: 留言板
comments: true
---

<script>
(function() {
  function moveComments() {
    var comments = document.getElementById('comments');
    var board = document.querySelector('.page-content');
    if (comments && board) {
      board.insertBefore(comments, board.firstChild);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', moveComments);
  } else {
    moveComments();
  }
})();
</script>

欢迎在这里留言！有什么想说的、建议、问题都可以写下来。

