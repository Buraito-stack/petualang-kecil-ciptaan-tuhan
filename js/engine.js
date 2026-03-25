/* ==========================================================
   engine.js — Drag Robot Langsung di Grid
   ==========================================================
   Mekanik:
   - Grid: path (terang) vs wall (gelap), anak lihat alurnya
   - Drag robot ke slot bertetangga yang ada di jalur
   - Visited slot menampilkan nomor langkah (trail)
   - Story card: teks + "Siap!" + "Dengar lagi" (audio)
   - 1 tahap selesai = 1 bintang
   ========================================================== */

var GameEngine = (function () {
    'use strict';

    var cfg         = GameConfig.SETTINGS;
    var currentLevel = null;
    var stageIdx    = 0;
    var stageData   = null;
    var robotPos    = null;
    var moveHistory = [];
    var pathCells   = null;
    var isPlaying   = false;

    var canvasEl = null;
    var gridEl   = null;

    var onStageComplete = null;
    var onStageUpdate   = null;

    // Drag
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


    /* ═══════════════════════════
       PATH CALC
       ═══════════════════════════ */
    function buildPath() {
        pathCells = {};
        if (!stageData) return;
        var r = stageData.startPos.row, c = stageData.startPos.col;
        pathCells[r+','+c] = true;
        for (var i = 0; i < stageData.answerKey.length; i++) {
            switch(stageData.answerKey[i]) {
                case 'up': r--; break; case 'down': r++; break;
                case 'left': c--; break; case 'right': c++; break;
            }
            pathCells[r+','+c] = true;
        }
    }

    function goalPos() {
        if (!stageData) return null;
        var r = stageData.startPos.row, c = stageData.startPos.col;
        for (var i = 0; i < stageData.answerKey.length; i++) {
            switch(stageData.answerKey[i]) {
                case 'up': r--; break; case 'down': r++; break;
                case 'left': c--; break; case 'right': c++; break;
            }
        }
        return {row:r,col:c};
    }


    /* ═══════════════════════════
       GRID HTML
       ═══════════════════════════ */
    function getCheckpointEmoji(r, c) {
        if (!stageData.checkpoints) return null;
        for (var i = 0; i < stageData.checkpoints.length; i++) {
            var cp = stageData.checkpoints[i];
            if (cp.row === r && cp.col === c) return cp.emoji;
        }
        return null;
    }

    function gridHTML() {
        buildPath();
        var cols = stageData.gridCols, rows = stageData.gridRows, g = goalPos();
        var h = '<div class="grid" id="eGrid" style="grid-template-columns:repeat('+cols+',var(--cell));grid-template-rows:repeat('+rows+',var(--cell));">';
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var isS = (r===stageData.startPos.row && c===stageData.startPos.col);
                var isG = (g && r===g.row && c===g.col);
                var onP = pathCells[r+','+c];
                var cpEmoji = getCheckpointEmoji(r, c);
                var isCp = !!cpEmoji;

                var cls = 'slot'
                    + (onP ? ' slot--path' : ' slot--wall')
                    + (isS ? ' slot--start slot--robot' : '')
                    + (isG ? ' slot--goal' : '')
                    + (isCp ? ' slot--checkpoint' : '');

                var lbl = isS ? cfg.robotEmoji : isG ? stageData.goalEmoji : (cpEmoji || '');

                h += '<div class="'+cls+'" data-row="'+r+'" data-col="'+c+'"'
                   + (cpEmoji ? ' data-cp="'+cpEmoji+'"' : '')
                   + '><span class="slot__label">'+lbl+'</span></div>';
            }
        }
        return h+'</div>';
    }

    function slotEl(r,c) { return gridEl ? gridEl.querySelector('[data-row="'+r+'"][data-col="'+c+'"]') : null; }


    /* ═══════════════════════════
       DRAG ARROW → GRID
       ═══════════════════════════
       Drag panah dari toolbar ke area grid.
       Drop di grid = robot bergerak ke arah panah.
       Klik tanpa drag = diabaikan.
    */
    function arrowToolbarHTML() {
        var dirs = ['left','up','down','right'];
        var h = '<div class="arrow-toolbar" id="arrowToolbar"><div class="arrow-toolbar__row">';
        for (var i = 0; i < dirs.length; i++) {
            var d = dirs[i];
            h += '<div class="arrow-btn" data-dir="'+d+'">'
               + '<span class="arrow-btn__emoji">'+ARROWS[d].emoji+'</span>'
               + '<span class="arrow-btn__label">'+ARROWS[d].label+'</span>'
               + '</div>';
        }
        return h + '</div></div>';
    }

    function initDrag() {
        canvasEl.addEventListener('mousedown', onDown);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        canvasEl.addEventListener('touchstart', onDown, {passive:false});
        document.addEventListener('touchmove', onMove, {passive:false});
        document.addEventListener('touchend', onUp);
    }
    function killDrag() {
        if(!canvasEl) return;
        canvasEl.removeEventListener('mousedown', onDown);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        canvasEl.removeEventListener('touchstart', onDown);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
    }

    function onDown(e) {
        if(!isPlaying) return;
        var btn = findUp(e.target, 'arrow-btn');
        if(!btn) return;
        e.preventDefault();
        isDragging = true;
        dragMoved = false;
        dragDir = btn.dataset.dir;
        var pt = e.touches?e.touches[0]:e;
        dragStartX = pt.clientX;
        dragStartY = pt.clientY;
    }

    function onMove(e) {
        if(!isDragging) return;
        e.preventDefault();
        var pt = e.touches?e.touches[0]:e;

        // Harus geser minimal DRAG_THRESH px baru dianggap drag
        if(!dragMoved) {
            if(Math.hypot(pt.clientX-dragStartX, pt.clientY-dragStartY) < DRAG_THRESH) return;
            dragMoved = true;
            // Buat ghost
            dragGhost = document.createElement('div');
            dragGhost.className = 'drag-ghost';
            dragGhost.textContent = ARROWS[dragDir].emoji;
            dragGhost.style.left = (pt.clientX-30)+'px';
            dragGhost.style.top = (pt.clientY-30)+'px';
            document.body.appendChild(dragGhost);
        }

        if(dragGhost) {
            dragGhost.style.left = (pt.clientX-30)+'px';
            dragGhost.style.top = (pt.clientY-30)+'px';
        }

        // Highlight cell tujuan dari arah ini
        clearHL();
        var dest = getDestCell(dragDir);
        if(dest) dest.classList.add('slot--highlight');
    }

    function onUp(e) {
        if(!isDragging) return;
        isDragging = false;

        // KLIK tanpa drag = abaikan
        if(!dragMoved) { dragDir = null; return; }

        if(dragGhost){dragGhost.remove();dragGhost=null;}
        clearHL();

        // Cek apakah drop di area grid
        var pt = e.changedTouches?e.changedTouches[0]:e;
        var overGrid = isOverGrid(pt.clientX, pt.clientY);

        if(overGrid && dragDir) {
            tryMove(dragDir);
        }
        dragDir = null;
    }

    /** Hitung cell tujuan jika robot bergerak ke arah dir */
    function getDestCell(dir) {
        if(!robotPos || !gridEl) return null;
        var r = robotPos.row, c = robotPos.col;
        switch(dir) {
            case 'up': r--; break; case 'down': r++; break;
            case 'left': c--; break; case 'right': c++; break;
        }
        var el = slotEl(r,c);
        if(el && el.classList.contains('slot--path') && !el.classList.contains('slot--visited')) return el;
        return null;
    }

    /** Coba gerakkan robot ke arah dir */
    function tryMove(dir) {
        var dest = getDestCell(dir);
        if(!dest) {
            // Arah salah — shake grid
            gridEl.classList.add('grid--shake');
            setTimeout(function(){gridEl.classList.remove('grid--shake');},400);
            return;
        }
        var nr = +dest.dataset.row, nc = +dest.dataset.col;
        moveHistory.push(dir);
        snapTo(nr, nc);
        checkDone();
    }

    function isOverGrid(x, y) {
        var els = document.elementsFromPoint(x, y);
        for(var i=0;i<els.length;i++) {
            if(els[i].id === 'eGrid' || (els[i].classList && els[i].classList.contains('slot'))) return true;
        }
        return false;
    }

    function clearHL() {
        if(!gridEl)return;
        var h=gridEl.querySelectorAll('.slot--highlight');
        for(var i=0;i<h.length;i++) h[i].classList.remove('slot--highlight');
    }

    function findUp(el,cls) {
        while(el&&el!==document){if(el.classList&&el.classList.contains(cls))return el;el=el.parentElement;}
        return null;
    }


    /* ═══════════════════════════
       SNAP + TRAIL
       ═══════════════════════════ */
    function snapTo(r,c) {
        var old = slotEl(robotPos.row,robotPos.col);
        if(old){
            old.classList.remove('slot--robot');
            old.classList.add('slot--visited');
            old.querySelector('.slot__label').textContent = moveHistory.length;
        }
        robotPos = {row:r,col:c};
        var ns = slotEl(r,c);
        if(ns){
            ns.classList.add('slot--robot');
            ns.querySelector('.slot__label').textContent = cfg.robotEmoji;
            ns.classList.add('slot--snap');
            setTimeout(function(){ns.classList.remove('slot--snap');},250);

            // Sound: checkpoint > goal > langkah biasa
            if(ns.dataset.cp) {
                ns.classList.add('slot--checkpoint-hit');
                playSound('checkpoint');
                showCheckpointToast(ns.dataset.cp);
            } else if(ns.classList.contains('slot--goal')) {
                playSound('goal');
            } else {
                playSound('step');
            }
        }
        var ctr = canvasEl.querySelector('#moveCount');
        if(ctr) ctr.textContent = moveHistory.length+' / '+stageData.answerKey.length;
        updateMoveLog();
        if(onStageUpdate) onStageUpdate(stageIdx, GameConfig.getStageCount(currentLevel));
    }

    /** Update visual log deretan panah */
    function updateMoveLog() {
        var el = canvasEl.querySelector('#moveLog');
        if(!el) return;
        if(moveHistory.length === 0) { el.innerHTML = ''; return; }
        var h = '';
        for(var i=0; i<moveHistory.length; i++) {
            h += '<span class="move-log__step'+(i===moveHistory.length-1?' move-log__step--last':'')+'">'
               + ARROWS[moveHistory[i]].emoji
               + '</span>';
        }
        el.innerHTML = h;
    }

    /** Sound effects via Web Audio API (tanpa file mp3) */
    function playSound(type) {
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var t = ctx.currentTime;

            if (type === 'step') {
                // Pop ringan
                tone(ctx, 880, 0.25, t, 0.08, 'sine');
            } else if (type === 'checkpoint') {
                // Kling kling! — 3 nada naik cepat
                tone(ctx, 784, 0.4, t, 0.2, 'triangle');
                tone(ctx, 988, 0.4, t+0.1, 0.2, 'triangle');
                tone(ctx, 1175, 0.45, t+0.2, 0.35, 'triangle');
            } else if (type === 'goal') {
                // Kling kling sama kayak checkpoint
                tone(ctx, 784, 0.4, t, 0.2, 'triangle');
                tone(ctx, 988, 0.4, t+0.1, 0.2, 'triangle');
                tone(ctx, 1175, 0.45, t+0.2, 0.35, 'triangle');
            } else if (type === 'success') {
                // Fanfare pendek lalu play file clap hands
                tone(ctx, 523, 0.4, t, 0.12, 'triangle');
                tone(ctx, 659, 0.4, t+0.08, 0.12, 'triangle');
                tone(ctx, 784, 0.45, t+0.16, 0.15, 'triangle');
                tone(ctx, 1047, 0.5, t+0.26, 0.4, 'sine');
                // Play clap hands audio file
                playClapFile();
            } else if (type === 'wrong') {
                // Bwom — nada turun
                tone(ctx, 330, 0.3, t, 0.15, 'sawtooth');
                tone(ctx, 220, 0.25, t+0.12, 0.3, 'sawtooth');
            }
        } catch(e) {}
    }

    function playClapFile() {
        try {
            var a = new Audio('assets/clap hands.m4a');
            a.volume = 1;
            a.play();
        } catch(e) {}
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


    /** Mini toast di atas grid saat checkpoint */
    function showCheckpointToast(emoji) {
        var el = document.createElement('div');
        el.className = 'checkpoint-toast';
        el.textContent = emoji + ' Ketemu!';
        canvasEl.appendChild(el);
        setTimeout(function(){ el.classList.add('is-visible'); }, 10);
        setTimeout(function(){ el.remove(); }, 1500);
    }


    /* ═══════════════════════════
       CHECK DONE
       ═══════════════════════════ */
    function checkDone() {
        var key = stageData.answerKey;
        // Wrong step early
        var last = moveHistory.length-1;
        if(moveHistory[last]!==key[last]) {
            isPlaying = false;
            setTimeout(showWrong,300);
            return;
        }
        // All done
        if(moveHistory.length>=key.length) {
            isPlaying = false;
            setTimeout(function(){ showFeedback(true); },400);
        }
    }


    /* ═══════════════════════════
       STORY CARD + AUDIO
       ═══════════════════════════ */
    function showStory() {
        var n = stageIdx+1, tot = GameConfig.getStageCount(currentLevel);
        var audioSrc = 'assets/audio/'+stageData.audio;

        canvasEl.innerHTML =
            '<div class="story-card">'
            +'<span class="story-card__stage">Tahap '+n+' / '+tot+'</span>'
            +'<div class="story-card__emoji">'+stageData.goalEmoji+'</div>'
            +'<h3 class="story-card__title">'+stageData.title+'</h3>'
            +'<p class="story-card__text">'+stageData.story.replace(/\n/g,'<br>')+'</p>'
            +'<audio id="storyAudio" src="'+audioSrc+'" preload="auto"></audio>'
            +'<div class="story-card__btns">'
            +'  <button class="btn btn--play btn--play-yellow" id="btnReady">Siap! \u2794</button>'
            +'  <button class="btn btn--listen" id="btnListen">\uD83D\uDD0A Dengar lagi</button>'
            +'</div>'
            +'</div>';

        var audio = canvasEl.querySelector('#storyAudio');
        try{if(audio) audio.play();}catch(e){}

        canvasEl.querySelector('#btnReady').addEventListener('click', stageData.debugMode ? startDebugPlay : startPlay);
        canvasEl.querySelector('#btnListen').addEventListener('click', function(){
            if(audio){audio.currentTime=0;audio.play();}
        });
    }


    /* ═══════════════════════════
       PLAY
       ═══════════════════════════ */
    function startPlay() {
        robotPos = {row:stageData.startPos.row,col:stageData.startPos.col};
        moveHistory = []; isPlaying = true;
        var n = stageIdx+1, tot = GameConfig.getStageCount(currentLevel);

        canvasEl.innerHTML =
            '<div class="play-area">'
            +'<div class="play-area__header">'
            +'  <span class="play-area__stage">Tahap '+n+'/'+tot+' \u2014 '+stageData.title+'</span>'
            +'  <span class="play-area__moves">Langkah: <strong id="moveCount">0 / '+stageData.answerKey.length+'</strong></span>'
            +'</div>'
            +''
            +gridHTML()
            +'<div class="move-log" id="moveLog"></div>'
            +arrowToolbarHTML()
            +'<div class="play-area__actions">'
            +'  <button class="btn btn--undo" id="btnUndo">\u21A9\uFE0F Mundur 1</button>'
            +'  <button class="btn btn--reset-stage" id="btnUlangi">\uD83D\uDD04 Ulangi Semua</button>'
            +'</div>'
            +'</div>';

        gridEl = canvasEl.querySelector('#eGrid');
        initDrag();
        canvasEl.querySelector('#btnUndo').addEventListener('click', undoStep);
        canvasEl.querySelector('#btnUlangi').addEventListener('click', resetGrid);
        if(onStageUpdate) onStageUpdate(stageIdx, tot);
    }

    /* ═══════════════════════════
       DEBUG MODE — Perbaiki Jalan
       ═══════════════════════════
       Prefill panah (beberapa salah).
       Anak tap panah di log → tap panah toolbar → ganti.
       Tekan CEK → robot jalan → validasi.
    */
    var debugSelectedIdx = -1;

    function startDebugPlay() {
        robotPos = {row:stageData.startPos.row,col:stageData.startPos.col};
        moveHistory = stageData.prefill.slice();
        isPlaying = false; // drag disabled, pakai tap mode
        var n = stageIdx+1, tot = GameConfig.getStageCount(currentLevel);

        canvasEl.innerHTML =
            '<div class="play-area">'
            +'<div class="play-area__header">'
            +'  <span class="play-area__stage">Tahap '+n+'/'+tot+' \u2014 '+stageData.title+'</span>'
            +'  <span class="play-area__moves debug-label">\uD83D\uDD27 Tap panah yang salah, lalu pilih panah yang benar</span>'
            +'</div>'
            +gridHTML()
            +'<div class="debug-log" id="debugLog"></div>'
            +debugToolbarHTML()
            +'<div class="play-area__actions">'
            +'  <button class="btn btn--cek" id="btnDebugCek">\u2705 CEK</button>'
            +'  <button class="btn btn--reset-stage" id="btnDebugReset">\uD83D\uDD04 Reset</button>'
            +'</div>'
            +'</div>';

        gridEl = canvasEl.querySelector('#eGrid');
        renderDebugLog();
        canvasEl.querySelector('#btnDebugCek').addEventListener('click', debugCek);
        canvasEl.querySelector('#btnDebugReset').addEventListener('click', function(){
            moveHistory = stageData.prefill.slice();
            debugSelectedIdx = -1;
            renderDebugLog();
            // Reset grid
            var parent = gridEl.parentElement;
            var tmp = document.createElement('div');
            tmp.innerHTML = gridHTML();
            parent.replaceChild(tmp.firstChild, gridEl);
            gridEl = canvasEl.querySelector('#eGrid');
            var ov = canvasEl.querySelector('#feedbackOverlay');
            if(ov) ov.remove();
        });
        if(onStageUpdate) onStageUpdate(stageIdx, tot);
    }

    function debugToolbarHTML() {
        var dirs = ['left','up','down','right'];
        var h = '<div class="arrow-toolbar" id="debugToolbar"><div class="arrow-toolbar__row">';
        for (var i = 0; i < dirs.length; i++) {
            var d = dirs[i];
            h += '<button class="arrow-btn arrow-btn--tap" data-dir="'+d+'">'
               + '<span class="arrow-btn__emoji">'+ARROWS[d].emoji+'</span>'
               + '<span class="arrow-btn__label">'+ARROWS[d].label+'</span>'
               + '</button>';
        }
        return h + '</div></div>';
    }

    function renderDebugLog() {
        var el = canvasEl.querySelector('#debugLog');
        if(!el) return;
        var h = '';
        for(var i=0;i<moveHistory.length;i++) {
            var isWrong = (moveHistory[i] !== stageData.answerKey[i]);
            var isSel = (i === debugSelectedIdx);
            h += '<button class="debug-step'+(isSel?' debug-step--selected':'')+(isWrong?' debug-step--suspect':'')+'" data-idx="'+i+'">'
               + '<span class="debug-step__num">'+(i+1)+'</span>'
               + '<span class="debug-step__arrow">'+ARROWS[moveHistory[i]].emoji+'</span>'
               + '</button>';
        }
        el.innerHTML = h;

        // Bind tap on log steps
        var steps = el.querySelectorAll('.debug-step');
        for(var j=0;j<steps.length;j++) {
            steps[j].addEventListener('click', (function(idx){
                return function(){ debugSelectedIdx = idx; renderDebugLog(); };
            })(j));
        }

        // Bind tap on toolbar arrows (replace selected)
        var btns = canvasEl.querySelectorAll('.arrow-btn--tap');
        for(var k=0;k<btns.length;k++) {
            btns[k].addEventListener('click', (function(btn){
                return function(){
                    if(debugSelectedIdx < 0) return;
                    moveHistory[debugSelectedIdx] = btn.dataset.dir;
                    playSound('step');
                    renderDebugLog();
                };
            })(btns[k]));
        }
    }

    function debugCek() {
        // Animate robot walking the plan
        isPlaying = false;
        var r = stageData.startPos.row, c = stageData.startPos.col;
        var step = 0;
        var allCorrect = true;

        function walkNext() {
            if(step >= moveHistory.length) {
                setTimeout(function(){ showFeedback(allCorrect); }, 300);
                return;
            }

            var dir = moveHistory[step];
            var correct = (dir === stageData.answerKey[step]);

            // Mark log step
            var logStep = canvasEl.querySelector('.debug-step[data-idx="'+step+'"]');
            if(logStep) logStep.classList.add(correct ? 'debug-step--ok' : 'debug-step--err');

            // Move robot
            var old = slotEl(r,c);
            if(old){old.classList.remove('slot--robot');old.classList.add('slot--visited');old.querySelector('.slot__label').textContent=(step+1);}

            switch(dir){case'up':r--;break;case'down':r++;break;case'left':c--;break;case'right':c++;break;}
            r=Math.max(0,Math.min(r,stageData.gridRows-1));
            c=Math.max(0,Math.min(c,stageData.gridCols-1));
            robotPos={row:r,col:c};

            var ns = slotEl(r,c);
            if(ns){ns.classList.add('slot--robot');ns.querySelector('.slot__label').textContent=cfg.robotEmoji;ns.classList.add('slot--snap');setTimeout(function(){ns.classList.remove('slot--snap');},250);}

            if(!correct){
                allCorrect = false;
                if(ns) ns.classList.add('slot--wrong');
                setTimeout(function(){ showFeedback(false); }, 500);
                return;
            }

            // Checkpoint sound
            if(ns && ns.dataset.cp){ playSound('checkpoint'); showCheckpointToast(ns.dataset.cp); }
            else if(ns && ns.classList.contains('slot--goal')){ playSound('goal'); }
            else { playSound('step'); }

            step++;
            setTimeout(walkNext, 350);
        }
        walkNext();
    }


    function undoStep() {
        if(moveHistory.length === 0) return;

        // Remove overlay if present (e.g. wrong move feedback)
        var ov = canvasEl.querySelector('#feedbackOverlay');
        if(ov) ov.remove();
        isPlaying = true;

        // Remove robot from current pos
        var cur = slotEl(robotPos.row, robotPos.col);
        if(cur) {
            cur.classList.remove('slot--robot','slot--wrong');
            cur.querySelector('.slot__label').textContent = '';
            // Restore goal emoji if this was the goal
            var g = goalPos();
            if(g && robotPos.row===g.row && robotPos.col===g.col) {
                cur.querySelector('.slot__label').textContent = stageData.goalEmoji;
            }
        }

        // Pop last move
        moveHistory.pop();

        // Find previous position by replaying from start
        var r = stageData.startPos.row, c = stageData.startPos.col;
        for(var i=0; i<moveHistory.length; i++) {
            switch(moveHistory[i]) {
                case 'up': r--; break; case 'down': r++; break;
                case 'left': c--; break; case 'right': c++; break;
            }
        }
        robotPos = {row:r, col:c};

        // Remove visited class from the undone cell (previous robot pos)
        // The cell we just moved back FROM is the one after robotPos
        // We need to clear the last visited marker
        var allVisited = gridEl.querySelectorAll('.slot--visited');
        if(allVisited.length > 0) {
            var lastVisited = allVisited[allVisited.length-1];
            lastVisited.classList.remove('slot--visited');
            lastVisited.querySelector('.slot__label').textContent = '';
        }

        // Place robot at previous position
        var ns = slotEl(r,c);
        if(ns) {
            ns.classList.remove('slot--visited');
            ns.classList.add('slot--robot');
            ns.querySelector('.slot__label').textContent = cfg.robotEmoji;
        }

        var ctr = canvasEl.querySelector('#moveCount');
        if(ctr) ctr.textContent = moveHistory.length+' / '+stageData.answerKey.length;
        updateMoveLog();
    }

    function resetGrid() {
        moveHistory = []; isPlaying = true;
        var parent = gridEl.parentElement;
        var tmp = document.createElement('div');
        tmp.innerHTML = gridHTML();
        parent.replaceChild(tmp.firstChild, gridEl);
        gridEl = canvasEl.querySelector('#eGrid');
        robotPos = {row:stageData.startPos.row,col:stageData.startPos.col};
        var ctr = canvasEl.querySelector('#moveCount');
        if(ctr) ctr.textContent = '0 / '+stageData.answerKey.length;
        updateMoveLog();
        var ov = canvasEl.querySelector('#feedbackOverlay');
        if(ov) ov.remove();
    }


    /* ═══════════════════════════
       FEEDBACK
       ═══════════════════════════ */
    function showWrong() {
        playSound('wrong');
        var rs = slotEl(robotPos.row,robotPos.col);
        if(rs) rs.classList.add('slot--wrong');
        canvasEl.insertAdjacentHTML('beforeend',
            '<div class="feedback-overlay feedback-overlay--wrong" id="feedbackOverlay">'
            +'<div class="feedback-overlay__card">'
            +'  <div class="feedback-overlay__icon">\uD83D\uDE0A</div>'
            +'  <h3 class="feedback-overlay__title">Coba lagi ya!</h3>'
            +'  <p class="feedback-overlay__text">Tidak apa-apa, coba lagi ya!</p>'
            +'  <button class="btn btn--play btn--play-yellow" id="btnRetry">Ulangi \u2794</button>'
            +'</div></div>');
        canvasEl.querySelector('#btnRetry').addEventListener('click', resetGrid);
    }

    function showFeedback(correct) {
        if(!correct){showWrong();return;}
        playSound('success');
        canvasEl.insertAdjacentHTML('beforeend',
            '<div class="feedback-overlay feedback-overlay--correct" id="feedbackOverlay">'
            +'<div class="feedback-overlay__card">'
            +'  <div class="feedback-overlay__icon">\uD83C\uDF89</div>'
            +'  <h3 class="feedback-overlay__title">Yeay! Berhasil!</h3>'
            +'  <p class="feedback-overlay__text">Kamu mendapat \u2B50 1 bintang!</p>'
            +'  <button class="btn btn--play btn--play-yellow" id="btnNext">Lanjut \u2794</button>'
            +'</div></div>');
        canvasEl.querySelector('#btnNext').addEventListener('click', function(){
            if(onStageComplete) onStageComplete({level:currentLevel, stageIdx:stageIdx, cleared:true});
        });
    }


    /* ═══════════════════════════
       LEVEL COMPLETE POPUP
       ═══════════════════════════ */
    function showLevelComplete(starsEarned) {
        var tot = GameConfig.getStageCount(currentLevel);
        var starStr = '';
        for(var i=0;i<tot;i++) starStr += i<starsEarned?'\u2B50':'\u2606';

        canvasEl.innerHTML =
            '<div class="result">'
            +'<div class="result__icon">\uD83C\uDFC6</div>'
            +'<h2 class="result__title">Hebat!</h2>'
            +'<p class="result__score">Kamu mendapatkan '+starsEarned+' bintang!</p>'
            +'<div class="result__stars">'+starStr+'</div>'
            +'<p class="result__text">Mau lanjut mengenal ciptaan Tuhan lainnya?</p>'
            +'<div class="result__actions">'
            +'  <button class="btn btn--result btn--result-primary" id="btnMau">Mau!</button>'
            +'  <button class="btn btn--result btn--result-secondary" id="btnNanti">Nanti dulu</button>'
            +'</div></div>';
    }


    /* ═══════════════════════════
       PUBLIC
       ═══════════════════════════ */
    function startLevel(levelNum, canvas, cbs) {
        currentLevel = levelNum; stageIdx = 0;
        canvasEl = canvas;
        onStageComplete = cbs.onStageComplete || null;
        onStageUpdate   = cbs.onStageUpdate   || null;
    }

    function startStage(idx) {
        stageIdx = idx;
        stageData = GameConfig.getStage(currentLevel, stageIdx);
        if(!stageData) return;
        moveHistory = []; isPlaying = false;
        killDrag();
        showStory();
    }

    function destroy() {
        killDrag();
        if(dragGhost){dragGhost.remove();dragGhost=null;}
        isPlaying=false; isDragging=false; currentLevel=null; stageData=null; moveHistory=[];
    }

    return {
        startLevel: startLevel,
        startStage: startStage,
        showLevelComplete: showLevelComplete,
        destroy: destroy,
        getState: function(){
            return {level:currentLevel,stageIdx:stageIdx,isPlaying:isPlaying};
        },
    };
})();
