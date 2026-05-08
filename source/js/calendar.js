(function() {
  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];

  function render() {
    var container = document.getElementById('calendar-container');
    if (!container) return;

    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    var today = now.getDate();

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    var html = '<table style="width:100%;border-collapse:collapse;text-align:center;font-size:0.9rem">';
    html += '<thead><tr>';
    for (var i = 0; i < 7; i++) {
      var isWeekend = i === 0 || i === 6;
      html += '<th style="padding:4px 0;' + (isWeekend ? 'color:#e74c3c' : '') + '">' + WEEK[i] + '</th>';
    }
    html += '</tr></thead><tbody>';

    var day = 1;
    for (var row = 0; row < 6; row++) {
      if (day > daysInMonth) break;
      html += '<tr>';
      for (var col = 0; col < 7; col++) {
        if ((row === 0 && col < firstDay) || day > daysInMonth) {
          html += '<td style="padding:3px 0"></td>';
        } else {
          var isToday = day === today;
          html += '<td style="padding:3px 0;' +
            (isToday ? 'background:#49b1f5;color:#fff;border-radius:50%;font-weight:bold' : '') +
            '">' + day + '</td>';
          day++;
        }
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  render();
})();
