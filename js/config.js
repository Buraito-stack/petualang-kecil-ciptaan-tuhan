/**
 * config.js
 * Semua konten game (teks, grid, kunci jawaban, audio) diedit di sini.
 * 1 tahap selesai = 1 bintang, 5 tahap = 5 bintang.
 *
 * Path sudah di-trace manual, koordinat (row, col) 0-indexed.
 * Pastikan tidak keluar batas grid saat edit answerKey.
 */
var GameConfig = (function () {
    'use strict';

    var SETTINGS = {
        storageKey:   'petualang_progress',
        totalLevels:  2,
        stagesPerLvl: 5,
        robotEmoji:   '\uD83E\uDD16', // 🤖
    };

    var SPEECH_LINES = [
        'Halo! Aku <strong>Robi</strong>, teman petualangmu! Yuk belajar tentang ciptaan Tuhan!',
        'Tahukah kamu? Tuhan menciptakan matahari untuk menerangi dunia!',
        'Air adalah sumber kehidupan. Yuk kita pelajari bersama!',
        'Setiap bintang di langit diciptakan Tuhan dengan indah!',
        'Ayo pilih level dan mulai petualangan kita!',
        'Belajar itu menyenangkan kalau kita lakukan bersama!',
    ];


    // ── Level 1: Benda Penerang ──

    var LEVEL_1 = {
        id: 1,
        title: 'Ciptaan Tuhan \u2013 Benda Penerang',
        subtitle: 'Kenali benda penerang ciptaan Tuhan!',
        icon: '\u2600\uFE0F',
        icons: ['\u2600\uFE0F', '\uD83C\uDF19', '\u2B50'],
        stages: [

            // T1: Matahari, 5 langkah, grid 4x3
            // S(2,0) → r r r u u → G(0,3)
            {
                id: 'l1_t1', title: 'Matahari',
                goalEmoji: '\u2600\uFE0F',
                story: 'Hai petualang kecil! \u2600\uFE0F\nMatahari memberi terang di siang hari.',
                gridCols: 4, gridRows: 3,
                startPos: { row: 2, col: 0 },
                answerKey: ['right','right','right','up','up'],
                audio: 'Dubbing/Tahap 1 - Matahari.wav',
            },

            // T2: Bulan, 7 langkah, grid 4x4
            // S(3,0) → r r u r u u l → G(0,2)
            {
                id: 'l1_t2', title: 'Bulan',
                goalEmoji: '\uD83C\uDF19',
                story: 'Bulan terlihat di malam hari \uD83C\uDF19',
                gridCols: 4, gridRows: 4,
                startPos: { row: 3, col: 0 },
                answerKey: ['right','right','up','right','up','up','left'],
                audio: 'Dubbing/Tahap 2 - Bulan.wav',
            },

            // T3: Bintang, 8 langkah, grid 5x4
            // S(3,0) → r u r u r u r d → G(1,4)
            {
                id: 'l1_t3', title: 'Bintang',
                goalEmoji: '\u2B50',
                story: 'Bintang bersinar di malam hari \u2B50',
                gridCols: 5, gridRows: 4,
                startPos: { row: 3, col: 0 },
                answerKey: ['right','up','right','up','right','up','right','down'],
                audio: 'Dubbing/Tahap 3 - Bintang.wav',
            },

            // T4: Debug, 6 langkah, grid 4x3
            // S(2,0) → r u u r r d → G(1,3)
            {
                id: 'l1_t4', title: 'Perbaiki Jalan',
                goalEmoji: '\uD83D\uDD27',
                story: 'Ada yang salah di jalannya! Cari dan perbaiki panah yang salah!',
                gridCols: 4, gridRows: 3,
                startPos: { row: 2, col: 0 },
                answerKey: ['right','up','up','right','right','down'],
                audio: 'Dubbing/Tahap 4 - Perbaiki Jalan.wav',
                debugMode: true,
                prefill: ['right','up','left','right','right','up'],
            },

            // T5: Final, 12 langkah, grid 6x5
            // S(4,0) → r u u r r u u r r d d d → G(3,5)
            {
                id: 'l1_t5', title: 'Kunjungi Semua!',
                goalEmoji: '\uD83C\uDF1F',
                story: 'Ayo kunjungi semua benda penerang! \u2600\uFE0F\uD83C\uDF19\u2B50',
                gridCols: 6, gridRows: 5,
                startPos: { row: 4, col: 0 },
                answerKey: ['right','up','up','right','right','up','up','right','right','down','down','down'],
                audio: 'Dubbing/Tahap 5 - Semua Benda Penerang.wav',
                checkpoints: [
                    { row: 2, col: 1, emoji: '\u2600\uFE0F' },
                    { row: 0, col: 3, emoji: '\uD83C\uDF19' },
                    { row: 0, col: 5, emoji: '\u2B50' },
                ],
            },
        ],
    };


    // ── Level 2: Air ──

    var LEVEL_2 = {
        id: 2,
        title: 'Ciptaan Tuhan \u2013 Air',
        subtitle: 'Pelajari keajaiban air ciptaan Tuhan!',
        icon: '\uD83D\uDCA7',
        icons: ['\uD83D\uDCA7', '\uD83C\uDFDE\uFE0F', '\uD83C\uDF0A'],
        stages: [

            // T1: Air, 5 langkah, grid 4x3
            // S(0,0) → d d r r r → G(2,3)
            {
                id: 'l2_t1', title: 'Air',
                goalEmoji: '\uD83D\uDCA7',
                story: 'Air penting untuk kehidupan \uD83D\uDCA7',
                gridCols: 4, gridRows: 3,
                startPos: { row: 0, col: 0 },
                answerKey: ['down','down','right','right','right'],
                audio: 'Dubbing/Tahap 1 - Air.wav',
            },

            // T2: Sungai, 7 langkah, grid 5x3
            // S(0,0) → r r d r r d l → G(2,3)
            {
                id: 'l2_t2', title: 'Sungai',
                goalEmoji: '\uD83C\uDFDE\uFE0F',
                story: 'Sungai adalah air yang mengalir \uD83C\uDFDE\uFE0F',
                gridCols: 5, gridRows: 3,
                startPos: { row: 0, col: 0 },
                answerKey: ['right','right','down','right','right','down','left'],
                audio: 'Dubbing/Tahap 2 - Sungai.wav',
            },

            // T3: Laut, 8 langkah, grid 5x5
            // S(0,4) → l l d d l l d d → G(4,0)
            {
                id: 'l2_t3', title: 'Laut',
                goalEmoji: '\uD83C\uDF0A',
                story: 'Laut sangat luas \uD83C\uDF0A',
                gridCols: 5, gridRows: 5,
                startPos: { row: 0, col: 4 },
                answerKey: ['left','left','down','down','left','left','down','down'],
                audio: 'Dubbing/Tahap 3 - Laut.wav',
            },

            // T4: Debug, 6 langkah, grid 4x3
            // S(0,3) → l d d l l u → G(1,0)
            {
                id: 'l2_t4', title: 'Perbaiki Jalan',
                goalEmoji: '\uD83D\uDD27',
                story: 'Ada yang salah di jalannya! Cari dan perbaiki panah yang salah!',
                gridCols: 4, gridRows: 3,
                startPos: { row: 0, col: 3 },
                answerKey: ['left','down','down','left','left','up'],
                audio: 'Dubbing/Tahap 4 - Perbaiki Jalan.wav',
                debugMode: true,
                prefill: ['left','down','right','left','left','down'],
            },

            // T5: Final, 12 langkah, grid 6x5
            // S(0,0) → d d r r d d r r u u r u → G(1,5)
            {
                id: 'l2_t5', title: 'Kunjungi Semua!',
                goalEmoji: '\uD83C\uDF1F',
                story: 'Ayo kunjungi air, sungai, dan laut! \uD83D\uDCA7\uD83C\uDFDE\uFE0F\uD83C\uDF0A',
                gridCols: 6, gridRows: 5,
                startPos: { row: 0, col: 0 },
                answerKey: ['down','down','right','right','down','down','right','right','up','up','right','up'],
                audio: 'Dubbing/Tahap 5 - Kunjungi Semua.wav',
                checkpoints: [
                    { row: 2, col: 0, emoji: '\uD83D\uDCA7' },
                    { row: 4, col: 2, emoji: '\uD83C\uDFDE\uFE0F' },
                    { row: 2, col: 4, emoji: '\uD83C\uDF0A' },
                ],
            },
        ],
    };


    // ── Public API ──

    var LEVELS = { 1: LEVEL_1, 2: LEVEL_2 };

    return {
        SETTINGS:     SETTINGS,
        SPEECH_LINES: SPEECH_LINES,
        LEVELS:       LEVELS,
        getLevel:      function (n) { return LEVELS[n] || null; },
        getStage:      function (n, i) { var l = LEVELS[n]; return l ? l.stages[i] || null : null; },
        getStageCount: function (n) { var l = LEVELS[n]; return l ? l.stages.length : 0; },
    };
})();
