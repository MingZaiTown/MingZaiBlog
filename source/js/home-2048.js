(function() {
  if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') return;

  var SIZE = 4;
  var TILE_ID = 0;
  var ANIM_DURATION = 120;
  var tiles = {};
  var grid = [];
  var score = 0;
  var best = parseInt(localStorage.getItem('game2048_best') || '0');
  var gameOver = false;
  var won = false;
  var keepPlaying = false;
  var container, gridEl, tileContainer;

  for (var r = 0; r < SIZE; r++) { grid[r] = []; for (var c = 0; c < SIZE; c++) grid[r][c] = 0; }

  var style = document.createElement('style');
  style.textContent =
    '#home-2048{max-width:520px;margin:1.5rem auto;padding:0 15px;font-family:Arial,sans-serif}' +
    '#home-2048 .g-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}' +
    '#home-2048 .g-header h2{margin:0;font-size:1.8rem;color:#776e65}' +
    '#home-2048 .g-scores{display:flex;gap:8px}' +
    '#home-2048 .g-scores>div{background:#bbada0;color:#fff;padding:4px 14px;border-radius:6px;text-align:center;font-size:0.8rem}' +
    '#home-2048 .g-scores>div span{display:block;font-size:1.3rem;font-weight:bold}' +
    '#home-2048 .g-controls{display:flex;gap:8px;align-items:center}' +
    '#home-2048 .g-btn{background:#8f7a66;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:0.9rem}' +
    '#home-2048 .g-btn:hover{background:#9f8b77}' +
    '#home-2048 .g-board{position:relative;background:#bbada0;border-radius:8px;padding:8px;width:100%;aspect-ratio:1;overflow:hidden;touch-action:none}' +
    '#home-2048 .g-cell{background:rgba(238,228,218,.35);border-radius:4px}' +
    '#home-2048 .g-tile{position:absolute;border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:bold;transition:transform ' + ANIM_DURATION + 'ms ease;z-index:2}' +
    '#home-2048 .g-tile.merged{z-index:3}' +
    '#home-2048 .g-tile.appear{animation:gappear ' + ANIM_DURATION + 'ms ease}' +
    '#home-2048 .g-tile.pop{animation:gpop 200ms ease}' +
    '@keyframes gappear{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}' +
    '@keyframes gpop{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}' +
    '#home-2048 .g-hint{text-align:center;margin-top:6px;color:#776e65;font-size:0.85rem}' +
    '#home-2048 .g-overlay{position:absolute;inset:0;background:rgba(238,228,218,.73);z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px}' +
    '#home-2048 .g-overlay h3{font-size:2rem;color:#776e65;margin:0 0 8px}' +
    '#home-2048 .g-overlay p{margin:0 0 12px;color:#776e65}';
  document.head.appendChild(style);

  function findParent(el, sel) {
    while (el) { if (el.matches(sel)) return el; el = el.parentElement; }
    return null;
  }

  function init() {
    var recentPosts = document.querySelector('#recent-posts');
    if (!recentPosts) return;

    var section = document.createElement('div');
    section.id = 'home-2048';
    section.style.cssText = 'max-width:500px;margin:2rem auto;padding:0 15px';

    section.innerHTML =
      '<div class="g-header">' +
        '<h2>2048</h2>' +
        '<div class="g-controls">' +
          '<div class="g-scores">' +
            '<div>分数<span id="g-score">0</span></div>' +
            '<div>最高<span id="g-best">' + best + '</span></div>' +
          '</div>' +
          '<button class="g-btn" id="g-newbtn">新游戏</button>' +
        '</div>' +
      '</div>' +
      '<div class="g-board" id="g-board">' +
      '</div>' +
      '<div class="g-hint">方向键 / WASD 移动</div>';

    recentPosts.parentNode.insertBefore(section, recentPosts.nextSibling);

    container = document.getElementById('g-board');
    gridEl = container;
    tileContainer = container;

    buildCells();
    document.getElementById('g-newbtn').onclick = resetGame;
    resetGame();
  }

  function buildCells() {
    var w = gridEl.clientWidth || gridEl.offsetWidth || 400;
    var pad = 8;
    var gap = 8;
    var n = SIZE;
    var cellSize = (w - pad * 2 - gap * (n - 1)) / n;
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var cell = document.createElement('div');
        cell.className = 'g-cell';
        cell.style.cssText =
          'position:absolute;width:' + cellSize + 'px;height:' + cellSize + 'px;' +
          'left:' + (pad + c * (cellSize + gap)) + 'px;' +
          'top:' + (pad + r * (cellSize + gap)) + 'px;';
        gridEl.appendChild(cell);
      }
    }
  }

  function tileCSS(val) {
    var colors = {
      2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',
      32:'#f67c5f',64:'#f65e3b',128:'#edcf72',256:'#edcc61',
      512:'#edc850',1024:'#edc53f',2048:'#edc22e'};
    var textColors = {2:'#776e65',4:'#776e65',8:'#f9f6f2',16:'#f9f6f2',32:'#f9f6f2',64:'#f9f6f2'};
    var bg = colors[val] || '#3c3a32';
    var fg = textColors[val] || '#f9f6f2';
    var fs = val < 100 ? '2rem' : val < 1000 ? '1.6rem' : val < 10000 ? '1.2rem' : '0.95rem';
    return 'background:' + bg + ';color:' + fg + ';font-size:' + fs;
  }

  function makeTileEl(id, val, row, col, anim) {
    var w = gridEl.clientWidth || gridEl.offsetWidth || 400;
    var pad = 8, gap = 8, n = SIZE, ts = (w - pad * 2 - gap * (n - 1)) / n;
    var el = document.createElement('div');
    el.className = 'g-tile' + (anim === 'appear' ? ' appear' : '') + (anim === 'pop' ? ' pop' : '');
    el.id = 'tile-' + id;
    el.textContent = val;
    el.style.cssText = tileCSS(val) +
      ';width:' + ts + 'px;height:' + ts + 'px;z-index:2;' +
      'transform:translate(' + (pad + col * (ts + gap)) + 'px,' + (pad + row * (ts + gap)) + 'px)';
    return el;
  }

  function renderTile(id, val, row, col, anim) {
    var el = makeTileEl(id, val, row, col, anim);
    tileContainer.appendChild(el);
    tiles[id] = {el: el, val: val, row: row, col: col};
  }

  function moveTileEl(id, row, col) {
    var t = tiles[id];
    if (!t) return;
    var w = gridEl.clientWidth || gridEl.offsetWidth || 400;
    var pad = 8, gap = 8, n = SIZE, ts = (w - pad * 2 - gap * (n - 1)) / n;
    t.row = row; t.col = col;
    t.el.style.transform = 'translate(' + (pad + col * (ts + gap)) + 'px,' + (pad + row * (ts + gap)) + 'px)';
  }

  function removeTile(id) {
    var t = tiles[id];
    if (t) { t.el.remove(); delete tiles[id]; }
  }

  function clearTiles() {
    for (var id in tiles) tiles[id].el.remove();
    tiles = {};
  }

  function emptyCells() {
    var cells = [];
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (grid[r][c] === 0) cells.push({r: r, c: c});
    return cells;
  }

  function addRandom() {
    var cells = emptyCells();
    if (cells.length === 0) return;
    var pos = cells[Math.floor(Math.random() * cells.length)];
    var val = Math.random() < 0.9 ? 2 : 4;
    var id = ++TILE_ID;
    grid[pos.r][pos.c] = id;
    renderTile(id, val, pos.r, pos.c, 'appear');
  }

  function resetGame() {
    clearTiles();
    for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) grid[r][c] = 0;
    score = 0; gameOver = false; won = false; keepPlaying = false;
    document.getElementById('g-score').textContent = '0';
    removeOverlay();
    addRandom();
    addRandom();
  }

  function getOverlay() { return container.querySelector('.g-overlay'); }
  function removeOverlay() { var o = getOverlay(); if (o) o.remove(); }

  function showOverlay(title, msg, btnText) {
    removeOverlay();
    var ov = document.createElement('div');
    ov.className = 'g-overlay';
    ov.innerHTML = '<h3>' + title + '</h3><p>' + msg + '</p><button class="g-btn" id="g-restart">' + btnText + '</button>';
    container.appendChild(ov);
    document.getElementById('g-restart').onclick = resetGame;
  }

  function checkGameOver() {
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) return false;
        if (c + 1 < SIZE && grid[r][c] !== 0 && grid[r][c + 1] !== 0 &&
            tiles[grid[r][c]].val === tiles[grid[r][c + 1]].val) return false;
        if (r + 1 < SIZE && grid[r][c] !== 0 && grid[r + 1][c] !== 0 &&
            tiles[grid[r][c]].val === tiles[grid[r + 1][c]].val) return false;
      }
    return true;
  }

  function performMove(d) {
    if (gameOver || animating) return;
    if (won && !keepPlaying) return;

    var result = calcMove(d);
    if (!result.moved) return;

    animating = true;

    // 1. Update grid data immediately
    var newGrid = [];
    for (var r = 0; r < SIZE; r++) { newGrid[r] = []; for (var c = 0; c < SIZE; c++) newGrid[r][c] = 0; }
    for (var i = 0; i < result.surviving.length; i++) {
      var s = result.surviving[i];
      newGrid[s.r][s.c] = s.id;
    }

    // 2. Animate: move tiles to new positions
    for (var i = 0; i < result.movements.length; i++) {
      var m = result.movements[i];
      moveTileEl(m.id, m.toR, m.toC);
    }

    // 3. After animation: handle merges + spawn new
    setTimeout(function() {
      // Remove merged tiles
      for (var i = 0; i < result.merges.length; i++) {
        var mg = result.merges[i];
        removeTile(mg.fromId);
        removeTile(mg.fromId2);
      }

      // Update grid to new state
      grid = newGrid;

      // Add merged result tiles with pop animation
      for (var i = 0; i < result.merges.length; i++) {
        var mg = result.merges[i];
        var id = ++TILE_ID;
        grid[mg.atR][mg.atC] = id;
        renderTile(id, mg.val, mg.atR, mg.atC, 'pop');
        result.spawnedNew.push({id: id, val: mg.val, r: mg.atR, c: mg.atC});
      }

      // Update score
      score += result.addedScore;
      document.getElementById('g-score').textContent = score;
      if (score > best) {
        best = score;
        localStorage.setItem('game2048_best', best.toString());
        document.getElementById('g-best').textContent = best;
      }

      // Spawn new random tile
      addRandom();

      animating = false;

      // Check win/lose
      if (!keepPlaying) {
        for (var i = 0; i < result.spawnedNew.length; i++) {
          if (result.spawnedNew[i].val >= 2048) { won = true; showOverlay('🎉 你赢了！', '得分: ' + score, '继续游戏'); return; }
        }
      }
      if (checkGameOver()) { gameOver = true; showOverlay('游戏结束', '得分: ' + score, '再来一局'); }
    }, ANIM_DURATION + 20);
  }

  function calcMove(d) {
    // Returns: {moved, movements: [{id, fromR, fromC, toR, toC}], merges: [{fromId, fromId2, atR, atC, val}], surviving: [{id, val, r, c}], addedScore, spawnedNew: [{id, val, r, c}]}
    // d: 0=left, 1=down, 2=right, 3=up  (FIXED: swapped 1 and 3 from original buggy version)

    // Collect tiles row by row
    var tileList = [];
    var seen = {};
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++) {
        var id = grid[r][c];
        if (id !== 0 && !seen[id]) { seen[id] = true; tileList.push({id: id, val: tiles[id].val, r: r, c: c}); }
      }

    var movements = [];
    var merges = [];
    var surviving = [];
    var addedScore = 0;
    var spawnedNew = [];

    // Process direction
    var order = [];
    for (var i = 0; i < SIZE; i++) order.push(i);
    if (d === 2) order.reverse(); // right: process columns right-to-left

    var rows = [], cols = [];
    for (var i = 0; i < SIZE; i++) { rows.push(i); cols.push(i); }
    if (d === 1) rows.reverse(); // down: process rows bottom-to-top

    // For each row/col (depends on direction), collect tiles and slide
    for (var ri = 0; ri < SIZE; ri++) {
      var line = [];
      var lineR, lineC;

      if (d === 0 || d === 2) {
        // Horizontal: process each row
        var r = rows[ri];
        lineR = r;
        for (var ci = 0; ci < SIZE; ci++) {
          var c = order[ci];
          var id = grid[r][c];
          if (id !== 0) line.push({id: id, val: tiles[id].val, r: r, c: c});
        }
      } else {
        // Vertical: process each column
        var c = cols[ri];
        lineC = c;
        for (var ci = 0; ci < SIZE; ci++) {
          var r = order[ci];
          var id = grid[r][c];
          if (id !== 0) line.push({id: id, val: tiles[id].val, r: r, c: c});
        }
      }

      var slid = slideLine(line);
      if (d === 0 || d === 2) {
        for (var si = 0; si < slid.result.length; si++) {
          var item = slid.result[si];
          surviving.push({id: item.id, val: item.val, r: lineR, c: si});
          movements.push({id: item.id, fromR: item.origR, fromC: item.origC, toR: lineR, toC: si});
        }
      } else {
        for (var si = 0; si < slid.result.length; si++) {
          var item = slid.result[si];
          surviving.push({id: item.id, val: item.val, r: si, c: lineC});
          movements.push({id: item.id, fromR: item.origR, fromC: item.origC, toR: si, toC: lineC});
        }
      }

      for (var mi = 0; mi < slid.merges.length; mi++) {
        var merge = slid.merges[mi];
        merges.push(merge);
        addedScore += merge.val;
        var mr = (d === 0 || d === 2) ? lineR : merge.atIdx;
        var mc = (d === 0 || d === 2) ? merge.atIdx : lineC;
        spawnedNew.push({val: merge.val, r: mr, c: mc});
      }
    }

    var moved = movements.some(function(m) { return m.fromR !== m.toR || m.fromC !== m.toC; }) || merges.length > 0;

    return {moved: moved, movements: movements, merges: merges, surviving: surviving, addedScore: addedScore, spawnedNew: spawnedNew};
  }

  function slideLine(line) {
    // line: [{id, val, r, c}] sorted in movement direction
    var result = [];
    var merges = [];
    var merged = {};

    for (var i = 0; i < line.length; i++) {
      var item = line[i];
      if (result.length > 0 && result[result.length - 1].val === item.val && !merged[result.length - 1]) {
        // Merge
        var prev = result.pop();
        var mergeVal = prev.val * 2;
        merges.push({fromId: prev.id, fromId2: item.id, atIdx: result.length, atR: item.r, atC: item.c, val: mergeVal, origR1: prev.origR || prev.r, origC1: prev.origC || prev.c, origR2: item.r, origC2: item.c});
        var newItem = {id: prev.id, val: mergeVal, origR: prev.origR || prev.r, origC: prev.origC || prev.c};
        result.push(newItem);
        merged[result.length - 1] = true;
      } else {
        result.push({id: item.id, val: item.val, origR: item.r, origC: item.c});
      }
    }

    while (result.length < SIZE) result.push(null);

    // Clean out nulls for compact result
    var compact = [];
    for (var i = 0; i < result.length; i++) {
      if (result[i] !== null) compact.push(result[i]);
    }

    // Fix merge positions
    for (var mi = 0; mi < merges.length; mi++) {
      var mg = merges[mi];
      mg.atIdx = mg.atIdx;
    }

    return {result: compact, merges: merges};
  }

  var animating = false;

  var keyMap = {37:0, 38:3, 39:2, 40:1, 65:0, 87:3, 68:2, 83:1};
  document.addEventListener('keydown', function(e) {
    var d = keyMap[e.keyCode];
    if (d !== undefined && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      performMove(d);
    }
  });

  var touchStartX, touchStartY;
  document.addEventListener('touchstart', function(e) {
    var target = e.target;
    if (!findParent(target, '#home-2048')) return;
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, {passive: true});

  document.addEventListener('touchend', function(e) {
    if (touchStartX === undefined) return;
    var target = e.target;
    if (!findParent(target, '#home-2048')) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    var adx = Math.abs(dx), ady = Math.abs(dy);
    if (Math.max(adx, ady) < 20) return;
    var d;
    if (adx > ady) d = dx > 0 ? 2 : 0;
    else d = dy > 0 ? 1 : 3;  // FIXED: down=1, up=3
    performMove(d);
    touchStartX = touchStartY = undefined;
  }, {passive: true});

  // Wait for DOM
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
