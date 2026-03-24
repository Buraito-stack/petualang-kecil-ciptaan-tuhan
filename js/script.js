/* ==========================================================
   script.js — Main Controller
   ==========================================================
   Flow: Opening → Level Select → Stage Select → Game → Back
   Progress: per-stage unlock, 1 tahap = 1 bintang
   ========================================================== */

;(function () {
    'use strict';

    var cfg = GameConfig.SETTINGS;

    var $ = function(s){return document.querySelector(s);};
    var $$ = function(s){return document.querySelectorAll(s);};

    // Screens
    var screenOpening = $('#screenOpening');
    var screenLevels  = $('#screenLevels');
    var screenStages  = $('#screenStages');
    var screenGame    = $('#screenGame');

    // Topbar
    var topbar       = $('#topbar');
    var elTotalStars = $('#totalStars');
    var elCompleted  = $('#completedLevels');
    var progressFill = $('#progressFill');
    var topbarStars  = $$('.topbar__star');

    // Opening
    var btnStart     = $('#btnStart');
    var speechBubble = $('#speechBubble');

    // Levels
    var btnBack       = $('#btnBack');
    var btnReset      = $('#btnReset');
    var cardLevel1    = $('#cardLevel1');
    var cardLevel2    = $('#cardLevel2');
    var lockOverlay2  = $('#lockOverlay2');
    var starsLevel1   = $('#starsLevel1');
    var starsLevel2   = $('#starsLevel2');

    // Stages
    var btnBackToLevels2 = $('#btnBackToLevels2');
    var stagesTitle      = $('#stagesTitle');
    var stagesGrid       = $('#stagesGrid');
    var stagesProgress   = $('#stagesProgressBar');

    // Game
    var btnBackToStages = $('#btnBackToStages');
    var gameLevelInfo    = $('#gameLevelInfo');
    var gameProgressFill = $('#gameProgressFill');
    var gameProgressText = $('#gameProgressText');
    var gameCanvas       = $('#gameCanvas');

    var toastEl = $('#toast');

    // Profile UI — first register
    var firstRegister   = $('#firstRegister');
    var inputNameFirst  = $('#inputNameFirst');
    var btnFirstReg     = $('#btnFirstRegister');

    // Profile UI — top-right button + popup
    var profileBtn      = $('#profileBtn');
    var profileBtnName  = $('#profileBtnName');
    var profilePopup    = $('#profilePopup');
    var profilePopupClose = $('#profilePopupClose');
    var profilePopupList  = $('#profilePopupList');
    var profilePopupNew   = $('#profilePopupNew');
    var profilePopupFull  = $('#profilePopupFull');
    var inputNamePopup    = $('#inputNamePopup');
    var btnAddPopup       = $('#btnAddPopup');

    var activeLevel = null;
    var MAX_PROFILES = 10;
    var PROFILES_KEY = 'petualang_profiles';


    /* ═══════════════════════════
       PROFILES — Multi-user LocalStorage
       ═══════════════════════════
       Format: { profiles: [{name:'Andi', progress:{...}}, ...], activeIdx: 0 }
    */
    function defaultProgress() {
        return {
            level1: { stages: [false,false,false,false,false] },
            level2: { stages: [false,false,false,false,false] }
        };
    }

    function loadProfiles() {
        try {
            var raw = localStorage.getItem(PROFILES_KEY);
            if (raw) {
                var d = JSON.parse(raw);
                if (d && Array.isArray(d.profiles)) return d;
            }
        } catch(_){}

        // Migrate old single-user data if exists
        var oldData = null;
        try {
            var oldRaw = localStorage.getItem(cfg.storageKey);
            if (oldRaw) {
                var parsed = JSON.parse(oldRaw);
                if (parsed.level1 && parsed.level1.stages) oldData = parsed;
                localStorage.removeItem(cfg.storageKey);
            }
        } catch(_){}

        if (oldData) {
            return { profiles: [{ name: 'Petualang', progress: oldData }], activeIdx: 0 };
        }

        return { profiles: [], activeIdx: -1 };
    }

    function saveProfiles(data) {
        localStorage.setItem(PROFILES_KEY, JSON.stringify(data));
    }

    function getActiveProfile() {
        var data = loadProfiles();
        if (data.activeIdx >= 0 && data.activeIdx < data.profiles.length) {
            return data.profiles[data.activeIdx];
        }
        return null;
    }

    function getProgress() {
        var p = getActiveProfile();
        return p ? p.progress : defaultProgress();
    }

    function saveProgress(prog) {
        var data = loadProfiles();
        if (data.activeIdx >= 0 && data.activeIdx < data.profiles.length) {
            data.profiles[data.activeIdx].progress = prog;
            saveProfiles(data);
        }
    }

    function getStars(prog, key) {
        var n=0; for(var i=0;i<prog[key].stages.length;i++) if(prog[key].stages[i]) n++;
        return n;
    }

    function isLevelDone(prog, key) {
        for(var i=0;i<prog[key].stages.length;i++) if(!prog[key].stages[i]) return false;
        return true;
    }


    /* ═══════════════════════════
       PROFILE UI
       ═══════════════════════════
       - Pertama kali: form tengah (firstRegister)
       - Sudah ada profil: tombol kanan atas (profileBtn)
       - Ganti/tambah profil: popup (profilePopup)
    */
    function escHTML(s) {
        var d = document.createElement('div'); d.textContent = s; return d.innerHTML;
    }

    function addNewProfile(name) {
        name = (name || '').trim();
        if (!name) return false;
        if (name.length > 20) name = name.substring(0, 20);
        var data = loadProfiles();
        for (var i = 0; i < data.profiles.length; i++) {
            if (data.profiles[i].name.toLowerCase() === name.toLowerCase()) {
                showToast('Nama sudah ada!'); return false;
            }
        }
        if (data.profiles.length >= MAX_PROFILES) {
            showToast('Daftar petualang penuh!'); return false;
        }
        data.profiles.push({ name: name, progress: defaultProgress() });
        data.activeIdx = data.profiles.length - 1;
        saveProfiles(data);
        return true;
    }

    function selectProfile(idx) {
        var data = loadProfiles();
        data.activeIdx = idx;
        saveProfiles(data);
        syncProfileUI();
        refreshUI();
        closePopup();
        showToast('Halo, ' + data.profiles[idx].name + '!');
    }

    /** Sync semua UI profil berdasarkan state */
    function syncProfileUI() {
        var data = loadProfiles();
        var hasProfiles = data.profiles.length > 0;
        var hasActive = data.activeIdx >= 0 && data.activeIdx < data.profiles.length;

        // First register: tampil hanya kalau belum ada profil sama sekali
        firstRegister.style.display = hasProfiles ? 'none' : '';

        // Start button: tampil kalau sudah ada profil aktif
        btnStart.style.display = hasActive ? '' : 'none';

        // Profile button kanan atas: tampil kalau ada profil
        profileBtn.style.display = hasProfiles ? '' : 'none';
        if (hasActive) {
            profileBtnName.textContent = data.profiles[data.activeIdx].name;
        }
    }

    function deleteProfile(idx) {
        var data = loadProfiles();
        var name = data.profiles[idx].name;
        if (!confirm('Hapus profil "' + name + '" dan semua progressnya?')) return;

        data.profiles.splice(idx, 1);

        // Fix activeIdx
        if (data.profiles.length === 0) {
            data.activeIdx = -1;
        } else if (idx === data.activeIdx) {
            data.activeIdx = 0;
        } else if (idx < data.activeIdx) {
            data.activeIdx--;
        }

        saveProfiles(data);
        syncProfileUI();
        refreshUI();
        renderPopupList();
        showToast('"' + name + '" dihapus');
    }

    function renderPopupList() {
        var data = loadProfiles();
        var profiles = data.profiles;
        profilePopupList.innerHTML = '';

        for (var i = 0; i < profiles.length; i++) {
            var p = profiles[i];
            var stars = getStars(p.progress, 'level1') + getStars(p.progress, 'level2');
            var isActive = (i === data.activeIdx);

            var row = document.createElement('div');
            row.className = 'profile-row';

            var el = document.createElement('button');
            el.className = 'profile-item' + (isActive ? ' profile-item--active' : '');
            el.innerHTML =
                '<span class="profile-item__avatar">\uD83E\uDDD2</span>'
                + '<span class="profile-item__info">'
                + '<strong class="profile-item__name">' + escHTML(p.name) + '</strong>'
                + '<span class="profile-item__stars">\u2B50 ' + stars + '/10</span>'
                + '</span>';
            el.addEventListener('click', (function(idx){ return function(){ selectProfile(idx); }; })(i));

            var del = document.createElement('button');
            del.className = 'profile-del';
            del.innerHTML = '\uD83D\uDDD1';
            del.title = 'Hapus ' + p.name;
            del.addEventListener('click', (function(idx){ return function(e){ e.stopPropagation(); deleteProfile(idx); }; })(i));

            row.appendChild(el);
            row.appendChild(del);
            profilePopupList.appendChild(row);
        }

        if (profiles.length >= MAX_PROFILES) {
            profilePopupNew.style.display = 'none';
            profilePopupFull.style.display = '';
        } else {
            profilePopupNew.style.display = '';
            profilePopupFull.style.display = 'none';
        }
    }

    function openPopup() {
        renderPopupList();
        profilePopup.classList.add('is-active');
    }

    function closePopup() {
        profilePopup.classList.remove('is-active');
    }


    /* ═══════════════════════════
       NAVIGATION
       ═══════════════════════════ */
    function navigateTo(target) {
        var current = $('.screen.active');
        if(!current || current===target) return;

        var show = (target!==screenOpening);
        topbar.classList.toggle('is-visible', show);

        current.classList.add('screen--fade-out');
        current.addEventListener('animationend', function h(){
            current.removeEventListener('animationend',h);
            current.classList.remove('active','screen--fade-out');
            target.classList.add('active','screen--fade-in');
            target.addEventListener('animationend', function h2(){
                target.removeEventListener('animationend',h2);
                target.classList.remove('screen--fade-in');
            });
        });
    }

    function goToOpening() { GameEngine.destroy(); navigateTo(screenOpening); }

    function goToLevels() {
        GameEngine.destroy();
        activeLevel = null;
        refreshUI();
        navigateTo(screenLevels);
    }

    function goToStages(levelNum) {
        activeLevel = levelNum;
        renderStageSelect(levelNum);
        navigateTo(screenStages);
    }

    function goToGame(levelNum, stageIdx) {
        var levelData = GameConfig.getLevel(levelNum);
        gameLevelInfo.textContent = levelData.title;
        var tot = GameConfig.getStageCount(levelNum);
        gameProgressFill.style.width = Math.round(((stageIdx)/tot)*100)+'%';
        gameProgressText.textContent = stageIdx+' / '+tot;

        navigateTo(screenGame);

        setTimeout(function(){
            GameEngine.startLevel(levelNum, gameCanvas, {
                onStageComplete: handleStageComplete,
                onStageUpdate: handleStageUpdate,
            });
            GameEngine.startStage(stageIdx);
        }, 450);
    }


    /* ═══════════════════════════
       STAGE SELECT SCREEN
       ═══════════════════════════ */
    function renderStageSelect(levelNum) {
        var levelData = GameConfig.getLevel(levelNum);
        var prog = getProgress();
        var key = 'level'+levelNum;
        var stages = prog[key].stages;

        stagesTitle.textContent = levelData.title;

        // Progress bar
        var earned = getStars(prog, key);
        stagesProgress.innerHTML =
            '<div class="stages-progress">'
            + Array.from({length:5}, function(_,i){
                return '<span class="stages-progress__star'+(i<earned?' is-earned':'')+'">&#11088;</span>';
            }).join('')
            +'</div>';

        // Stage buttons
        var h = '';
        for (var i = 0; i < levelData.stages.length; i++) {
            var s = levelData.stages[i];
            var done = stages[i];
            var unlocked = (i===0) || stages[i-1]; // tahap 1 selalu buka, sisanya butuh sebelumnya
            var cls = 'stage-btn' + (done?' stage-btn--done':'') + (!unlocked?' stage-btn--locked':'');

            h += '<button class="'+cls+'" data-idx="'+i+'"'+(unlocked?'':' disabled')+'>'
               + '<span class="stage-btn__num">'+(i+1)+'</span>'
               + '<span class="stage-btn__emoji">'+(done?'\u2B50':unlocked?s.goalEmoji:'\uD83D\uDD12')+'</span>'
               + '<span class="stage-btn__title">'+s.title+'</span>'
               + '</button>';
        }
        stagesGrid.innerHTML = h;

        // Bind clicks
        var btns = stagesGrid.querySelectorAll('.stage-btn:not(.stage-btn--locked)');
        for (var j=0;j<btns.length;j++) {
            btns[j].addEventListener('click', function(){
                goToGame(levelNum, +this.dataset.idx);
            });
        }
    }


    /* ═══════════════════════════
       UI REFRESH
       ═══════════════════════════ */
    function refreshUI() {
        var prog = getProgress();
        var s1 = getStars(prog,'level1'), s2 = getStars(prog,'level2');
        var d1 = isLevelDone(prog,'level1'), d2 = isLevelDone(prog,'level2');

        // Level cards stars (show 5 stars now)
        setCardStars(starsLevel1, s1, 5);
        setCardStars(starsLevel2, s2, 5);

        // Level 2 lock
        if(d1) { cardLevel2.classList.remove('is-locked'); lockOverlay2.style.display='none'; }
        else   { cardLevel2.classList.add('is-locked');    lockOverlay2.style.display=''; }

        // Completed badges
        cardLevel1.classList.toggle('is-completed', d1);
        cardLevel2.classList.toggle('is-completed', d2);

        // Topbar
        var total = s1+s2;
        var completed = (d1?1:0)+(d2?1:0);
        elTotalStars.textContent = total;
        elCompleted.textContent = completed;

        var maxStars = cfg.stagesPerLvl * cfg.totalLevels;
        progressFill.style.width = Math.round((total/maxStars)*100)+'%';

        for(var i=0;i<topbarStars.length;i++) {
            topbarStars[i].classList.toggle('is-earned', i<total);
        }
    }

    function setCardStars(container, count, total) {
        // Rebuild stars to match 5
        var h = '';
        for(var i=0;i<total;i++) h += '<span class="star'+(i<count?' is-earned':'')+'">&#11088;</span>';
        container.innerHTML = h;
    }


    /* ═══════════════════════════
       ENGINE CALLBACKS
       ═══════════════════════════ */
    function handleStageComplete(result) {
        var prog = getProgress();
        var key = 'level'+result.level;
        prog[key].stages[result.stageIdx] = true;
        saveProgress(prog);
        refreshUI();

        var tot = GameConfig.getStageCount(result.level);
        var stars = getStars(prog, key);
        var allDone = isLevelDone(prog, key);

        // Update progress bar
        gameProgressFill.style.width = Math.round((stars/tot)*100)+'%';
        gameProgressText.textContent = stars+' / '+tot;

        if(allDone) {
            // Show level complete
            setTimeout(function(){
                GameEngine.showLevelComplete(stars);
                // Bind buttons
                gameCanvas.addEventListener('click', function handler(e){
                    if(e.target.id==='btnMau') {
                        gameCanvas.removeEventListener('click', handler);
                        goToLevels();
                    } else if(e.target.id==='btnNanti') {
                        gameCanvas.removeEventListener('click', handler);
                        goToLevels();
                    }
                });
                if(result.level===1) showToast('Level 2 terbuka!');
            }, 600);
        } else {
            // Auto go to next stage after short delay
            var nextIdx = result.stageIdx + 1;
            // Engine's "Lanjut" button triggers this callback
            // We start the next stage
            setTimeout(function(){
                GameEngine.startStage(nextIdx);
            }, 300);
        }
    }

    function handleStageUpdate(currentStage, totalStages) {
        gameProgressFill.style.width = Math.round((currentStage/totalStages)*100)+'%';
        gameProgressText.textContent = currentStage+' / '+totalStages;
    }


    /* ═══════════════════════════
       SPEECH
       ═══════════════════════════ */
    var speechIdx = 0;
    var lines = GameConfig.SPEECH_LINES;

    function cycleSpeech() {
        setInterval(function(){
            speechIdx = (speechIdx+1)%lines.length;
            speechBubble.style.opacity='0';
            speechBubble.style.transform='translateY(-6px)';
            setTimeout(function(){
                speechBubble.innerHTML = lines[speechIdx];
                speechBubble.style.opacity='1';
                speechBubble.style.transform='translateY(0)';
            },300);
        },6000);
    }


    /* ═══════════════════════════
       TOAST & RESET
       ═══════════════════════════ */
    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('is-visible');
        setTimeout(function(){toastEl.classList.remove('is-visible');},3000);
    }

    function resetProgress() {
        var p = getActiveProfile();
        if(!p) return;
        if(!confirm('Yakin hapus progress ' + p.name + '?')) return;
        var data = loadProfiles();
        data.profiles[data.activeIdx].progress = defaultProgress();
        saveProfiles(data);
        refreshUI();
        showToast('Progress ' + p.name + ' direset!');
    }


    /* ═══════════════════════════
       EVENTS
       ═══════════════════════════ */
    // First register
    btnFirstReg.addEventListener('click', function(){
        if(addNewProfile(inputNameFirst.value)) { syncProfileUI(); refreshUI(); }
    });
    inputNameFirst.addEventListener('keydown', function(e){
        if(e.key==='Enter'&&addNewProfile(inputNameFirst.value)){ syncProfileUI(); refreshUI(); }
    });

    // Profile button + popup
    profileBtn.addEventListener('click', openPopup);
    profilePopupClose.addEventListener('click', closePopup);
    profilePopup.addEventListener('click', function(e){ if(e.target===profilePopup) closePopup(); });
    btnAddPopup.addEventListener('click', function(){
        if(addNewProfile(inputNamePopup.value)){
            inputNamePopup.value=''; syncProfileUI(); refreshUI(); renderPopupList();
        }
    });
    inputNamePopup.addEventListener('keydown', function(e){
        if(e.key==='Enter'&&addNewProfile(inputNamePopup.value)){
            inputNamePopup.value=''; syncProfileUI(); refreshUI(); renderPopupList();
        }
    });

    // Navigation
    btnStart.addEventListener('click', goToLevels);
    btnBack.addEventListener('click', goToOpening);
    btnBackToLevels2.addEventListener('click', goToLevels);
    btnBackToStages.addEventListener('click', function(){ goToStages(activeLevel); });
    btnReset.addEventListener('click', resetProgress);

    cardLevel1.addEventListener('click', function(){ goToStages(1); });
    cardLevel2.addEventListener('click', function(){
        if(!isLevelDone(getProgress(),'level1')) {
            showToast('Selesaikan Level 1 dulu ya!');
            return;
        }
        goToStages(2);
    });

    document.addEventListener('keydown', function(e){
        if(e.key==='Escape') {
            if(screenGame.classList.contains('active')) goToStages(activeLevel);
            else if(screenStages.classList.contains('active')) goToLevels();
            else if(screenLevels.classList.contains('active')) goToOpening();
        }
    });


    /* ═══════════════════════════
       INIT
       ═══════════════════════════ */
    syncProfileUI();
    refreshUI();
    cycleSpeech();

})();
