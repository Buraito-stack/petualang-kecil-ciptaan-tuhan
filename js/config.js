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

            // T1: Air, grid 5x4, min path 9 langkah, maxMoves 10 (1 buffer)
            // Robot harus zigzag lewat atas karena baris 3 banyak batu
            {
                id: 'l2_t1', title: 'Air',
                freeRoam: true,
                goalEmoji: '\uD83D\uDCA7',
                story: 'Air penting untuk kehidupan \uD83D\uDCA7',
                gridCols: 5, gridRows: 4,
                startPos: { row: 0, col: 0 },
                goalPos:  { row: 3, col: 4 },
                obstacles: [
                    { row: 0, col: 1 }, { row: 0, col: 3 },
                    { row: 1, col: 1 }, { row: 2, col: 3 },
                    { row: 3, col: 1 }, { row: 3, col: 3 },
                ],
                maxMoves: 10,
                audio: 'Dubbing/Tahap 1 - Air.wav',
            },

            // T2: Sungai, grid 6x4
            // Helper ⚡ di jalur tengah, bad 🌀 di (3,3) menghukum rute bawah yg tampak pendek
            // Min dg helper: 6 manual. Min tanpa helper: 8. maxMoves: 8 (helper optional tapi save)
            {
                id: 'l2_t2', title: 'Sungai',
                freeRoam: true,
                goalEmoji: '\uD83C\uDFDE\uFE0F',
                story: 'Sungai adalah air yang mengalir \uD83C\uDFDE\uFE0F',
                gridCols: 6, gridRows: 4,
                startPos: { row: 0, col: 0 },
                goalPos:  { row: 3, col: 5 },
                obstacles: [
                    { row: 1, col: 1 }, { row: 2, col: 4 }, { row: 3, col: 2 },
                ],
                traps: [
                    { row: 1, col: 2, type: 'help', direction: 'right', distance: 2, emoji: '\uD83E\uDEE7' },
                    { row: 0, col: 4, type: 'bad', emoji: '\uD83C\uDF00' },
                ],
                maxMoves: 8,
                audio: 'Dubbing/Tahap 2 - Sungai.wav',
            },

            // T3: Laut, grid 7x4
            // Helper di tengah kasih boost 3 langkah. Bad 🌀 di (1,5) menghukum rute atas
            // Min dg helper: 6 manual. maxMoves: 8 (wajib pakai helper)
            {
                id: 'l2_t3', title: 'Laut',
                freeRoam: true,
                goalEmoji: '\uD83C\uDF0A',
                story: 'Laut sangat luas \uD83C\uDF0A',
                gridCols: 7, gridRows: 4,
                startPos: { row: 0, col: 0 },
                goalPos:  { row: 3, col: 6 },
                obstacles: [
                    { row: 0, col: 4 }, { row: 1, col: 1 }, { row: 1, col: 3 },
                    { row: 3, col: 0 }, { row: 3, col: 2 }, { row: 3, col: 4 },
                ],
                traps: [
                    { row: 2, col: 2, type: 'help', direction: 'right', distance: 3, emoji: '\uD83E\uDEE7' },
                    { row: 2, col: 6, type: 'bad', emoji: '\uD83C\uDF00' },
                ],
                maxMoves: 8,
                audio: 'Dubbing/Tahap 3 - Laut.wav',
            },

            // T4: Debug — tetap mode lama, path-based
            {
                id: 'l2_t4', title: 'Perbaiki Jalan',
                goalEmoji: '\uD83D\uDD27',
                story: 'Ada yang salah di jalan berliku ini! Cari dan perbaiki panah yang salah!',
                gridCols: 4, gridRows: 4,
                startPos: { row: 0, col: 0 },
                answerKey: ['down','right','down','right','down','right'],
                audio: 'Dubbing/Tahap 4 - Perbaiki Jalan.wav',
                debugMode: true,
                prefill: ['down','left','down','right','down','right'],
            },

            // T5: Final — rute jelas L-shape, kunjungi 3 checkpoint + goal
            // Start kiri atas → turun ke 💧 → kanan sampai 🏞️ → kanan → naik lewat 🌊 → ke ⭐
            // Obstacle memblok shortcut tengah. Bad 🌀 di (2,3) menghukum rute tengah
            // Helper ⚡ di (4,0) right 3 lands tepat di 🏞️. Tanpa helper budget ga muat.
            {
                id: 'l2_t5', title: 'Kunjungi Semua!',
                freeRoam: true,
                goalEmoji: '\uD83C\uDF1F',
                story: 'Ayo kunjungi air, sungai, dan laut! \uD83D\uDCA7\uD83C\uDFDE\uFE0F\uD83C\uDF0A',
                gridCols: 7, gridRows: 5,
                startPos: { row: 0, col: 0 },
                goalPos:  { row: 0, col: 6 },
                obstacles: [
                    { row: 0, col: 2 }, { row: 0, col: 3 },
                    { row: 1, col: 1 }, { row: 1, col: 3 }, { row: 1, col: 5 },
                    { row: 3, col: 1 }, { row: 3, col: 3 }, { row: 3, col: 5 },
                ],
                traps: [
                    { row: 4, col: 0, type: 'help', direction: 'right', distance: 3, emoji: '\uD83E\uDEE7' },
                    { row: 2, col: 3, type: 'bad', emoji: '\uD83C\uDF00' },
                ],
                maxMoves: 11,
                audio: 'Dubbing/Tahap 5 - Kunjungi Semua.wav',
                checkpoints: [
                    { row: 2, col: 0, emoji: '\uD83D\uDCA7' },
                    { row: 4, col: 3, emoji: '\uD83C\uDFDE\uFE0F' },
                    { row: 2, col: 6, emoji: '\uD83C\uDF0A' },
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
