/**
 * engine.js
 * Game engine: grid, drag-arrow, sound, story card, debug mode.
 * Depends on: GameConfig (config.js)
 */
var GameEngine = (function () {
    'use strict';

    var cfg         = GameConfig.SETTINGS;
    var currentLevel = null;
    var stageIdx    = 0;
    var stageData   = null;
    var robotPos    = null;
    var moveHistory = [];
    var moveKinds   = []; // 'manual' | 'bonus' — sejajar dg moveHistory
    var manualMoveCount = 0;
    var visitedCheckpoints = {};
    var pathCells   = null;
    var isPlaying   = false;

    var canvasEl = null;
    var gridEl   = null;

    var onStageComplete = null;
    var onStageUpdate   = null;

    // Drag state
    var isDragging = false;
    var dragDir    = null;
    var dragGhost  = null;
    var dragMoved  = false;
    var dragStartX = 0;
    var dragStartY = 0;
    var DRAG_THRESH = 10;

    var ARROWS = {
        up:    { emoji: '\u2B06\uFE0F', label: 'Atas' },
        down:  { emoji: '\u2B07\uFE0F', label: 'Bawah' },
        left:  { emoji: '\u2B05\uFE0F', label: 'Kiri' },
        right: { emoji: '\u27A1\uFE0F', label: 'Kanan' },
    };


    // ── Path Calculation ──

    function buildPath() {
        pathCells = {};
        if (!stageData) return;
        var r = stageData.startPos.row, c = stageData.startPos.col;
        pathCells[r + ',' + c] = true;
        for (var i = 0; i < stageData.answerKey.length; i++) {
            switch (stageData.answerKey[i]) {
                case 'up': r--; break; case 'down': r++; break;
                case 'left': c--; break; case 'right': c++; break;
            }
            pathCells[r + ',' + c] = true;
        }
    }

    function goalPos() {
        if (!stageData) return null;
        var r = stageData.startPos.row, c = stageData.startPos.col;
        for (var i = 0; i < stageData.answerKey.length; i++) {
            switch (stageData.answerKey[i]) {
                case 'up': r--; break; case 'down': r++; break;
                case 'left': c--; break; case 'right': c++; break;
            }
        }
        return { row: r, col: c };
    }


    // ── Grid Rendering ──

    function getCheckpointEmoji(r, c) {
        if (!stageData.checkpoints) return null;
        for (var i = 0; i < stageData.checkpoints.length; i++) {
            var cp = stageData.checkpoints[i];
            if (cp.row === r && cp.col === c) return cp.emoji;
        }
        return null;
    }

    function isObstacle(r, c) {
        if (!stageData.obstacles) return false;
        for (var i = 0; i < stageData.obstacles.length; i++) {
            var o = stageData.obstacles[i];
            if (o.row === r && o.col === c) return true;
        }
        return false;
    }

    function getTrap(r, c) {
        if (!stageData.traps) return null;
        for (var i = 0; i < stageData.traps.length; i++) {
            var t = stageData.traps[i];
            if (t.row === r && t.col === c) return t;
        }
        return null;
    }

    function isFreeRoam() {
        return stageData && stageData.freeRoam === true;
    }

    function gridHTML() {
        var freeMode = isFreeRoam();
        if (!freeMode) buildPath();
        var cols = stageData.gridCols, rows = stageData.gridRows;
        var g = freeMode ? stageData.goalPos : goalPos();
        var gridCls = 'grid' + (freeMode ? ' grid--freeroam' : '');
        var h = '<div class="' + gridCls + '" id="eGrid" style="grid-template-columns:repeat(' + cols + ',var(--cell));grid-template-rows:repeat(' + rows + ',var(--cell));">';

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var isS = (r === stageData.startPos.row && c === stageData.startPos.col);
                var isG = (g && r === g.row && c === g.col);
                var onP = !freeMode && pathCells[r + ',' + c];
                var cpEmoji = getCheckpointEmoji(r, c);
                var isObs = isObstacle(r, c);
                var trap = getTrap(r, c);

                var cls = 'slot'
                    + (freeMode ? ' slot--open' : (onP ? ' slot--path' : ' slot--wall'))
                    + (isObs ? ' slot--obstacle' : '')
                    + (trap ? ' slot--trap slot--trap-' + trap.type : '')
                    + (isS ? ' slot--start slot--robot' : '')
                    + (isG ? ' slot--goal' : '')
                    + (cpEmoji ? ' slot--checkpoint' : '');

                var lbl = isS ? cfg.robotEmoji
                        : isG ? stageData.goalEmoji
                        : isObs ? '\uD83E\uDEA8'
                        : trap ? trap.emoji
                        : (cpEmoji || '');

                var extraAttr = '';
                if (cpEmoji) extraAttr += ' data-cp="' + cpEmoji + '"';
                if (trap) extraAttr += ' data-trap="' + trap.type + '"';

                h += '<div class="' + cls + '" data-row="' + r + '" data-col="' + c + '"'
                   + extraAttr + '><span class="slot__label">' + lbl + '</span></div>';
            }
        }
        return h + '</div>';
    }

    function slotEl(r, c) {
        return gridEl ? gridEl.querySelector('[data-row="' + r + '"][data-col="' + c + '"]') : null;
    }


    // ── Arrow Toolbar ──

    function arrowToolbarHTML() {
        var dirs = ['left', 'up', 'down', 'right'];
        var h = '<div class="arrow-toolbar" id="arrowToolbar"><div class="arrow-toolbar__row">';
        for (var i = 0; i < dirs.length; i++) {
            var d = dirs[i];
            h += '<div class="arrow-btn" data-dir="' + d + '">'
               + '<span class="arrow-btn__emoji">' + ARROWS[d].emoji + '</span>'
               + '<span class="arrow-btn__label">' + ARROWS[d].label + '</span>'
               + '</div>';
        }
        return h + '</div></div>';
    }


    // ── Drag & Drop (arrow → grid) ──

    function initDrag() {
        canvasEl.addEventListener('mousedown', onDown);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        canvasEl.addEventListener('touchstart', onDown, { passive: false });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
    }

    function killDrag() {
        if (!canvasEl) return;
        canvasEl.removeEventListener('mousedown', onDown);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        canvasEl.removeEventListener('touchstart', onDown);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
    }

    function onDown(e) {
        if (!isPlaying) return;
        var btn = findUp(e.target, 'arrow-btn');
        if (!btn) return;
        e.preventDefault();
        isDragging = true;
        dragMoved = false;
        dragDir = btn.dataset.dir;
        var pt = e.touches ? e.touches[0] : e;
        dragStartX = pt.clientX;
        dragStartY = pt.clientY;
    }

    function onMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        var pt = e.touches ? e.touches[0] : e;

        // Minimal drag distance sebelum dianggap drag
        if (!dragMoved) {
            if (Math.hypot(pt.clientX - dragStartX, pt.clientY - dragStartY) < DRAG_THRESH) return;
            dragMoved = true;
            dragGhost = document.createElement('div');
            dragGhost.className = 'drag-ghost';
            dragGhost.textContent = ARROWS[dragDir].emoji;
            dragGhost.style.left = (pt.clientX - 30) + 'px';
            dragGhost.style.top = (pt.clientY - 30) + 'px';
            document.body.appendChild(dragGhost);
        }

        if (dragGhost) {
            dragGhost.style.left = (pt.clientX - 30) + 'px';
            dragGhost.style.top = (pt.clientY - 30) + 'px';
        }

        clearHL();
        var dest = getDestCell(dragDir);
        if (dest) dest.classList.add('slot--highlight');
    }

    function onUp(e) {
        if (!isDragging) return;
        isDragging = false;

        // Klik tanpa drag = tidak dihitung
        if (!dragMoved) { dragDir = null; return; }

        if (dragGhost) { dragGhost.remove(); dragGhost = null; }
        clearHL();

        var pt = e.changedTouches ? e.changedTouches[0] : e;
        if (isOverGrid(pt.clientX, pt.clientY) && dragDir) {
            tryMove(dragDir);
        }
        dragDir = null;
    }

    function getDestCell(dir) {
        if (!robotPos || !gridEl) return null;
        var r = robotPos.row, c = robotPos.col;
        switch (dir) {
            case 'up': r--; break; case 'down': r++; break;
            case 'left': c--; break; case 'right': c++; break;
        }
        var el = slotEl(r, c);
        if (!el) return null;
        if (el.classList.contains('slot--obstacle')) return null;
        if (isFreeRoam()) {
            // freeRoam: cell manapun kecuali batu, allow re-visit
            return el;
        }
        if (el.classList.contains('slot--path') && !el.classList.contains('slot--visited')) return el;
        return null;
    }

    function tryMove(dir) {
        var dest = getDestCell(dir);
        if (!dest) {
            gridEl.classList.add('grid--shake');
            setTimeout(function () { gridEl.classList.remove('grid--shake'); }, 400);
            return;
        }
        moveHistory.push(dir);
        moveKinds.push('manual');
        manualMoveCount++;
        var dr = +dest.dataset.row, dc = +dest.dataset.col;
        snapTo(dr, dc);

        // Trap detection (freeRoam only)
        if (isFreeRoam()) {
            var trap = getTrap(dr, dc);
            if (trap) {
                if (trap.type === 'bad') {
                    isPlaying = false;
                    setTimeout(showWrong, 600);
                    return;
                }
                if (trap.type === 'help') {
                    isPlaying = false;
                    autoBoost(trap.direction, trap.distance);
                    return;
                }
            }
        }
        checkDone();
    }

    function autoBoost(dir, count) {
        var i = 0;
        function step() {
            if (i >= count) {
                isPlaying = true;
                checkDone();
                return;
            }
            var d = getDestCell(dir);
            if (!d) {
                isPlaying = true;
                checkDone();
                return;
            }
            moveHistory.push(dir);
            moveKinds.push('bonus');
            // Tidak increment manualMoveCount — ini bonus gratis
            snapTo(+d.dataset.row, +d.dataset.col);
            i++;
            setTimeout(step, 300);
        }
        setTimeout(step, 400);
    }

    function isOverGrid(x, y) {
        var els = document.elementsFromPoint(x, y);
        for (var i = 0; i < els.length; i++) {
            if (els[i].id === 'eGrid' || (els[i].classList && els[i].classList.contains('slot'))) return true;
        }
        return false;
    }

    function clearHL() {
        if (!gridEl) return;
        var h = gridEl.querySelectorAll('.slot--highlight');
        for (var i = 0; i < h.length; i++) h[i].classList.remove('slot--highlight');
    }

    function findUp(el, cls) {
        while (el && el !== document) {
            if (el.classList && el.classList.contains(cls)) return el;
            el = el.parentElement;
        }
        return null;
    }


    // ── Robot Movement & Trail ──

    function snapTo(r, c) {
        var old = slotEl(robotPos.row, robotPos.col);
        if (old) {
            old.classList.remove('slot--robot');
            old.classList.add('slot--visited');
            if (isFreeRoam()) {
                // Di freeRoam cell bisa kembali bersih kalau nanti robot datang lagi
                old.querySelector('.slot__label').textContent = '';
            } else {
                old.querySelector('.slot__label').textContent = moveHistory.length;
            }
        }
        robotPos = { row: r, col: c };
        var ns = slotEl(r, c);
        if (ns) {
            ns.classList.remove('slot--visited');
            ns.classList.add('slot--robot');
            ns.querySelector('.slot__label').textContent = cfg.robotEmoji;
            ns.classList.add('slot--snap');
            setTimeout(function () { ns.classList.remove('slot--snap'); }, 250);

            var cpKey = r + ',' + c;
            if (ns.dataset.cp && !visitedCheckpoints[cpKey]) {
                visitedCheckpoints[cpKey] = true;
                ns.classList.add('slot--checkpoint-hit');
                playSound('checkpoint');
                playClapFile();
                showCheckpointToast(ns.dataset.cp, 'Berhasil menemukan');
            } else if (ns.classList.contains('slot--goal')) {
                playSound('goal');
                playClapFile();
                showCheckpointToast(stageData.goalEmoji, 'Sampai di');
            } else {
                playSound('step');
            }
        }

        updateMoveCounter();
        updateMoveLog();
        if (onStageUpdate) onStageUpdate(stageIdx, GameConfig.getStageCount(currentLevel));
    }

    function updateMoveCounter() {
        var ctr = canvasEl.querySelector('#moveCount');
        if (!ctr) return;
        if (isFreeRoam()) {
            var mx0 = stageData.maxMoves;
            ctr.textContent = (mx0 - manualMoveCount);
            return;
        }
        if (stageData.obstacles && stageData.obstacles.length > 0) {
            var mx = stageData.maxMoves || stageData.answerKey.length;
            ctr.textContent = (mx - moveHistory.length);
        } else {
            ctr.textContent = moveHistory.length + ' / ' + stageData.answerKey.length;
        }
    }

    function updateMoveLog() {
        var el = canvasEl.querySelector('#moveLog');
        if (!el) return;
        if (moveHistory.length === 0) { el.innerHTML = ''; return; }
        var h = '';
        for (var i = 0; i < moveHistory.length; i++) {
            h += '<span class="move-log__step' + (i === moveHistory.length - 1 ? ' move-log__step--last' : '') + '">'
               + ARROWS[moveHistory[i]].emoji + '</span>';
        }
        el.innerHTML = h;
    }


    // ── Sound (Web Audio API) ──

    function playSound(type) {
        var vol = (typeof window.__sfxVol === 'number') ? window.__sfxVol : 1;
        if (vol <= 0) return;
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var master = ctx.createGain();
            master.gain.value = vol;
            master.connect(ctx.destination);
            var t = ctx.currentTime;

            if (type === 'step') {
                tone(ctx, 880, 0.25, t, 0.08, 'sine');
            } else if (type === 'checkpoint') {
                tone(ctx, 784, 0.4, t, 0.2, 'triangle');
                tone(ctx, 988, 0.4, t + 0.1, 0.2, 'triangle');
                tone(ctx, 1175, 0.45, t + 0.2, 0.35, 'triangle');
            } else if (type === 'goal') {
                tone(ctx, 1047, 0.5, t, 0.15, 'triangle');
                tone(ctx, 1319, 0.5, t + 0.08, 0.15, 'triangle');
                tone(ctx, 1568, 0.55, t + 0.16, 0.2, 'triangle');
                tone(ctx, 2093, 0.6, t + 0.26, 0.6, 'sine');
            } else if (type === 'success') {
                tone(ctx, 523, 0.4, t, 0.12, 'triangle');
                tone(ctx, 659, 0.4, t + 0.08, 0.12, 'triangle');
                tone(ctx, 784, 0.45, t + 0.16, 0.15, 'triangle');
                tone(ctx, 1047, 0.5, t + 0.26, 0.4, 'sine');
                playClapFile();
            } else if (type === 'wrong') {
                tone(ctx, 330, 0.3, t, 0.15, 'sawtooth');
                tone(ctx, 220, 0.25, t + 0.12, 0.3, 'sawtooth');
            }
        } catch (e) {}
    }

    function playClapFile() {
        var vol = (typeof window.__sfxVol === 'number') ? window.__sfxVol : 1;
        if (vol <= 0) return;
        try {
            var a = new Audio('assets/clap hands.m4a');
            a.volume = vol;
            a.play();
        } catch (e) {}
    }

    function tone(ctx, freq, vol, start, dur, wave) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = wave || 'sine';
        osc.frequency.value = freq;
        gain.gain.value = vol;
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur + 0.05);
    }

    function showCheckpointToast(emoji, prefix) {
        var el = document.createElement('div');
        el.className = 'checkpoint-toast';
        el.textContent = (prefix || 'Ketemu') + ' ' + emoji + '!';
        canvasEl.appendChild(el);
        setTimeout(function () { el.classList.add('is-visible'); }, 10);
        setTimeout(function () { el.remove(); }, 2000);
    }


    // ── Validation ──

    function checkDone() {
        // FreeRoam mode: cek posisi robot = goal, semua checkpoint terlewati
        if (isFreeRoam()) {
            var gp = stageData.goalPos;
            var atGoal = (robotPos.row === gp.row && robotPos.col === gp.col);
            var allCpVisited = true;
            if (stageData.checkpoints) {
                for (var k = 0; k < stageData.checkpoints.length; k++) {
                    var cp = stageData.checkpoints[k];
                    if (!visitedCheckpoints[cp.row + ',' + cp.col]) {
                        allCpVisited = false;
                        break;
                    }
                }
            }
            if (atGoal && allCpVisited) {
                isPlaying = false;
                setTimeout(function () { showFeedback(true); }, 400);
                return;
            }
            // Cek batas langkah habis
            var mx2 = stageData.maxMoves;
            if (mx2 && manualMoveCount >= mx2) {
                isPlaying = false;
                setTimeout(showWrong, 300);
            }
            return;
        }

        // Path-based mode (Level 1)
        var key = stageData.answerKey;
        var last = moveHistory.length - 1;

        if (moveHistory[last] !== key[last]) {
            isPlaying = false;
            setTimeout(showWrong, 300);
            return;
        }
        if (moveHistory.length >= key.length) {
            isPlaying = false;
            setTimeout(function () { showFeedback(true); }, 400);
            return;
        }
        var mx = stageData.maxMoves;
        if (mx && moveHistory.length >= mx) {
            isPlaying = false;
            setTimeout(showWrong, 300);
        }
    }


    // ── Story Card ──

    function showStory() {
        var n = stageIdx + 1, tot = GameConfig.getStageCount(currentLevel);
        var audioSrc = 'assets/' + stageData.audio;

        canvasEl.innerHTML =
            '<div class="story-card">'
            + '<span class="story-card__stage">Tahap ' + n + ' / ' + tot + '</span>'
            + '<div class="story-card__emoji">' + stageData.goalEmoji + '</div>'
            + '<h3 class="story-card__title">' + stageData.title + '</h3>'
            + '<p class="story-card__text">' + stageData.story.replace(/\n/g, '<br>') + '</p>'
            + '<audio id="storyAudio" src="' + audioSrc + '" preload="auto"></audio>'
            + '<div class="story-card__btns">'
            + '  <button class="btn btn--play btn--play-yellow" id="btnReady">Siap! \u2794</button>'
            + '  <button class="btn btn--listen" id="btnListen">\uD83D\uDD0A Dengar lagi</button>'
            + '</div></div>';

        var audio = canvasEl.querySelector('#storyAudio');
        var dubVol = (typeof window.__dubVol === 'number') ? window.__dubVol : 1;
        if (audio) audio.volume = Math.min(1, dubVol);
        try { if (audio && dubVol > 0) audio.play(); } catch (e) {}

        var readyHandler = stageData.debugMode ? startDebugPlay : (needsBriefing() ? showBriefing : startPlay);
        canvasEl.querySelector('#btnReady').addEventListener('click', readyHandler);
        canvasEl.querySelector('#btnListen').addEventListener('click', function () {
            if (audio) { audio.currentTime = 0; audio.play(); }
        });
    }

    /** Cek apakah stage butuh briefing (ada jebakan/batu/batas langkah) */
    function needsBriefing() {
        return !!(stageData.obstacles && stageData.obstacles.length) ||
               !!(stageData.traps && stageData.traps.length) ||
               !!stageData.maxMoves;
    }

    /** Popup penjelasan sebelum gameplay untuk stage dengan fitur khusus */
    function showBriefing() {
        var items = '';
        if (stageData.obstacles && stageData.obstacles.length) {
            items += '<li><span class="briefing__icon">\uD83E\uDEA8</span>'
                  +  '<span><strong>Batu</strong> &mdash; tidak bisa dilewati, harus cari jalan lain</span></li>';
        }
        if (stageData.traps) {
            var hasHelp = false, hasBad = false;
            for (var i = 0; i < stageData.traps.length; i++) {
                if (stageData.traps[i].type === 'help') hasHelp = true;
                if (stageData.traps[i].type === 'bad') hasBad = true;
            }
            if (hasHelp) {
                items += '<li><span class="briefing__icon">\uD83E\uDEE7</span>'
                      +  '<span><strong>Gelembung Arus</strong> &mdash; bawa robot meluncur beberapa langkah, hemat langkahmu!</span></li>';
            }
            if (hasBad) {
                items += '<li><span class="briefing__icon">\uD83C\uDF00</span>'
                      +  '<span><strong>Pusaran</strong> &mdash; jangan dilewati! Robot akan tersedot dan harus mulai ulang</span></li>';
            }
        }
        if (stageData.maxMoves) {
            items += '<li><span class="briefing__icon">\uD83D\uDCCF</span>'
                  +  '<span><strong>Batas langkah: ' + stageData.maxMoves + '</strong> &mdash; gunakan dengan bijak!</span></li>';
        }

        canvasEl.innerHTML =
            '<div class="briefing">'
            + '<div class="briefing__header">'
            + '  <span class="briefing__badge">Perhatian!</span>'
            + '  <h3 class="briefing__title">Di peta ini ada:</h3>'
            + '</div>'
            + '<ul class="briefing__list">' + items + '</ul>'
            + '<button class="btn btn--play btn--play-yellow" id="btnBriefingGo">Mulai Petualangan \u2794</button>'
            + '</div>';

        canvasEl.querySelector('#btnBriefingGo').addEventListener('click', startPlay);
    }


    // ── Normal Play Mode ──

    function startPlay() {
        robotPos = { row: stageData.startPos.row, col: stageData.startPos.col };
        moveHistory = [];
        moveKinds = [];
        manualMoveCount = 0;
        visitedCheckpoints = {};
        isPlaying = true;
        var n = stageIdx + 1, tot = GameConfig.getStageCount(currentLevel);
        var freeMode = isFreeRoam();
        var maxMv = stageData.maxMoves || (stageData.answerKey ? stageData.answerKey.length : 0);
        var counterLabel, instruction;
        if (freeMode) {
            counterLabel = 'Sisa: <strong id="moveCount">' + maxMv + '</strong>';
            var tips = '\u26A0\uFE0F Hindari batu \uD83E\uDEA8';
            if (stageData.traps) {
                var hasHelp = false, hasBad = false;
                for (var ti = 0; ti < stageData.traps.length; ti++) {
                    if (stageData.traps[ti].type === 'help') hasHelp = true;
                    if (stageData.traps[ti].type === 'bad') hasBad = true;
                }
                if (hasHelp) tips += ', ambil \u26A1 untuk bantuan';
                if (hasBad) tips += ', jauhi \uD83C\uDF00';
            }
            instruction = tips + '. Sampai ' + stageData.goalEmoji + ' dalam ' + maxMv + ' langkah!';
        } else {
            counterLabel = 'Langkah: <strong id="moveCount">0 / ' + stageData.answerKey.length + '</strong>';
            instruction = '\uD83D\uDCA1 Tarik panah ke arah peta untuk gerakkan robot menuju ' + stageData.goalEmoji;
        }
        var hasObs = freeMode;

        canvasEl.innerHTML =
            '<div class="play-area">'
            + '<div class="play-area__header">'
            + '  <span class="play-area__stage">Tahap ' + n + '/' + tot + ' \u2014 ' + stageData.title + '</span>'
            + '  <span class="play-area__moves">' + counterLabel + '</span>'
            + '</div>'
            + '<div class="play-area__instruction' + (hasObs ? ' play-area__instruction--warn' : '') + '">' + instruction + '</div>'
            + gridHTML()
            + '<div class="move-log" id="moveLog"></div>'
            + arrowToolbarHTML()
            + '<div class="play-area__actions">'
            + '  <button class="btn btn--undo" id="btnUndo">\u21A9\uFE0F Mundur 1</button>'
            + '  <button class="btn btn--reset-stage" id="btnUlangi">\uD83D\uDD04 Ulangi Semua</button>'
            + '</div></div>';

        gridEl = canvasEl.querySelector('#eGrid');
        initDrag();
        canvasEl.querySelector('#btnUndo').addEventListener('click', undoStep);
        canvasEl.querySelector('#btnUlangi').addEventListener('click', resetGrid);
        if (onStageUpdate) onStageUpdate(stageIdx, tot);
    }

    var debugSelectedIdx = -1;

    function startDebugPlay() {
        robotPos = { row: stageData.startPos.row, col: stageData.startPos.col };
        moveHistory = stageData.prefill.slice();
        isPlaying = false;
        var n = stageIdx + 1, tot = GameConfig.getStageCount(currentLevel);

        canvasEl.innerHTML =
            '<div class="play-area">'
            + '<div class="play-area__header">'
            + '  <span class="play-area__stage">Tahap ' + n + '/' + tot + ' \u2014 ' + stageData.title + '</span>'
            + '  <span class="play-area__moves debug-label">\uD83D\uDD27 Tap panah yang salah, lalu pilih panah yang benar</span>'
            + '</div>'
            + gridHTML()
            + '<div class="debug-log" id="debugLog"></div>'
            + debugToolbarHTML()
            + '<div class="play-area__actions">'
            + '  <button class="btn btn--cek" id="btnDebugCek">\u2705 CEK</button>'
            + '  <button class="btn btn--reset-stage" id="btnDebugReset">\uD83D\uDD04 Reset</button>'
            + '</div></div>';

        gridEl = canvasEl.querySelector('#eGrid');
        renderDebugLog();
        bindDebugToolbar();

        canvasEl.querySelector('#btnDebugCek').addEventListener('click', debugCek);
        canvasEl.querySelector('#btnDebugReset').addEventListener('click', function () {
            moveHistory = stageData.prefill.slice();
            debugSelectedIdx = -1;
            renderDebugLog();
            var parent = gridEl.parentElement;
            var tmp = document.createElement('div');
            tmp.innerHTML = gridHTML();
            parent.replaceChild(tmp.firstChild, gridEl);
            gridEl = canvasEl.querySelector('#eGrid');
            var ov = canvasEl.querySelector('#feedbackOverlay');
            if (ov) ov.remove();
        });
        if (onStageUpdate) onStageUpdate(stageIdx, tot);
    }

    function debugToolbarHTML() {
        var dirs = ['left', 'up', 'down', 'right'];
        var h = '<div class="arrow-toolbar" id="debugToolbar"><div class="arrow-toolbar__row">';
        for (var i = 0; i < dirs.length; i++) {
            var d = dirs[i];
            h += '<button class="arrow-btn arrow-btn--tap" data-dir="' + d + '">'
               + '<span class="arrow-btn__emoji">' + ARROWS[d].emoji + '</span>'
               + '<span class="arrow-btn__label">' + ARROWS[d].label + '</span>'
               + '</button>';
        }
        return h + '</div></div>';
    }

    function renderDebugLog() {
        var el = canvasEl.querySelector('#debugLog');
        if (!el) return;
        var h = '';
        for (var i = 0; i < moveHistory.length; i++) {
            var isWrong = (moveHistory[i] !== stageData.answerKey[i]);
            var isSel = (i === debugSelectedIdx);
            h += '<button class="debug-step' + (isSel ? ' debug-step--selected' : '') + (isWrong ? ' debug-step--suspect' : '') + '" data-idx="' + i + '">'
               + '<span class="debug-step__num">' + (i + 1) + '</span>'
               + '<span class="debug-step__arrow">' + ARROWS[moveHistory[i]].emoji + '</span>'
               + '</button>';
        }
        el.innerHTML = h;

        // Re-bind step buttons 
        var steps = el.querySelectorAll('.debug-step');
        for (var j = 0; j < steps.length; j++) {
            steps[j].addEventListener('click', (function (idx) {
                return function () { debugSelectedIdx = idx; renderDebugLog(); };
            })(j));
        }
    }

    // Bind toolbar arrows 
    function bindDebugToolbar() {
        var btns = canvasEl.querySelectorAll('.arrow-btn--tap');
        for (var k = 0; k < btns.length; k++) {
            btns[k].addEventListener('click', (function (btn) {
                return function () {
                    if (debugSelectedIdx < 0) return;
                    moveHistory[debugSelectedIdx] = btn.dataset.dir;
                    playSound('step');
                    renderDebugLog();
                };
            })(btns[k]));
        }
    }

    function debugAutoRecover() {
        var allSlots = gridEl.querySelectorAll('.slot');
        for (var i = 0; i < allSlots.length; i++) {
            allSlots[i].classList.remove('slot--robot', 'slot--visited', 'slot--wrong', 'slot--snap');
            allSlots[i].querySelector('.slot__label').textContent = '';
        }

        // Restore start, goal, checkpoint labels
        var startS = slotEl(stageData.startPos.row, stageData.startPos.col);
        if (startS) { startS.classList.add('slot--robot'); startS.querySelector('.slot__label').textContent = cfg.robotEmoji; }
        var gp = goalPos();
        var goalS = slotEl(gp.row, gp.col);
        if (goalS) goalS.querySelector('.slot__label').textContent = stageData.goalEmoji;
        if (stageData.checkpoints) {
            for (var j = 0; j < stageData.checkpoints.length; j++) {
                var cp = stageData.checkpoints[j];
                var cpS = slotEl(cp.row, cp.col);
                if (cpS) cpS.querySelector('.slot__label').textContent = cp.emoji;
            }
        }
        robotPos = { row: stageData.startPos.row, col: stageData.startPos.col };

        var ov = canvasEl.querySelector('#feedbackOverlay');
        if (ov) ov.remove();

        debugSelectedIdx = -1;
        renderDebugLog();
        showCheckpointToast('\uD83D\uDE0A', 'Masih ada yang salah!');
    }

    function debugCek() {
        isPlaying = false;

        // Clean grid before walk animation
        var allSlots = gridEl.querySelectorAll('.slot');
        for (var i = 0; i < allSlots.length; i++) {
            allSlots[i].classList.remove('slot--robot', 'slot--visited', 'slot--wrong', 'slot--snap');
            allSlots[i].querySelector('.slot__label').textContent = '';
        }

        var startS = slotEl(stageData.startPos.row, stageData.startPos.col);
        if (startS) { startS.classList.add('slot--robot'); startS.querySelector('.slot__label').textContent = cfg.robotEmoji; }
        var gp = goalPos();
        var goalS = slotEl(gp.row, gp.col);
        if (goalS) goalS.querySelector('.slot__label').textContent = stageData.goalEmoji;
        if (stageData.checkpoints) {
            for (var j = 0; j < stageData.checkpoints.length; j++) {
                var cp = stageData.checkpoints[j];
                var cpS = slotEl(cp.row, cp.col);
                if (cpS) cpS.querySelector('.slot__label').textContent = cp.emoji;
            }
        }

        var oldOv = canvasEl.querySelector('#feedbackOverlay');
        if (oldOv) oldOv.remove();

        // Animated walk
        var r = stageData.startPos.row, c = stageData.startPos.col;
        var step = 0;
        var allCorrect = true;

        function walkNext() {
            if (step >= moveHistory.length) {
                setTimeout(function () { showFeedback(allCorrect); }, 300);
                return;
            }

            var dir = moveHistory[step];
            if (!dir) { setTimeout(function () { showFeedback(false); }, 300); return; }
            var correct = (dir === stageData.answerKey[step]);

            var logStep = canvasEl.querySelector('.debug-step[data-idx="' + step + '"]');
            if (logStep) logStep.classList.add(correct ? 'debug-step--ok' : 'debug-step--err');

            var old = slotEl(r, c);
            if (old) { old.classList.remove('slot--robot'); old.classList.add('slot--visited'); old.querySelector('.slot__label').textContent = (step + 1); }

            var nr = r, nc = c;
            switch (dir) { case 'up': nr--; break; case 'down': nr++; break; case 'left': nc--; break; case 'right': nc++; break; }

            // Case Out of bounds = wrong
            if (nr < 0 || nr >= stageData.gridRows || nc < 0 || nc >= stageData.gridCols) {
                allCorrect = false;
                if (old) { old.classList.remove('slot--visited'); old.classList.add('slot--robot', 'slot--wrong'); old.querySelector('.slot__label').textContent = cfg.robotEmoji; }
                setTimeout(function () { showFeedback(false); }, 500);
                return;
            }

            r = nr; c = nc;
            robotPos = { row: r, col: c };

            var ns = slotEl(r, c);
            if (ns) {
                ns.classList.add('slot--robot');
                ns.querySelector('.slot__label').textContent = cfg.robotEmoji;
                ns.classList.add('slot--snap');
                setTimeout(function () { if (ns) ns.classList.remove('slot--snap'); }, 250);
            }

            if (!correct) {
                allCorrect = false;
                if (ns) ns.classList.add('slot--wrong');
                setTimeout(function () { showFeedback(false); }, 500);
                return;
            }

            if (ns && ns.dataset.cp) { playSound('checkpoint'); playClapFile(); showCheckpointToast(ns.dataset.cp, 'Berhasil menemukan'); }
            else if (ns && ns.classList.contains('slot--goal')) { playSound('goal'); playClapFile(); showCheckpointToast(stageData.goalEmoji, 'Sampai di'); }
            else { playSound('step'); }

            step++;
            setTimeout(walkNext, 350);
        }
        walkNext();
    }


    // ── Undo & Reset ──

    function undoStep() {
        if (moveHistory.length === 0) return;

        var ov = canvasEl.querySelector('#feedbackOverlay');
        if (ov) ov.remove();

        // FreeRoam: pop hingga dan termasuk move manual terakhir, lalu rebuild
        if (isFreeRoam()) {
            var poppedManual = false;
            while (moveHistory.length > 0) {
                var kind = moveKinds.pop();
                moveHistory.pop();
                if (kind === 'manual') {
                    manualMoveCount--;
                    poppedManual = true;
                    break;
                }
            }
            if (!poppedManual) return;

            // Rebuild grid dari nol
            var parent = gridEl.parentElement;
            var tmp = document.createElement('div');
            tmp.innerHTML = gridHTML();
            parent.replaceChild(tmp.firstChild, gridEl);
            gridEl = canvasEl.querySelector('#eGrid');

            // Replay moveHistory sisa untuk posisi + checkpoint
            visitedCheckpoints = {};
            var rr = stageData.startPos.row, cc = stageData.startPos.col;
            var startEl = slotEl(rr, cc);
            if (startEl) {
                startEl.classList.remove('slot--robot');
                startEl.querySelector('.slot__label').textContent = '';
            }
            for (var mi = 0; mi < moveHistory.length; mi++) {
                var oldCellEl = slotEl(rr, cc);
                if (oldCellEl) {
                    oldCellEl.classList.add('slot--visited');
                }
                switch (moveHistory[mi]) {
                    case 'up': rr--; break; case 'down': rr++; break;
                    case 'left': cc--; break; case 'right': cc++; break;
                }
                var cpEmojiHere = getCheckpointEmoji(rr, cc);
                if (cpEmojiHere) {
                    visitedCheckpoints[rr + ',' + cc] = true;
                    var cpCellEl = slotEl(rr, cc);
                    if (cpCellEl) cpCellEl.classList.add('slot--checkpoint-hit');
                }
            }
            robotPos = { row: rr, col: cc };
            var finalEl = slotEl(rr, cc);
            if (finalEl) {
                finalEl.classList.remove('slot--visited');
                finalEl.classList.add('slot--robot');
                finalEl.querySelector('.slot__label').textContent = cfg.robotEmoji;
            }
            isPlaying = true;
            updateMoveCounter();
            updateMoveLog();
            return;
        }

        isPlaying = true;

        var cur = slotEl(robotPos.row, robotPos.col);
        if (cur) {
            cur.classList.remove('slot--robot', 'slot--wrong');
            cur.querySelector('.slot__label').textContent = '';
            var g = goalPos();
            if (g && robotPos.row === g.row && robotPos.col === g.col) {
                cur.querySelector('.slot__label').textContent = stageData.goalEmoji;
            }
        }

        moveHistory.pop();
        if (manualMoveCount > 0) manualMoveCount--;

        // Replay from start to find previous position
        var r = stageData.startPos.row, c = stageData.startPos.col;
        for (var i = 0; i < moveHistory.length; i++) {
            switch (moveHistory[i]) {
                case 'up': r--; break; case 'down': r++; break;
                case 'left': c--; break; case 'right': c++; break;
            }
        }
        robotPos = { row: r, col: c };

        var allVisited = gridEl.querySelectorAll('.slot--visited');
        if (allVisited.length > 0) {
            var lastVisited = allVisited[allVisited.length - 1];
            lastVisited.classList.remove('slot--visited');
            lastVisited.querySelector('.slot__label').textContent = '';
        }

        var ns = slotEl(r, c);
        if (ns) {
            ns.classList.remove('slot--visited');
            ns.classList.add('slot--robot');
            ns.querySelector('.slot__label').textContent = cfg.robotEmoji;
        }

        updateMoveCounter();
        updateMoveLog();
    }

    function resetGrid() {
        moveHistory = [];
        moveKinds = [];
        manualMoveCount = 0;
        visitedCheckpoints = {};
        isPlaying = true;
        var parent = gridEl.parentElement;
        var tmp = document.createElement('div');
        tmp.innerHTML = gridHTML();
        parent.replaceChild(tmp.firstChild, gridEl);
        gridEl = canvasEl.querySelector('#eGrid');
        robotPos = { row: stageData.startPos.row, col: stageData.startPos.col };
        updateMoveCounter();
        updateMoveLog();
        var ov = canvasEl.querySelector('#feedbackOverlay');
        if (ov) ov.remove();
    }


    // ── Feedback Overlays ──

    function showWrong() {
        playSound('wrong');
        var rs = slotEl(robotPos.row, robotPos.col);
        if (rs) rs.classList.add('slot--wrong');
        canvasEl.insertAdjacentHTML('beforeend',
            '<div class="feedback-overlay feedback-overlay--wrong" id="feedbackOverlay">'
            + '<div class="feedback-overlay__card">'
            + '  <div class="feedback-overlay__icon">\uD83D\uDE0A</div>'
            + '  <h3 class="feedback-overlay__title">Coba lagi ya!</h3>'
            + '  <p class="feedback-overlay__text">Tidak apa-apa, coba lagi ya!</p>'
            + '  <button class="btn btn--play btn--play-yellow" id="btnRetry">Ulangi \u2794</button>'
            + '</div></div>');
        canvasEl.querySelector('#btnRetry').addEventListener('click', resetGrid);
    }

    function showFeedback(correct) {
        if (!correct) {
            if (stageData.debugMode) {
                playSound('wrong');
                debugAutoRecover();
                return;
            }
            showWrong();
            return;
        }
        playSound('success');
        canvasEl.insertAdjacentHTML('beforeend',
            '<div class="feedback-overlay feedback-overlay--correct" id="feedbackOverlay">'
            + '<div class="feedback-overlay__card">'
            + '  <div class="feedback-overlay__icon">\uD83C\uDF89</div>'
            + '  <h3 class="feedback-overlay__title">Yeay! Berhasil!</h3>'
            + '  <p class="feedback-overlay__text">Kamu mendapat \u2B50 1 bintang!</p>'
            + '  <button class="btn btn--play btn--play-yellow" id="btnNext">Lanjut \u2794</button>'
            + '</div></div>');
        canvasEl.querySelector('#btnNext').addEventListener('click', function () {
            if (onStageComplete) onStageComplete({ level: currentLevel, stageIdx: stageIdx, cleared: true });
        });
    }


    // ── Level Complete ──

    function showLevelComplete(starsEarned) {
        var tot = GameConfig.getStageCount(currentLevel);
        var starStr = '';
        for (var i = 0; i < tot; i++) starStr += i < starsEarned ? '\u2B50' : '\u2606';

        canvasEl.innerHTML =
            '<div class="result">'
            + '<div class="result__icon">\uD83C\uDFC6</div>'
            + '<h2 class="result__title">Hebat!</h2>'
            + '<p class="result__score">Kamu mendapatkan ' + starsEarned + ' bintang!</p>'
            + '<div class="result__stars">' + starStr + '</div>'
            + '<p class="result__text">Mau lanjut mengenal ciptaan Tuhan lainnya?</p>'
            + '<div class="result__actions">'
            + '  <button class="btn btn--result btn--result-primary" id="btnMau">Mau!</button>'
            + '  <button class="btn btn--result btn--result-secondary" id="btnNanti">Nanti dulu</button>'
            + '</div></div>';
    }


    // ── Public API ──

    return {
        startLevel: function (levelNum, canvas, cbs) {
            currentLevel = levelNum;
            stageIdx = 0;
            canvasEl = canvas;
            onStageComplete = cbs.onStageComplete || null;
            onStageUpdate = cbs.onStageUpdate || null;
        },
        startStage: function (idx) {
            // Stop audio dari tahap sebelumnya
            if (canvasEl) {
                var sa = canvasEl.querySelector('#storyAudio');
                if (sa) { sa.pause(); sa.currentTime = 0; }
            }
            stageIdx = idx;
            stageData = GameConfig.getStage(currentLevel, stageIdx);
            if (!stageData) return;
            moveHistory = [];
            isPlaying = false;
            killDrag();
            showStory();
        },
        showLevelComplete: showLevelComplete,
        destroy: function () {
            killDrag();
            if (dragGhost) { dragGhost.remove(); dragGhost = null; }
            // Stop story audio kalau masih jalan
            if (canvasEl) {
                var sa = canvasEl.querySelector('#storyAudio');
                if (sa) { sa.pause(); sa.currentTime = 0; }
            }
            isPlaying = false; isDragging = false; currentLevel = null; stageData = null; moveHistory = [];
        },
        getState: function () {
            return { level: currentLevel, stageIdx: stageIdx, isPlaying: isPlaying };
        },
    };
})();
