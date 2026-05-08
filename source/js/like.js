(function() {
  if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') return;

  var container = document.createElement('div');
  container.className = 'like-btn';
  container.style.cssText = 'text-align:center;margin:2rem 0;cursor:pointer;font-size:1.2rem;user-select:none';

  var icon = document.createElement('span');
  icon.className = 'like-icon';
  icon.textContent = '❤';
  icon.style.cssText = 'color:#ccc;transition:color .2s,transform .2s;display:inline-block;margin-right:6px';

  var label = document.createElement('span');
  label.className = 'like-count';
  label.textContent = '0';

  container.appendChild(icon);
  container.appendChild(label);

  var key = 'blog_liked_home';
  var liked = localStorage.getItem(key);
  var count = parseInt(localStorage.getItem('blog_like_count') || '0');

  function update() {
    label.textContent = count;
    icon.style.color = liked ? '#e74c3c' : '#ccc';
    if (liked) icon.style.transform = 'scale(1.1)';
    else icon.style.transform = 'scale(1)';
  }

  container.onclick = function() {
    if (!liked) {
      liked = '1';
      count++;
      localStorage.setItem(key, liked);
      localStorage.setItem('blog_like_count', count.toString());
      update();
    }
  };

  update();

  var board = document.querySelector('#board');
  if (board) board.appendChild(container);
})();
