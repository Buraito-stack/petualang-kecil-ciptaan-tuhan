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
    var isDragging  = false;
    var dragGhost   = null;
    var dragOffX    = 0;
    var dragOffY    = 0;


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
    function gridHTML() {
        buildPath();
        var cols = stageData.gridCols, rows = stageData.gridRows, g = goalPos();
        var h = '<div class="grid" id="eGrid" style="grid-template-columns:repeat('+cols+',var(--cell));grid-template-rows:repeat('+rows+',var(--cell));">';
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var isS = (r===stageData.startPos.row && c===stageData.startPos.col);
                var isG = (g && r===g.row && c===g.col);
                var onP = pathCells[r+','+c];
                var cls = 'slot' + (onP?' slot--path':' slot--wall') + (isS?' slot--start slot--robot':'') + (isG?' slot--goal':'');
                var lbl = isS ? cfg.robotEmoji : isG ? stageData.goalEmoji : '';
                h += '<div class="'+cls+'" data-row="'+r+'" data-col="'+c+'"><span class="slot__label">'+lbl+'</span></div>';
            }
        }
        return h+'</div>';
    }

    function slotEl(r,c) { return gridEl ? gridEl.querySelector('[data-row="'+r+'"][data-col="'+c+'"]') : null; }


    /* ═══════════════════════════
       DRAG ROBOT ON GRID
       ═══════════════════════════ */
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
        var t = findUp(e.target,'slot--robot');
        if(!t) return;
        e.preventDefault();
        isDragging = true;
        var pt = e.touches?e.touches[0]:e;
        var rect = t.getBoundingClientRect();
        dragOffX = pt.clientX - rect.left;
        dragOffY = pt.clientY - rect.top;
        dragGhost = document.createElement('div');
        dragGhost.className = 'drag-ghost';
        dragGhost.textContent = cfg.robotEmoji;
        dragGhost.style.width = rect.width+'px';
        dragGhost.style.height = rect.height+'px';
        dragGhost.style.left = rect.left+'px';
        dragGhost.style.top = rect.top+'px';
        document.body.appendChild(dragGhost);
        t.classList.add('slot--dragging');
    }

    function onMove(e) {
        if(!isDragging||!dragGhost) return;
        e.preventDefault();
        var pt = e.touches?e.touches[0]:e;
        dragGhost.style.left = (pt.clientX-dragOffX)+'px';
        dragGhost.style.top = (pt.clientY-dragOffY)+'px';
        // Highlight valid adjacent path slot
        clearHL();
        var s = slotAtPt(pt.clientX, pt.clientY);
        if(s && isAdj(s) && s.classList.contains('slot--path') && !s.classList.contains('slot--visited')) {
            s.classList.add('slot--highlight');
        }
    }

    function onUp(e) {
        if(!isDragging) return;
        isDragging = false;
        var pt = e.changedTouches?e.changedTouches[0]:e;
        if(dragGhost){dragGhost.remove();dragGhost=null;}
        var dr = canvasEl.querySelector('.slot--dragging');
        if(dr) dr.classList.remove('slot--dragging');
        clearHL();

        var target = slotAtPt(pt.clientX, pt.clientY);
        if(target && isAdj(target) && target.classList.contains('slot--path') && !target.classList.contains('slot--visited')) {
            var nr = +target.dataset.row, nc = +target.dataset.col;
            var dir = getDir(robotPos, {row:nr,col:nc});
            if(dir) {
                moveHistory.push(dir);
                snapTo(nr,nc);
                checkDone();
            }
        }
    }

    function clearHL() {
        if(!gridEl)return;
        var h=gridEl.querySelectorAll('.slot--highlight');
        for(var i=0;i<h.length;i++) h[i].classList.remove('slot--highlight');
    }
    function slotAtPt(x,y) {
        var els=document.elementsFromPoint(x,y);
        for(var i=0;i<els.length;i++) if(els[i].classList&&els[i].classList.contains('slot'))return els[i];
        return null;
    }
    function isAdj(el) {
        if(!robotPos)return false;
        return (Math.abs(+el.dataset.row-robotPos.row)+Math.abs(+el.dataset.col-robotPos.col))===1;
    }
    function getDir(a,b) {
        var dr=b.row-a.row, dc=b.col-a.col;
        if(dr===-1&&dc===0)return'up'; if(dr===1&&dc===0)return'down';
        if(dr===0&&dc===-1)return'left'; if(dr===0&&dc===1)return'right';
        return null;
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
        }
        // Update counter
        var ctr = canvasEl.querySelector('#moveCount');
        if(ctr) ctr.textContent = moveHistory.length+' / '+stageData.answerKey.length;
        if(onStageUpdate) onStageUpdate(stageIdx, GameConfig.getStageCount(currentLevel));
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

        canvasEl.querySelector('#btnReady').addEventListener('click', startPlay);
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

        // Update counter
        var ctr = canvasEl.querySelector('#moveCount');
        if(ctr) ctr.textContent = moveHistory.length+' / '+stageData.answerKey.length;
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
        var ov = canvasEl.querySelector('#feedbackOverlay');
        if(ov) ov.remove();
    }


    /* ═══════════════════════════
       FEEDBACK
       ═══════════════════════════ */
    function showWrong() {
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
