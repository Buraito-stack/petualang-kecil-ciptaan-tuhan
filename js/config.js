/* ==========================================================
   config.js — Single Source of Truth
   ==========================================================
   SEMUA teks, grid, kunci jawaban, audio diedit DI SINI SAJA.
   1 tahap selesai = 1 bintang. 5 tahap = 5 bintang.
   ========================================================== */

var GameConfig = (function () {
    'use strict';

    var SETTINGS = {
        storageKey:   'petualang_progress',
        totalLevels:  2,
        stagesPerLvl: 5,
        passPercent:  100,     // harus benar 100% untuk lulus
        robotEmoji:   '\uD83E\uDD16',  // 🤖
    };

    var SPEECH_LINES = [
        'Halo! Aku <strong>Robi</strong>, teman petualangmu! Yuk belajar tentang ciptaan Tuhan!',
        'Tahukah kamu? Tuhan menciptakan matahari untuk menerangi dunia!',
        'Air adalah sumber kehidupan. Yuk kita pelajari bersama!',
        'Setiap bintang di langit diciptakan Tuhan dengan indah!',
        'Ayo pilih level dan mulai petualangan kita!',
        'Belajar itu menyenangkan kalau kita lakukan bersama!',
    ];

    /* ═════════════════════════════════════
       LEVEL 1 — BENDA PENERANG
       ═════════════════════════════════════ */
    var LEVEL_1 = {
        id: 1,
        title: 'Ciptaan Tuhan \u2013 Benda Penerang',
        subtitle: 'Kenali benda penerang ciptaan Tuhan!',
        icon: '\u2600\uFE0F',
        icons: ['\u2600\uFE0F', '\uD83C\uDF19', '\u2B50'],
        stages: [
            /* ── T1: Matahari (5 langkah) ── */
            {
                id: 'l1_t1', title: 'Matahari',
                goalEmoji: '\u2600\uFE0F',
                story: 'Hai petualang kecil! \u2600\uFE0F\nMatahari memberi terang di siang hari.',
                gridCols: 4, gridRows: 3,
                startPos: { row: 2, col: 0 },
                answerKey: ['right','right','right','up','up'],
                audio: 'level1_matahari.mp3',
                hint: 'Ke kanan 3 kali, lalu naik 2 kali!',
            },
            /* ── T2: Bulan (7 langkah) ── */
            {
                id: 'l1_t2', title: 'Bulan',
                goalEmoji: '\uD83C\uDF19',
                story: 'Bulan terlihat di malam hari \uD83C\uDF19',
                gridCols: 4, gridRows: 4,
                startPos: { row: 3, col: 0 },
                answerKey: ['right','up','right','up','right','up','up'],
                audio: 'level1_bulan.mp3',
                hint: 'Zigzag ke kanan-atas, lalu naik terus!',
            },
            /* ── T3: Bintang (8 langkah) ── */
            {
                id: 'l1_t3', title: 'Bintang',
                goalEmoji: '\u2B50',
                story: 'Bintang bersinar di malam hari \u2B50',
                gridCols: 5, gridRows: 4,
                startPos: { row: 3, col: 0 },
                answerKey: ['right','right','up','up','right','right','up','up'],
                audio: 'level1_bintang.mp3',
                hint: 'Kanan 2, naik 2, kanan 2, naik 2 \u2014 seperti tangga!',
            },
            /* ── T4: Debugging (10 langkah) ── */
            {
                id: 'l1_t4', title: 'Perbaiki Jalan',
                goalEmoji: '\uD83D\uDD27',
                story: 'Ayo perbaiki jalannya!',
                gridCols: 5, gridRows: 4,
                startPos: { row: 0, col: 0 },
                answerKey: ['right','right','down','down','right','right','down','down','left','left'],
                audio: 'level1_debug.mp3',
                hint: 'Kanan 2, turun 2, kanan 2, turun 2, kiri 2!',
            },
            /* ── T5: Final (12 langkah) ── */
            {
                id: 'l1_t5', title: 'Kunjungi Semua!',
                goalEmoji: '\uD83C\uDF1F',
                story: 'Ayo kunjungi semua benda penerang! \u2600\uFE0F\uD83C\uDF19\u2B50',
                gridCols: 6, gridRows: 4,
                startPos: { row: 3, col: 0 },
                answerKey: ['right','right','up','up','right','up','right','right','down','down','down','right'],
                audio: 'level1_final.mp3',
                hint: 'Ikuti jalur terang yang berkelok!',
            },
        ],
    };

    /* ═════════════════════════════════════
       LEVEL 2 — AIR
       ═════════════════════════════════════ */
    var LEVEL_2 = {
        id: 2,
        title: 'Ciptaan Tuhan \u2013 Air',
        subtitle: 'Pelajari keajaiban air ciptaan Tuhan!',
        icon: '\uD83D\uDCA7',
        icons: ['\uD83D\uDCA7', '\uD83C\uDFDE\uFE0F', '\uD83C\uDF0A'],
        stages: [
            /* ── T1: Air (5 langkah) ── */
            {
                id: 'l2_t1', title: 'Air',
                goalEmoji: '\uD83D\uDCA7',
                story: 'Air penting untuk kehidupan \uD83D\uDCA7',
                gridCols: 4, gridRows: 3,
                startPos: { row: 0, col: 0 },
                answerKey: ['down','down','right','right','right'],
                audio: 'level2_air.mp3',
                hint: 'Turun 2 kali, lalu kanan 3 kali!',
            },
            /* ── T2: Sungai (7 langkah) ── */
            {
                id: 'l2_t2', title: 'Sungai',
                goalEmoji: '\uD83C\uDFDE\uFE0F',
                story: 'Sungai adalah air yang mengalir \uD83C\uDFDE\uFE0F',
                gridCols: 4, gridRows: 4,
                startPos: { row: 0, col: 3 },
                answerKey: ['down','left','down','left','down','left','down'],
                audio: 'level2_sungai.mp3',
                hint: 'Turun-kiri bergantian, seperti air mengalir!',
            },
            /* ── T3: Laut (8 langkah) ── */
            {
                id: 'l2_t3', title: 'Laut',
                goalEmoji: '\uD83C\uDF0A',
                story: 'Laut sangat luas \uD83C\uDF0A',
                gridCols: 5, gridRows: 4,
                startPos: { row: 0, col: 4 },
                answerKey: ['left','left','down','down','left','left','down','down'],
                audio: 'level2_laut.mp3',
                hint: 'Kiri 2, turun 2, kiri 2, turun 2 \u2014 menyelam!',
            },
            /* ── T4: Debugging (10 langkah) ── */
            {
                id: 'l2_t4', title: 'Perbaiki Jalan',
                goalEmoji: '\uD83D\uDD27',
                story: 'Ayo perbaiki jalan ke laut!',
                gridCols: 5, gridRows: 4,
                startPos: { row: 3, col: 4 },
                answerKey: ['left','left','up','up','left','left','up','up','right','right'],
                audio: 'level2_debug.mp3',
                hint: 'Kiri 2, naik 2, kiri 2, naik 2, kanan 2!',
            },
            /* ── T5: Final (12 langkah) ── */
            {
                id: 'l2_t5', title: 'Kunjungi Semua!',
                goalEmoji: '\uD83C\uDF0A',
                story: 'Ayo kunjungi air, sungai, dan laut! \uD83D\uDCA7\uD83C\uDFDE\uFE0F\uD83C\uDF0A',
                gridCols: 6, gridRows: 4,
                startPos: { row: 0, col: 0 },
                answerKey: ['right','right','down','down','down','right','right','up','up','up','right','right'],
                audio: 'level2_final.mp3',
                hint: 'Ikuti jalur biru yang berkelok!',
            },
        ],
    };

    var LEVELS = { 1: LEVEL_1, 2: LEVEL_2 };

    return {
        SETTINGS: SETTINGS,
        SPEECH_LINES: SPEECH_LINES,
        LEVELS: LEVELS,
        getLevel: function (n) { return LEVELS[n] || null; },
        getStage: function (n, i) { var l = LEVELS[n]; return l ? l.stages[i] || null : null; },
        getStageCount: function (n) { var l = LEVELS[n]; return l ? l.stages.length : 0; },
    };
})();
