/**
 * WeddingPress Guestbook Module — v3
 *
 * Refactored dari wdp.min.js ke file dedicated (identik arsitektur v4).
 * Storage: custom table wdp_guestbooks via AJAX action guestbook_box_submit.
 *
 * Fitur:
 * - Event delegation ke .wdp-guestbook-form (bukan direct #post-guestbook-box)
 * - Nonce via cevar.guestbook_nonce (check_ajax_referer di PHP)
 * - Auto-fill nama tamu dari URL param ?to= / ?dear= / ?kepada= via MutationObserver
 * - Pagination via data-pagination + data-per-page attribute
 * - Support Elementor popup dynamic init
 * - Re-fill nama setelah form.reset()
 */
jQuery(document).ready(function ($) {

    // Helper: Pagify Initializer
    var pagify = {
        items: {},
        container: null,
        totalPages: 1,
        perPage: 3,
        currentPage: 0,
        createNavigation: function () {
            this.totalPages = Math.ceil(this.items.length / this.perPage);
            $(".pagination", this.container.parent()).remove();

            var pagination = $('<div class="pagination"></div>').append('<a class="nav prev disabled" data-next="false">←</a>');
            for (var i = 0; i < this.totalPages; i++) {
                var pageElClass = "page";
                if (!i) pageElClass = "page current";
                pagination.append('<a class="' + pageElClass + '" data-page="' + (i + 1) + '">' + (i + 1) + "</a>");
            }
            pagination.append('<a class="nav next" data-next="true">→</a>');
            this.container.after(pagination);

            var that = this;
            this.container.parent().off("click.paginav").on("click.paginav", ".nav", function () {
                that.navigate($(this).data("next"));
            });

            this.container.parent().off("click.pagipage").on("click.pagipage", ".page", function () {
                that.goToPage($(this).data("page"));
            });
        },
        navigate: function (next) {
            if (isNaN(next) || next === undefined) next = true;
            this.container.parent().find(".pagination .nav").removeClass("disabled");

            if (next) {
                this.currentPage++;
                if (this.currentPage > this.totalPages - 1) this.currentPage = this.totalPages - 1;
                if (this.currentPage == this.totalPages - 1) this.container.parent().find(".pagination .nav.next").addClass("disabled");
            } else {
                this.currentPage--;
                if (this.currentPage < 0) this.currentPage = 0;
                if (this.currentPage == 0) this.container.parent().find(".pagination .nav.prev").addClass("disabled");
            }
            this.showItems();
        },
        updateNavigation: function () {
            this.container.parent().find(".pagination .page").removeClass("current");
            this.container.parent().find('.pagination .page[data-page="' + (this.currentPage + 1) + '"]').addClass("current");
        },
        goToPage: function (page) {
            this.currentPage = page - 1;
            this.container.parent().find(".pagination .nav").removeClass("disabled");
            if (this.currentPage == this.totalPages - 1) this.container.parent().find(".pagination .nav.next").addClass("disabled");
            if (this.currentPage == 0) this.container.parent().find(".pagination .nav.prev").addClass("disabled");
            this.showItems();
        },
        showItems: function () {
            this.items.hide();
            var base = this.perPage * this.currentPage;
            this.items.slice(base, base + this.perPage).show();
            this.updateNavigation();
        },
        init: function (container, items, perPage) {
            this.container = container;
            this.currentPage = 0;
            this.totalPages = 1;
            this.perPage = perPage;
            this.items = items;
            this.createNavigation();
            this.showItems();
        }
    };

    $.fn.pagify = function (perPage, itemSelector) {
        var el = $(this);
        var items = $(itemSelector, el);
        if (isNaN(perPage) || perPage === undefined) perPage = 3;
        if (items.length <= perPage) return true;
        var pagifyInstance = $.extend({}, pagify);
        pagifyInstance.init(el, items, perPage);
    };

    // Auto-fill nama tamu dari URL param ke input guestbook-name
    function fillGuestbookNameFromUrl() {
        var urlParams = new URLSearchParams(window.location.search);
        var paramKeys = ['to', 'dear', 'kepada'];
        var guestName = '';
        for (var i = 0; i < paramKeys.length; i++) {
            var val = urlParams.get(paramKeys[i]);
            if (val && val.trim()) {
                guestName = val.trim();
                break;
            }
        }

        if (!guestName) return;

        $('input[name="guestbook-name"]').each(function () {
            var $input = $(this);
            var currentVal = $input.val() || '';
            if (!currentVal || /^[A-Z0-9]{4,12}$/.test(currentVal)) {
                $input.val(guestName);
            }
        });
    }

    // Jalankan saat DOM ready
    fillGuestbookNameFromUrl();

    // MutationObserver: tangani widget yang dimuat dinamis oleh Elementor popup
    if (typeof MutationObserver !== 'undefined' && !window._wdpGuestbookNameObserverActive) {
        window._wdpGuestbookNameObserverActive = true;
        var guestbookNameObserver = new MutationObserver(function () {
            fillGuestbookNameFromUrl();
        });
        guestbookNameObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Initialize semua guestbook saat halaman load
    function initGuestbooks() {
        $(".guestbook-box-content").each(function () {
            var $content = $(this);
            var showPagination = $content.data('pagination') || 'no';
            var perPage = parseInt($content.data('per-page')) || 5;

            var $list = $content.find(".guestbook-list");
            if (showPagination === 'yes') {
                $list.pagify(perPage, ".user-guestbook");
            } else {
                $list.css({ "height": "270px", "overflow": "auto" });
            }
        });
    }

    // wdp.min.js (dependensi file ini) masih memasang handler submit lama ke #post-guestbook-box.
    // Dilepas di sini agar satu submit tidak terkirim dua kali; handler itu tetap berguna untuk
    // HTML ter-cache dari v3.2.1.5 yang belum memuat file ini.
    $('#post-guestbook-box').off('submit');

    // Submit Guestbook via event delegation ke .wdp-guestbook-form
    $(document).on("submit", ".wdp-guestbook-form", function (e) {
        e.preventDefault();

        var $form = $(this);
        var $content = $form.closest(".guestbook-box-content");

        // .attr (bukan .data) agar nama form seperti "0" / "false" / "123" tidak dikonversi tipe.
        var formId = $content.attr("data-id") || '';
        var postId = $content.data("post-id") || '';
        var showPagination = $content.data('pagination') || 'no';
        var perPage = parseInt($content.data('per-page')) || 5;

        // Nonce dari cevar yang sudah di-localize oleh PHP (elementor.php)
        var guestbookNonce = (typeof cevar !== 'undefined' && cevar.guestbook_nonce) ? cevar.guestbook_nonce : '';

        var query = "action=guestbook_box_submit" +
                    "&id=" + encodeURIComponent(formId) +
                    "&post_id=" + encodeURIComponent(postId) +
                    "&nonce=" + encodeURIComponent(guestbookNonce) +
                    "&avatar=" + encodeURIComponent($content.find("#hidden-avatar img").attr("src") || '') +
                    "&" + $form.serialize();

        var ajaxUrl = (typeof cevar !== 'undefined') ? cevar.ajax_url : (typeof ajaxurl !== 'undefined' ? ajaxurl : '/wp-admin/admin-ajax.php');

        var $submit = $form.find('[type="submit"]');
        $form.find('.wdp-guestbook-error').remove();
        $submit.prop('disabled', true);

        // Server membalas HTML saat sukses dan JSON {success:false} saat gagal.
        $.post(ajaxUrl, query, null, 'text')
            .done(function (response) {
                var error = parseGuestbookError(response);
                if (error !== null || !$.trim(response)) {
                    showGuestbookError($form, error);
                    return;
                }
                var $list = $content.find(".guestbook-list");
                $list.prepend(response);
                $form[0].reset();
                // Isi ulang nama setelah form reset agar field tidak kosong
                fillGuestbookNameFromUrl();

                if (showPagination === 'yes') {
                    $list.pagify(perPage, ".user-guestbook");
                }
            })
            .fail(function (xhr) {
                showGuestbookError($form, parseGuestbookError(xhr.responseText));
            })
            .always(function () {
                $submit.prop('disabled', false);
            });
    });

    function parseGuestbookError(text) {
        if (!text || text.charAt(0) !== '{') return null;
        try {
            var json = JSON.parse(text);
            if (json && json.success === false) {
                return (json.data && json.data.message) ? json.data.message : '';
            }
        } catch (e) {}
        return null;
    }

    function showGuestbookError($form, message) {
        $('<p class="wdp-guestbook-error" role="alert" style="color:#c0392b;font-size:13px;margin:8px 0 0;"></p>')
            .text(message || 'Ucapan gagal dikirim. Periksa koneksi lalu coba lagi.')
            .appendTo($form);
    }

    // Run initializer
    initGuestbooks();

    // Support Elementor popup dynamic initialization
    var bindGuestbookHook = function () {
        if (window.elementorFrontend && window.elementorFrontend.hooks) {
            window.elementorFrontend.hooks.addAction('frontend/element_ready/weddingpress-guestbook.default', function ($scope) {
                var $content = $scope.find(".guestbook-box-content");
                if ($content.length) {
                    var showPagination = $content.data('pagination') || 'no';
                    var perPage = parseInt($content.data('per-page')) || 5;
                    var $list = $content.find(".guestbook-list");
                    if (showPagination === 'yes') {
                        $list.pagify(perPage, ".user-guestbook");
                    } else {
                        $list.css({ "height": "270px", "overflow": "auto" });
                    }
                    fillGuestbookNameFromUrl();
                }
            });
        } else {
            $(window).on('elementor/frontend/init', bindGuestbookHook);
        }
    };
    bindGuestbookHook();

});
