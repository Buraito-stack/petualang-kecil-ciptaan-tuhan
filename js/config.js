/* ==========================================================
   config.js — Single Source of Truth
   ==========================================================
   SEMUA teks, grid, kunci jawaban, audio diedit DI SINI SAJA.
   1 tahap selesai = 1 bintang. 5 tahap = 5 bintang.

   PENTING: Setiap path sudah di-trace manual.
   Tidak boleh keluar batas grid (row/col < 0 atau >= rows/cols).
   ========================================================== */

var GameConfig = (function () {
    'use strict';

    var SETTINGS = {
        storageKey:   'petualang_progress',
        totalLevels:  2,
        stagesPerLvl: 5,
        robotEmoji:   '\uD83E\uDD16',
    };

    var SPEECH_LINES = [
        'Halo! Aku <strong>Robi</strong>, teman petualangmu! Yuk belajar tentang ciptaan Tuhan!',
        'Tahukah kamu? Tuhan menciptakan matahari untuk menerangi dunia!',
        'Air adalah sumber kehidupan. Yuk kita pelajari bersama!',
        'Setiap bintang di langit diciptakan Tuhan dengan indah!',
        'Ayo pilih level dan mulai petualangan kita!',
        'Belajar itu menyenangkan kalau kita lakukan bersama!',
    ];

    /*
       PATH TRACE LEGEND:
       S = start, G = goal, number = step order
       Grid coords: (row, col), 0-indexed
    */

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

            /* ── T1: Matahari — 5 langkah ──
               Grid 4x3 (cols x rows)
               S(2,0) →r(2,1) →r(2,2) →r(2,3) →u(1,3) →u(0,3)=G
            */
            {
                id: 'l1_t1', title: 'Matahari',
                goalEmoji: '\u2600\uFE0F',
                story: 'Hai petualang kecil! \u2600\uFE0F\nMatahari memberi terang di siang hari.',
                gridCols: 4, gridRows: 3,
                startPos: { row: 2, col: 0 },
                answerKey: ['right','right','right','up','up'],
                audio: 'level1_matahari.mp3',
            },

            /* ── T2: Bulan — 7 langkah ──
               Grid 4x4
               S(3,0) →r(3,1) →r(3,2) →u(2,2) →r(2,3) →u(1,3) →u(0,3) →l(0,2)=G
            */
            {
                id: 'l1_t2', title: 'Bulan',
                goalEmoji: '\uD83C\uDF19',
                story: 'Bulan terlihat di malam hari \uD83C\uDF19',
                gridCols: 4, gridRows: 4,
                startPos: { row: 3, col: 0 },
                answerKey: ['right','right','up','right','up','up','left'],
                audio: 'level1_bulan.mp3',
            },

            /* ── T3: Bintang — 8 langkah ──
               Grid 5x4
               S(3,0) →r(3,1) →u(2,1) →r(2,2) →u(1,2) →r(1,3) →u(0,3) →r(0,4) →d(1,4)=G
            */
            {
                id: 'l1_t3', title: 'Bintang',
                goalEmoji: '\u2B50',
                story: 'Bintang bersinar di malam hari \u2B50',
                gridCols: 5, gridRows: 4,
                startPos: { row: 3, col: 0 },
                answerKey: ['right','up','right','up','right','up','right','down'],
                audio: 'level1_bintang.mp3',
            },

            /* ── T4: Perbaiki Jalan — 6 langkah ──
               Grid 4x3
               S(2,0) →r(2,1) →u(1,1) →u(0,1) →r(0,2) →r(0,3) →d(1,3)=G
            */
            {
                id: 'l1_t4', title: 'Perbaiki Jalan',
                goalEmoji: '\uD83D\uDD27',
                story: 'Ada yang salah di jalannya! Cari dan perbaiki panah yang salah!',
                gridCols: 4, gridRows: 3,
                startPos: { row: 2, col: 0 },
                answerKey: ['right','up','up','right','right','down'],
                audio: 'level1_debug.mp3',
                debugMode: true,
                prefill:   ['right','up','left','right','right','up'],
            },

            /* ── T5: Final — 12 langkah ──
               Grid 6x5
               S(4,0) →r(4,1) →u(3,1) →u(2,1) →r(2,2) →r(2,3) →u(1,3) →u(0,3) →r(0,4) →r(0,5) →d(1,5) →d(2,5) →d(3,5)=G
            */
            {
                id: 'l1_t5', title: 'Kunjungi Semua!',
                goalEmoji: '\uD83C\uDF1F',
                story: 'Ayo kunjungi semua benda penerang! \u2600\uFE0F\uD83C\uDF19\u2B50',
                gridCols: 6, gridRows: 5,
                startPos: { row: 4, col: 0 },
                answerKey: ['right','up','up','right','right','up','up','right','right','down','down','down'],
                audio: 'level1_final.mp3',
                checkpoints: [
                    { row: 2, col: 1, emoji: '\u2600\uFE0F' },
                    { row: 0, col: 3, emoji: '\uD83C\uDF19' },
                    { row: 0, col: 5, emoji: '\u2B50' },
                ],
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

            /* ── T1: Air — 5 langkah ──
               Grid 4x3
               S(0,0) →d(1,0) →d(2,0) →r(2,1) →r(2,2) →r(2,3)=G
            */
            {
                id: 'l2_t1', title: 'Air',
                goalEmoji: '\uD83D\uDCA7',
                story: 'Air penting untuk kehidupan \uD83D\uDCA7',
                gridCols: 4, gridRows: 3,
                startPos: { row: 0, col: 0 },
                answerKey: ['down','down','right','right','right'],
                audio: 'level2_air.mp3',
            },

            /* ── T2: Sungai — 7 langkah ──
               Grid 5x3
               S(0,0) →r(0,1) →r(0,2) →d(1,2) →r(1,3) →r(1,4) →d(2,4) →l(2,3)=G
            */
            {
                id: 'l2_t2', title: 'Sungai',
                goalEmoji: '\uD83C\uDFDE\uFE0F',
                story: 'Sungai adalah air yang mengalir \uD83C\uDFDE\uFE0F',
                gridCols: 5, gridRows: 3,
                startPos: { row: 0, col: 0 },
                answerKey: ['right','right','down','right','right','down','left'],
                audio: 'level2_sungai.mp3',
            },

            /* ── T3: Laut — 8 langkah ──
               Grid 5x5
               S(0,4) →l(0,3) →l(0,2) →d(1,2) →d(2,2) →l(2,1) →l(2,0) →d(3,0) →d(4,0)=G
            */
            {
                id: 'l2_t3', title: 'Laut',
                goalEmoji: '\uD83C\uDF0A',
                story: 'Laut sangat luas \uD83C\uDF0A',
                gridCols: 5, gridRows: 5,
                startPos: { row: 0, col: 4 },
                answerKey: ['left','left','down','down','left','left','down','down'],
                audio: 'level2_laut.mp3',
            },

            /* ── T4: Perbaiki Jalan — 6 langkah ──
               Grid 4x3
               S(0,3) →l(0,2) →d(1,2) →d(2,2) →l(2,1) →l(2,0) →u(1,0)=G
            */
            {
                id: 'l2_t4', title: 'Perbaiki Jalan',
                goalEmoji: '\uD83D\uDD27',
                story: 'Ada yang salah di jalannya! Cari dan perbaiki panah yang salah!',
                gridCols: 4, gridRows: 3,
                startPos: { row: 0, col: 3 },
                answerKey: ['left','down','down','left','left','up'],
                audio: 'level2_debug.mp3',
                debugMode: true,
                prefill:   ['left','down','right','left','left','down'],
            },

            /* ── T5: Final — 12 langkah ──
               Grid 6x5
               S(0,0) →r(0,1) →r(0,2) →d(1,2) →d(2,2) →d(3,2) →r(3,3) →r(3,4) →u(2,4) →u(1,4) →u(0,4) →r(0,5) →d(1,5)... wait
               Let me redo: →r(0,5) is col 5 in 6-col grid = valid. Then we need 12 steps.
               S(0,0) →r(0,1) →r(0,2) →d(1,2) →d(2,2) →d(3,2) →r(3,3) →r(3,4) →r(3,5) →u(2,5) →u(1,5) →u(0,5) →d... no, that's back.
               12 steps: S(0,0)→d(1,0)→d(2,0)→r(2,1)→r(2,2)→d(3,2)→d(4,2)→r(4,3)→r(4,4)→u(3,4)→u(2,4)→r(2,5)→u(1,5)=G  (12 steps)
            */
            {
                id: 'l2_t5', title: 'Kunjungi Semua!',
                goalEmoji: '\uD83C\uDF1F',
                story: 'Ayo kunjungi air, sungai, dan laut! \uD83D\uDCA7\uD83C\uDFDE\uFE0F\uD83C\uDF0A',
                gridCols: 6, gridRows: 5,
                startPos: { row: 0, col: 0 },
                answerKey: ['down','down','right','right','down','down','right','right','up','up','right','up'],
                audio: 'level2_final.mp3',
                checkpoints: [
                    { row: 2, col: 0, emoji: '\uD83D\uDCA7' },
                    { row: 4, col: 2, emoji: '\uD83C\uDFDE\uFE0F' },
                    { row: 2, col: 4, emoji: '\uD83C\uDF0A' },
                ],
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
