/**
 * WDP Copy Text Widget - Frontend Script
 * Widget: weddingpress-copy-text
 * Version: 3.2.1.2
 *
 * Changelog v3.2.1.2:
 * - Replaced deprecated document.execCommand("copy") with Clipboard API (navigator.clipboard)
 * - Added legacy fallback for browsers that don't support Clipboard API
 * - Fixed memory leak: setInterval now calls clearInterval after completion
 * - Removed global function copyText() — replaced with event delegation (namespaced)
 */

(function ($) {
    'use strict';

    /**
     * Core copy handler — namespaced, tidak polusi global scope.
     * Mendukung Clipboard API modern + fallback legacy execCommand.
     *
     * @param {HTMLElement} el - Elemen <a> tombol yang diklik
     */
    function wdpDoCopy(el) {
        var $el      = $(el);
        var message  = $el.attr('data-message') || $el.data('message') || 'berhasil disalin';
        var origHtml = $el.html();

        /**
         * FIX PHONE-NUMBER & NUMBER TYPE-COERCION:
         * WAJIB membaca dari .attr('data-clipboard-text') BUKAN .data('clipboard-text').
         *
         * Kenapa WAJIB .attr():
         * - jQuery .data() otomatis melakukan type-coercion ke Number jika string berisi angka.
         *   Akibatnya: nomor HP yang diawali angka nol (0812...) kehilangan angka 0 di depan,
         *   dan nomor rekening panjang 16 digit melebihi MAX_SAFE_INTEGER JS sehingga digit
         *   terakhir dibulatkan/rusak.
         * - .attr() menjamin nilai SELALU dibaca sebagai String murni persis dari server.
         * - Menghindari interferensi auto-format tel: browser mobile pada DOM.
         */
        var content = $el.attr('data-clipboard-text');

        // Fallback DOM jika atribut data-clipboard-text tidak tersedia (misal widget lawas)
        if (typeof content === 'undefined' || content === false || content === null) {
            var $copyDiv = $el.siblings('div.copy-content');
            if ($copyDiv.length) {
                var $clone = $copyDiv.clone();
                $clone.find('br').replaceWith('\n');
                content = $clone.text();
            } else {
                content = '';
            }
        }

        // Sanitasi akhir string sebelum disalin ke Clipboard:
        // 1. Pastikan bertipe String.
        // 2. Bersihkan sisa tag <br> menjadi baris baru \n.
        // 3. Normalisasi non-breaking space (\u00A0) ke spasi biasa.
        // 4. Hapus zero-width spaces / invisible formatting characters.
        content = String(content)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/\u00A0/g, ' ')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .trim();

        function showFeedback() {
            $el.html(message);
            var counter  = 0;
            var interval = setInterval(function () {
                counter++;
                if (counter === 1) {
                    $el.html(origHtml);
                    clearInterval(interval); // FIXED: clear interval setelah selesai
                }
            }, 1500);
        }

        // Clipboard API modern (Chrome 66+, Firefox 63+, Safari 13.1+)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(content)
                .then(function () {
                    showFeedback();
                })
                .catch(function () {
                    // Fallback jika permission clipboard ditolak browser
                    wdpLegacyCopy(content, showFeedback);
                });
        } else {
            // Fallback untuk browser lama
            wdpLegacyCopy(content, showFeedback);
        }
    }

    /**
     * Fallback copy menggunakan textarea sementara.
     * Digunakan jika browser tidak mendukung Clipboard API.
     *
     * @param {string}   text     - Teks yang akan disalin
     * @param {Function} callback - Dipanggil setelah copy selesai
     */
    function wdpLegacyCopy(text, callback) {
        var $temp = $('<textarea>');
        $('body').append($temp);
        $temp.val(text).select();
        try {
            document.execCommand('copy'); // legacy only — masih digunakan sebagai fallback
        } catch (e) {
            // silent fail
        }
        $temp.remove();
        if (typeof callback === 'function') {
            callback();
        }
    }

    /**
     * Event delegation — satu handler untuk semua instance widget di halaman.
     * Tidak memerlukan registrasi per-instance.
     */
    $(document).on('click', '.wdp-copy-btn', function (e) {
        e.preventDefault();
        wdpDoCopy(this);
    });

})(jQuery);
