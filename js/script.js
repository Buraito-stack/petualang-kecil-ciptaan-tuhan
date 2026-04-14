/**
 * script.js
 * Main controller: navigation, profiles, progress, BGM, guide.
 * Flow: Opening → Level Select → Stage Select → Game
 */
;(function () {
    'use strict';

    var cfg = GameConfig.SETTINGS;

    var $ = function (s) { return document.querySelector(s); };
    var $$ = function (s) { return document.querySelectorAll(s); };

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
    var btnBackToStages  = $('#btnBackToStages');
    var gameLevelInfo    = $('#gameLevelInfo');
    var gameProgressFill = $('#gameProgressFill');
    var gameProgressText = $('#gameProgressText');
    var gameCanvas       = $('#gameCanvas');

    var toastEl = $('#toast');

    // Profile: first register
    var firstRegister  = $('#firstRegister');
    var inputNameFirst = $('#inputNameFirst');
    var btnFirstReg    = $('#btnFirstRegister');

    // Profile: popup
    var profileBtn        = $('#profileBtn');
    var profileBtnName    = $('#profileBtnName');
    var profilePopup      = $('#profilePopup');
    var profilePopupClose = $('#profilePopupClose');
    var profilePopupList  = $('#profilePopupList');
    var profilePopupNew   = $('#profilePopupNew');
    var profilePopupFull  = $('#profilePopupFull');
    var inputNamePopup    = $('#inputNamePopup');
    var btnAddPopup       = $('#btnAddPopup');

    var activeLevel  = null;
    var MAX_PROFILES = 15;
    var PROFILES_KEY = 'petualang_profiles';
    var NAV_KEY      = 'petualang_nav';


    // ── Navigation state persistence ──

    function saveNav(screen, level, stageIdx) {
        try {
            localStorage.setItem(NAV_KEY, JSON.stringify({ s: screen, l: level || null, t: stageIdx || null }));
        } catch (e) {}
    }

    function loadNav() {
        try {
            var r = localStorage.getItem(NAV_KEY);
            return r ? JSON.parse(r) : null;
        } catch (e) { return null; }
    }


    // ── Profile & Progress Storage ──

    function defaultProgress() {
        return {
            level1: { stages: [false, false, false, false, false] },
            level2: { stages: [false, false, false, false, false] }
        };
    }

    function loadProfiles() {
        try {
            var raw = localStorage.getItem(PROFILES_KEY);
            if (raw) {
                var d = JSON.parse(raw);
                if (d && Array.isArray(d.profiles)) return d;
            }
        } catch (e) {}

        // Migrate old single-user format
        var oldData = null;
        try {
            var oldRaw = localStorage.getItem(cfg.storageKey);
            if (oldRaw) {
                var parsed = JSON.parse(oldRaw);
                if (parsed.level1 && parsed.level1.stages) oldData = parsed;
                localStorage.removeItem(cfg.storageKey);
            }
        } catch (e) {}

        if (oldData) {
            return { profiles: [{ name: 'Petualang', progress: oldData }], activeIdx: 0 };
        }
        return { profiles: [], activeIdx: -1 };
    }

    function saveProfiles(data) { localStorage.setItem(PROFILES_KEY, JSON.stringify(data)); }

    function getActiveProfile() {
        var data = loadProfiles();
        if (data.activeIdx >= 0 && data.activeIdx < data.profiles.length) return data.profiles[data.activeIdx];
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
        var n = 0;
        for (var i = 0; i < prog[key].stages.length; i++) if (prog[key].stages[i]) n++;
        return n;
    }

    function isLevelDone(prog, key) {
        for (var i = 0; i < prog[key].stages.length; i++) if (!prog[key].stages[i]) return false;
        return true;
    }


    // ── Profile UI ──

    function escHTML(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function addNewProfile(name) {
        name = (name || '').trim();
        if (!name) return false;
        if (name.length > 20) name = name.substring(0, 20);

        var data = loadProfiles();
        for (var i = 0; i < data.profiles.length; i++) {
            if (data.profiles[i].name.toLowerCase() === name.toLowerCase()) {
                showToast('Nama sudah ada!');
                return false;
            }
        }
        if (data.profiles.length >= MAX_PROFILES) {
            showToast('Daftar petualang penuh!');
            return false;
        }

        data.profiles.push({ name: name, progress: defaultProgress(), guideSeen: false });
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

    function syncProfileUI() {
        var data = loadProfiles();
        var hasProfiles = data.profiles.length > 0;
        var hasActive = data.activeIdx >= 0 && data.activeIdx < data.profiles.length;

        firstRegister.style.display = hasProfiles ? 'none' : '';
        btnStart.style.display = hasActive ? '' : 'none';
        profileBtn.style.display = hasProfiles ? '' : 'none';

        if (hasActive) {
            var p = data.profiles[data.activeIdx];
            profileBtnName.textContent = p.name;

            // Show guide for first-time users
            if (!p.guideSeen) {
                setTimeout(function () { guideOverlay.classList.add('is-active'); }, 400);
                p.guideSeen = true;
                saveProfiles(data);
            }
        }
    }

    function deleteProfile(idx) {
        var data = loadProfiles();
        var name = data.profiles[idx].name;
        if (!confirm('Hapus profil "' + name + '" dan semua progressnya?')) return;

        data.profiles.splice(idx, 1);
        if (data.profiles.length === 0) data.activeIdx = -1;
        else if (idx === data.activeIdx) data.activeIdx = 0;
        else if (idx < data.activeIdx) data.activeIdx--;

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
            el.addEventListener('click', (function (idx) { return function () { selectProfile(idx); }; })(i));

            var del = document.createElement('button');
            del.className = 'profile-del';
            del.innerHTML = '\uD83D\uDDD1';
            del.title = 'Hapus ' + p.name;
            del.addEventListener('click', (function (idx) { return function (e) { e.stopPropagation(); deleteProfile(idx); }; })(i));

            row.appendChild(el);
            row.appendChild(del);
            profilePopupList.appendChild(row);
        }

        profilePopupNew.style.display = profiles.length >= MAX_PROFILES ? 'none' : '';
        profilePopupFull.style.display = profiles.length >= MAX_PROFILES ? '' : 'none';
    }

    function openPopup() { renderPopupList(); profilePopup.classList.add('is-active'); }
    function closePopup() { profilePopup.classList.remove('is-active'); }


    // ── Screen Navigation ──

    function navigateTo(target) {
        var current = $('.screen.active');
        if (!current || current === target) return;

        topbar.classList.toggle('is-visible', target !== screenOpening);

        current.classList.add('screen--fade-out');
        current.addEventListener('animationend', function h() {
            current.removeEventListener('animationend', h);
            current.classList.remove('active', 'screen--fade-out');
            target.classList.add('active', 'screen--fade-in');
            target.addEventListener('animationend', function h2() {
                target.removeEventListener('animationend', h2);
                target.classList.remove('screen--fade-in');
            });
        });
    }

    function goToOpening() {
        GameEngine.destroy();
        stopLevelAudio();
        saveNav('opening');
        navigateTo(screenOpening);
        playOpeningAudio();
    }

    function goToLevels() {
        GameEngine.destroy();
        stopOpeningAudio();
        stopLevelAudio();
        activeLevel = null;
        refreshUI();
        saveNav('levels');
        navigateTo(screenLevels);
    }

    function goToStages(levelNum) {
        activeLevel = levelNum;
        stopOpeningAudio();
        renderStageSelect(levelNum);
        saveNav('stages', levelNum);
        navigateTo(screenStages);
        playLevelAudio(levelNum);
    }

    function goToGame(levelNum, stageIdx) {
        stopLevelAudio();
        var levelData = GameConfig.getLevel(levelNum);
        gameLevelInfo.textContent = levelData.title;
        var tot = GameConfig.getStageCount(levelNum);
        gameProgressFill.style.width = Math.round((stageIdx / tot) * 100) + '%';
        gameProgressText.textContent = stageIdx + ' / ' + tot;

        saveNav('game', levelNum, stageIdx);
        navigateTo(screenGame);

        setTimeout(function () {
            GameEngine.startLevel(levelNum, gameCanvas, {
                onStageComplete: handleStageComplete,
                onStageUpdate: handleStageUpdate,
            });
            GameEngine.startStage(stageIdx);
        }, 450);
    }


    // ── Stage Select ──

    function renderStageSelect(levelNum) {
        var levelData = GameConfig.getLevel(levelNum);
        var prog = getProgress();
        var key = 'level' + levelNum;
        var stages = prog[key].stages;

        stagesTitle.textContent = levelData.title;

        var earned = getStars(prog, key);
        stagesProgress.innerHTML =
            '<div class="stages-progress">'
            + Array.from({ length: 5 }, function (_, i) {
                return '<span class="stages-progress__star' + (i < earned ? ' is-earned' : '') + '">&#11088;</span>';
            }).join('')
            + '</div>';

        var h = '';
        for (var i = 0; i < levelData.stages.length; i++) {
            var s = levelData.stages[i];
            var done = stages[i];
            var unlocked = (i === 0) || stages[i - 1];
            var cls = 'stage-btn' + (done ? ' stage-btn--done' : '') + (!unlocked ? ' stage-btn--locked' : '');

            h += '<button class="' + cls + '" data-idx="' + i + '"' + (unlocked ? '' : ' disabled') + '>'
               + '<span class="stage-btn__num">' + (i + 1) + '</span>'
               + '<span class="stage-btn__emoji">' + (done ? '\u2B50' : unlocked ? s.goalEmoji : '\uD83D\uDD12') + '</span>'
               + '<span class="stage-btn__title">' + s.title + '</span>'
               + '</button>';
        }
        stagesGrid.innerHTML = h;

        var btns = stagesGrid.querySelectorAll('.stage-btn:not(.stage-btn--locked)');
        for (var j = 0; j < btns.length; j++) {
            btns[j].addEventListener('click', function () {
                goToGame(levelNum, +this.dataset.idx);
            });
        }
    }


    // ── UI Refresh ──

    function refreshUI() {
        var prog = getProgress();
        var s1 = getStars(prog, 'level1'), s2 = getStars(prog, 'level2');
        var d1 = isLevelDone(prog, 'level1'), d2 = isLevelDone(prog, 'level2');

        setCardStars(starsLevel1, s1, 5);
        setCardStars(starsLevel2, s2, 5);

        if (d1) { cardLevel2.classList.remove('is-locked'); lockOverlay2.style.display = 'none'; }
        else    { cardLevel2.classList.add('is-locked');    lockOverlay2.style.display = ''; }

        cardLevel1.classList.toggle('is-completed', d1);
        cardLevel2.classList.toggle('is-completed', d2);

        var total = s1 + s2;
        var completed = (d1 ? 1 : 0) + (d2 ? 1 : 0);
        elTotalStars.textContent = total;
        elCompleted.textContent = completed;

        var maxStars = cfg.stagesPerLvl * cfg.totalLevels;
        progressFill.style.width = Math.round((total / maxStars) * 100) + '%';

        for (var i = 0; i < topbarStars.length; i++) {
            topbarStars[i].classList.toggle('is-earned', i < total);
        }
    }

    function setCardStars(container, count, total) {
        var h = '';
        for (var i = 0; i < total; i++) h += '<span class="star' + (i < count ? ' is-earned' : '') + '">&#11088;</span>';
        container.innerHTML = h;
    }


    // ── Engine Callbacks ──

    function handleStageComplete(result) {
        var prog = getProgress();
        var key = 'level' + result.level;
        prog[key].stages[result.stageIdx] = true;
        saveProgress(prog);
        refreshUI();

        var tot = GameConfig.getStageCount(result.level);
        var stars = getStars(prog, key);
        var allDone = isLevelDone(prog, key);

        gameProgressFill.style.width = Math.round((stars / tot) * 100) + '%';
        gameProgressText.textContent = stars + ' / ' + tot;

        if (allDone) {
            setTimeout(function () {
                GameEngine.showLevelComplete(stars);
                playLevelCompleteAudio();
                gameCanvas.addEventListener('click', function handler(e) {
                    if (e.target.id === 'btnMau' || e.target.id === 'btnNanti') {
                        gameCanvas.removeEventListener('click', handler);
                        stopLevelCompleteAudio();
                        goToLevels();
                    }
                });
                if (result.level === 1) showToast('Level 2 terbuka!');
            }, 600);
        } else {
            var nextIdx = result.stageIdx + 1;
            setTimeout(function () { GameEngine.startStage(nextIdx); }, 300);
        }
    }

    function handleStageUpdate(currentStage, totalStages) {
        gameProgressFill.style.width = Math.round((currentStage / totalStages) * 100) + '%';
        gameProgressText.textContent = currentStage + ' / ' + totalStages;
    }


    // ── Speech Bubble Cycle ──

    var speechIdx = 0;
    var lines = GameConfig.SPEECH_LINES;

    // Dubbing audio elements
    var openingAudio = $('#dubOpening');
    var levelAudios = {
        1: $('#dubLevel1'),
        2: $('#dubLevel2'),
    };

    function getDubVolValue() {
        if (!audioSettings.dubOn) return 0;
        return Math.min(1, audioSettings.dubVol / 100);
    }

    function playOpeningAudio() {
        try {
            openingAudio.volume = getDubVolValue();
            openingAudio.currentTime = 0;
            openingAudio.play().catch(function () {});
        } catch (e) {}
    }

    function stopOpeningAudio() {
        try { openingAudio.pause(); openingAudio.currentTime = 0; } catch (e) {}
    }

    function playLevelAudio(num) {
        for (var k in levelAudios) { try { levelAudios[k].pause(); levelAudios[k].currentTime = 0; } catch (e) {} }
        try {
            if (levelAudios[num]) {
                levelAudios[num].volume = getDubVolValue();
                levelAudios[num].currentTime = 0;
                levelAudios[num].play().catch(function () {});
            }
        } catch (e) {}
    }

    function stopLevelAudio() {
        for (var k in levelAudios) { try { levelAudios[k].pause(); levelAudios[k].currentTime = 0; } catch (e) {} }
    }

    var levelCompleteAudio = null;
    function playLevelCompleteAudio() {
        try {
            if (levelCompleteAudio) { levelCompleteAudio.pause(); levelCompleteAudio = null; }
            levelCompleteAudio = new Audio('assets/Dubbing/Level Complete - Maricel.mp3');
            levelCompleteAudio.volume = getDubVolValue();
            levelCompleteAudio.play().catch(function () {});
        } catch (e) {}
    }
    function stopLevelCompleteAudio() {
        try { if (levelCompleteAudio) { levelCompleteAudio.pause(); levelCompleteAudio = null; } } catch (e) {}
    }

    function cycleSpeech() {
        setInterval(function () {
            speechIdx = (speechIdx + 1) % lines.length;
            speechBubble.style.opacity = '0';
            speechBubble.style.transform = 'translateY(-6px)';
            setTimeout(function () {
                speechBubble.innerHTML = lines[speechIdx];
                speechBubble.style.opacity = '1';
                speechBubble.style.transform = 'translateY(0)';
            }, 300);
        }, 6000);
    }


    // ── Toast ──

    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('is-visible');
        setTimeout(function () { toastEl.classList.remove('is-visible'); }, 3000);
    }


    // ── Audio Settings ──

    var bgmAudio = $('#bgmAudio');
    var bgmBtn   = $('#bgmBtn');
    var bgmIcon  = $('#bgmIcon');

    var audioPopup      = $('#audioPopup');
    var audioPopupClose = $('#audioPopupClose');
    var chkBgm   = $('#audioBgmOn');
    var rngBgm   = $('#audioBgmVol');
    var chkDub   = $('#audioDubOn');
    var rngDub   = $('#audioDubVol');
    var chkSfx   = $('#audioSfxOn');
    var rngSfx   = $('#audioSfxVol');

    var AUDIO_KEY = 'petualang_audio';

    // Default settings
    var audioSettings = { bgmOn: true, bgmVol: 36, dubOn: true, dubVol: 100, sfxOn: true, sfxVol: 100 };

    // Load saved
    try {
        var saved = localStorage.getItem(AUDIO_KEY);
        if (saved) {
            var parsed = JSON.parse(saved);
            for (var k in parsed) if (audioSettings.hasOwnProperty(k)) audioSettings[k] = parsed[k];
        }
    } catch (e) {}

    function saveAudioSettings() {
        try { localStorage.setItem(AUDIO_KEY, JSON.stringify(audioSettings)); } catch (e) {}
    }

    function applyAudio() {
        // BGM
        bgmAudio.volume = audioSettings.bgmOn ? Math.min(1, audioSettings.bgmVol / 100) : 0;
        if (audioSettings.bgmOn) bgmAudio.play().catch(function () {});
        else bgmAudio.pause();
        bgmIcon.textContent = audioSettings.bgmOn ? '\uD83C\uDFB5' : '\uD83D\uDD07';
        bgmBtn.classList.toggle('bgm-btn--on', audioSettings.bgmOn);

        // Dub volume
        var dubVol = getDubVolValue();
        openingAudio.volume = dubVol;
        for (var lk in levelAudios) levelAudios[lk].volume = dubVol;

        // Expose ke engine
        window.__sfxVol = audioSettings.sfxOn ? audioSettings.sfxVol / 100 : 0;
        window.__dubVol = dubVol;

        // Sync popup controls
        chkBgm.checked = audioSettings.bgmOn;
        rngBgm.value = audioSettings.bgmVol;
        chkDub.checked = audioSettings.dubOn;
        rngDub.value = audioSettings.dubVol;
        chkSfx.checked = audioSettings.sfxOn;
        rngSfx.value = audioSettings.sfxVol;
    }

    // BGM button → open popup
    bgmBtn.addEventListener('click', function () {
        applyAudio();
        renderDubList();
        audioPopup.classList.add('is-active');
    });
    audioPopupClose.addEventListener('click', function () { stopActiveDub(); audioPopup.classList.remove('is-active'); });
    audioPopup.addEventListener('click', function (e) { if (e.target === audioPopup) { stopActiveDub(); audioPopup.classList.remove('is-active'); } });

    // Popup controls
    chkBgm.addEventListener('change', function () { audioSettings.bgmOn = this.checked; saveAudioSettings(); applyAudio(); });
    rngBgm.addEventListener('input', function () { audioSettings.bgmVol = +this.value; saveAudioSettings(); applyAudio(); });
    chkDub.addEventListener('change', function () { audioSettings.dubOn = this.checked; saveAudioSettings(); applyAudio(); });
    rngDub.addEventListener('input', function () { audioSettings.dubVol = +this.value; saveAudioSettings(); applyAudio(); });
    chkSfx.addEventListener('change', function () { audioSettings.sfxOn = this.checked; saveAudioSettings(); applyAudio(); });
    rngSfx.addEventListener('input', function () { audioSettings.sfxVol = +this.value; saveAudioSettings(); applyAudio(); });

    // Dub check list
    var DUB_FILES = [
        { name: 'Opening', file: 'Page 1 - Maricel.wav' },
        { name: 'Level 1 Intro', file: 'Level 1 Maricel.wav' },
        { name: 'Level 2 Intro', file: 'Level 2 Maricel.wav' },
        { name: 'Matahari', file: 'Tahap 1 - Matahari.wav' },
        { name: 'Bulan', file: 'Tahap 2 - Bulan.wav' },
        { name: 'Bintang', file: 'Tahap 3 - Bintang.wav' },
        { name: 'Perbaiki Jalan (L1)', file: 'Tahap 4 - Perbaiki Jalan.wav' },
        { name: 'Semua Penerang', file: 'Tahap 5 - Semua Benda Penerang.wav' },
        { name: 'Air', file: 'Tahap 1 - Air.wav' },
        { name: 'Sungai', file: 'Tahap 2 - Sungai.wav' },
        { name: 'Laut', file: 'Tahap 3 - Laut.wav' },
        { name: 'Perbaiki Jalan (L2)', file: 'Tahap 4 - Perbaiki Jalan v2.mp4' },
        { name: 'Semua Air', file: 'Tahap 5 - Kunjungi Semua.wav' },
        { name: 'Briefing Level 2', file: 'Briefing Level 2.mp4' },
        { name: 'Level Complete', file: 'Level Complete - Maricel.mp3' },
    ];

    var dubListEl = $('#dubList');
    var activeDubAudio = null;
    var activeDubBtn = null;

    function stopActiveDub() {
        if (activeDubAudio) { activeDubAudio.pause(); activeDubAudio.currentTime = 0; activeDubAudio = null; }
        if (activeDubBtn) { activeDubBtn.classList.remove('is-playing'); activeDubBtn.textContent = '\u25B6'; activeDubBtn = null; }
    }

    // Load per-file volumes
    var DUB_VOL_KEY = 'petualang_dubvols';
    var dubVols = {};
    try { var dv = localStorage.getItem(DUB_VOL_KEY); if (dv) dubVols = JSON.parse(dv); } catch (e) {}

    function saveDubVols() {
        try { localStorage.setItem(DUB_VOL_KEY, JSON.stringify(dubVols)); } catch (e) {}
    }

    function getDubVol(idx) {
        return dubVols[idx] !== undefined ? dubVols[idx] : 100;
    }

    function renderDubList() {
        var h = '';
        for (var i = 0; i < DUB_FILES.length; i++) {
            var vol = getDubVol(i);
            h += '<div class="dub-item">'
               + '<button class="dub-item__play" data-idx="' + i + '">\u25B6</button>'
               + '<span class="dub-item__name">' + DUB_FILES[i].name + '</span>'
               + '<span class="dub-item__status" id="dubStatus' + i + '">...</span>'
               + '</div>'
               + '<input type="range" class="dub-item__vol" data-idx="' + i + '" min="0" max="100" value="' + vol + '">';
        }
        dubListEl.innerHTML = h;

        var btns = dubListEl.querySelectorAll('.dub-item__play');
        for (var j = 0; j < btns.length; j++) {
            btns[j].addEventListener('click', (function (idx) {
                return function () { toggleDubPlay(idx, this); };
            })(j));
        }

        // Bind per-file volume sliders
        var sliders = dubListEl.querySelectorAll('.dub-item__vol');
        for (var s = 0; s < sliders.length; s++) {
            sliders[s].addEventListener('input', (function (idx) {
                return function () {
                    dubVols[idx] = +this.value;
                    saveDubVols();
                    if (activeDubAudio && activeDubBtn && +activeDubBtn.dataset.idx === idx) {
                        activeDubAudio.volume = Math.min(1, calcDubVol(idx));
                    }
                };
            })(+sliders[s].dataset.idx));
        }

        // Check semua file exist
        for (var k = 0; k < DUB_FILES.length; k++) {
            checkDubFile(k);
        }
    }

    function checkDubFile(idx) {
        var statusEl = $('#dubStatus' + idx);
        var audio = new Audio();
        audio.addEventListener('canplaythrough', function () {
            statusEl.textContent = '\u2713';
            statusEl.className = 'dub-item__status ok';
        });
        audio.addEventListener('error', function () {
            statusEl.textContent = '\u2717';
            statusEl.className = 'dub-item__status err';
        });
        audio.src = 'assets/Dubbing/' + DUB_FILES[idx].file;
    }

    // Overall dub vol * per-file vol
    function calcDubVol(idx) {
        var overall = audioSettings.dubOn ? audioSettings.dubVol / 100 : 0;
        var perFile = getDubVol(idx) / 100;
        return overall * perFile;
    }

    function toggleDubPlay(idx, btn) {
        if (activeDubBtn === btn) { stopActiveDub(); return; }
        stopActiveDub();

        activeDubAudio = new Audio('assets/Dubbing/' + DUB_FILES[idx].file);
        activeDubAudio.volume = Math.min(1, calcDubVol(idx));
        activeDubAudio.play().catch(function () {});
        activeDubBtn = btn;
        btn.classList.add('is-playing');
        btn.textContent = '\u23F9';
        activeDubAudio.addEventListener('ended', function () { stopActiveDub(); });
    }


    applyAudio();

    // Mobile: unlock audio on first user interaction
    var audioUnlocked = false;
    function unlockAudio() {
        if (audioUnlocked) return;
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var buf = ctx.createBuffer(1, 1, 22050);
            var src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start(0);
        } catch (e) {}

        if (audioSettings.bgmOn && bgmAudio.paused) {
            bgmAudio.play().then(function () {
                audioUnlocked = true;
                removeUnlockListeners();
            }).catch(function () {});
        } else {
            audioUnlocked = true;
            removeUnlockListeners();
        }
    }

    function removeUnlockListeners() {
        ['click', 'touchstart', 'touchend', 'keydown'].forEach(function (e) {
            document.removeEventListener(e, unlockAudio, true);
        });
    }
    ['click', 'touchstart', 'touchend', 'keydown'].forEach(function (e) {
        document.addEventListener(e, unlockAudio, true);
    });


    // ── Reset Progress ──

    function resetProgress() {
        var p = getActiveProfile();
        if (!p) return;
        if (!confirm('Yakin hapus progress ' + p.name + '?')) return;
        var data = loadProfiles();
        data.profiles[data.activeIdx].progress = defaultProgress();
        saveProfiles(data);
        refreshUI();
        showToast('Progress ' + p.name + ' direset!');
    }


    // ── Guide Overlay ──

    var guideOverlay = $('#guideOverlay');
    var btnGuideOpen = $('#btnGuideOpen');

    btnGuideOpen.addEventListener('click', function () { guideOverlay.classList.add('is-active'); });
    $('#guideClose').addEventListener('click', function () { guideOverlay.classList.remove('is-active'); });
    $('#guideOk').addEventListener('click', function () { guideOverlay.classList.remove('is-active'); });
    guideOverlay.addEventListener('click', function (e) { if (e.target === guideOverlay) guideOverlay.classList.remove('is-active'); });


    // ── Profil Pengembang ──

    var devOverlay = document.getElementById('devprofileOverlay');
    var btnDev = document.getElementById('btnProfileDev');
    var btnDevClose = document.getElementById('devprofileClose');
    if (btnDev && devOverlay) {
        btnDev.addEventListener('click', function () { devOverlay.classList.add('is-active'); });
        if (btnDevClose) btnDevClose.addEventListener('click', function () { devOverlay.classList.remove('is-active'); });
    }


    // ── Event Bindings ──

    btnFirstReg.addEventListener('click', function () {
        if (addNewProfile(inputNameFirst.value)) { syncProfileUI(); refreshUI(); }
    });
    inputNameFirst.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && addNewProfile(inputNameFirst.value)) { syncProfileUI(); refreshUI(); }
    });

    profileBtn.addEventListener('click', openPopup);
    profilePopupClose.addEventListener('click', closePopup);
    profilePopup.addEventListener('click', function (e) { if (e.target === profilePopup) closePopup(); });
    btnAddPopup.addEventListener('click', function () {
        if (addNewProfile(inputNamePopup.value)) {
            inputNamePopup.value = '';
            syncProfileUI(); refreshUI(); renderPopupList();
        }
    });
    inputNamePopup.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && addNewProfile(inputNamePopup.value)) {
            inputNamePopup.value = '';
            syncProfileUI(); refreshUI(); renderPopupList();
        }
    });

    // Dubbing manual play buttons
    var btnDubOpening = $('#btnDubOpening');
    if (btnDubOpening) btnDubOpening.addEventListener('click', function () { playOpeningAudio(); });

    btnStart.addEventListener('click', goToLevels);
    btnBack.addEventListener('click', goToOpening);
    btnBackToLevels2.addEventListener('click', goToLevels);
    btnBackToStages.addEventListener('click', function () { goToStages(activeLevel); });
    btnReset.addEventListener('click', resetProgress);

    cardLevel1.addEventListener('click', function () { goToStages(1); });
    cardLevel2.addEventListener('click', function () {
        if (!isLevelDone(getProgress(), 'level1')) {
            showToast('Selesaikan Level 1 dulu ya!');
            return;
        }
        goToStages(2);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (screenGame.classList.contains('active')) goToStages(activeLevel);
            else if (screenStages.classList.contains('active')) goToLevels();
            else if (screenLevels.classList.contains('active')) goToOpening();
        }
    });


    // ── Splash ──

    var splash = $('#splash');
    var splashDone = false;

    function dismissSplash() {
        if (splashDone) return;
        splashDone = true;

        // Dismiss splash DULU — apapun yang terjadi, splash harus hilang
        splash.classList.add('is-hidden');
        setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 600);

        // Audio unlock (boleh gagal)
        try {
            if (audioSettings.bgmOn) bgmAudio.play().catch(function () {});
            if (screenOpening.classList.contains('active')) openingAudio.play().catch(function () {});
            audioUnlocked = true;
            removeUnlockListeners();
        } catch (e) {}

        // Fullscreen (boleh gagal)
        try { tryFullscreen(); } catch (e) {}
    }

    if (splash) {
        var splashBtn = splash.querySelector('.splash__start-btn');
        if (splashBtn) {
            splashBtn.addEventListener('click', dismissSplash);
            splashBtn.addEventListener('touchstart', function (e) { e.preventDefault(); dismissSplash(); });
        } else {
            splash.addEventListener('click', dismissSplash);
        }
    }

    // ── Fullscreen ──

    var fsBtn = $('#fsBtn');

    var fsSupported = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || document.documentElement.msRequestFullscreen);

    function tryFullscreen() {
        if (!fsSupported) return;
        var el = document.documentElement;
        try {
            var p = el.requestFullscreen ? el.requestFullscreen()
                  : el.webkitRequestFullscreen ? el.webkitRequestFullscreen()
                  : el.msRequestFullscreen ? el.msRequestFullscreen() : null;
            // Catch promise rejection (beberapa browser return rejected promise)
            if (p && p.catch) p.catch(function () {});
        } catch (e) {}
        syncFsBtn();
    }

    function exitFullscreen() {
        try {
            var p = document.exitFullscreen ? document.exitFullscreen()
                  : document.webkitExitFullscreen ? document.webkitExitFullscreen()
                  : document.msExitFullscreen ? document.msExitFullscreen() : null;
            if (p && p.catch) p.catch(function () {});
        } catch (e) {}
        syncFsBtn();
    }

    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    }

    function toggleFs() {
        if (isFullscreen()) exitFullscreen();
        else tryFullscreen();
    }

    function syncFsBtn() {
        if (!fsBtn) return;
        setTimeout(function () {
            if (fsSupported) {
                fsBtn.style.display = '';
                fsBtn.querySelector('.fs-btn__icon').textContent = isFullscreen() ? '\u2716' : '\u26F6';
            } else {
                // Browser ga support fullscreen — sembunyiin tombol
                fsBtn.style.display = 'none';
            }
        }, 100);
    }

    if (fsBtn) {
        fsBtn.addEventListener('click', toggleFs);
        document.addEventListener('fullscreenchange', syncFsBtn);
        document.addEventListener('webkitfullscreenchange', syncFsBtn);
        syncFsBtn();
    }


    // ── Init ──

    syncProfileUI();
    refreshUI();
    cycleSpeech();

    // Restore last screen on refresh
    var nav = loadNav();
    var hasProfile = !!getActiveProfile();
    if (nav && hasProfile) {
        if (nav.s === 'levels') {
            screenOpening.classList.remove('active');
            screenLevels.classList.add('active');
            topbar.classList.add('is-visible');
        } else if (nav.s === 'stages' && nav.l) {
            activeLevel = nav.l;
            renderStageSelect(nav.l);
            screenOpening.classList.remove('active');
            screenStages.classList.add('active');
            topbar.classList.add('is-visible');
        } else if (nav.s === 'game' && nav.l != null && nav.t != null) {
            activeLevel = nav.l;
            screenOpening.classList.remove('active');
            screenGame.classList.add('active');
            topbar.classList.add('is-visible');
            var ld = GameConfig.getLevel(nav.l);
            gameLevelInfo.textContent = ld.title;
            GameEngine.startLevel(nav.l, gameCanvas, {
                onStageComplete: handleStageComplete,
                onStageUpdate: handleStageUpdate,
            });
            GameEngine.startStage(nav.t);
        }
    }

})();
