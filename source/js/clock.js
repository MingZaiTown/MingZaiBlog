(function() {
  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];

  function update() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    var timeEl = document.getElementById('clock-time');
    if (timeEl) timeEl.textContent = h + ':' + m + ':' + s;

    var y = now.getFullYear();
    var mo = now.getMonth() + 1;
    var d = now.getDate();
    var w = WEEK[now.getDay()];
    var dateEl = document.getElementById('clock-date');
    if (dateEl) dateEl.textContent = y + '年' + mo + '月' + d + '日 周' + w;
  }

  update();
  setInterval(update, 1000);
})();
