(function () {
    // -------------------------------------------------------
    // Helper: Load QR library script (once)
    // -------------------------------------------------------
    function loadScript(src, callback) {
        if (window.__bpQrLoaded) { callback(); return; }
        if (document.querySelector('script[src="' + src + '"]')) {
            // Already being loaded or loaded by another widget
            var interval = setInterval(function() {
                if (window.__bpQrLoaded) {
                    clearInterval(interval);
                    callback();
                }
            }, 100);
            return;
        }
        var s = document.createElement('script');
        s.src = src;
        s.onload = function () { window.__bpQrLoaded = true; callback(); };
        document.head.appendChild(s);
    }

    // -------------------------------------------------------
    // Remove the loading class (reveal content)
    // -------------------------------------------------------
    function removeLoadingClass() {
        document.documentElement.classList.remove('bp-guest-loading');
        document.documentElement.classList.add('bp-data-ready');
    }

    // -------------------------------------------------------
    // Helper: Decode HTML Entities (fix for '&amp;', '&#039;', dll)
    // -------------------------------------------------------
    function decodeHtml(html) {
        if (!html) return '';
        var txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }

    // -------------------------------------------------------
    // Guard: bpConfig valid?
    // -------------------------------------------------------
    function isConfigValid() {
        return (typeof bpConfig !== 'undefined' && bpConfig.api_base_url && bpConfig.event_id);
    }

    // -------------------------------------------------------
    // Helper: get hash from URL params
    // -------------------------------------------------------
    function getHashFromUrl() {
        var urlParams = new URLSearchParams(window.location.search);
        if (bpConfig.param_names && Array.isArray(bpConfig.param_names)) {
            for (var i = 0; i < bpConfig.param_names.length; i++) {
                if (urlParams.has(bpConfig.param_names[i]) && urlParams.get(bpConfig.param_names[i])) {
                    return urlParams.get(bpConfig.param_names[i]);
                }
            }
        }
        return null;
    }

    // -------------------------------------------------------
    // Helper: Format Fallback Name from URL parameter
    // -------------------------------------------------------
    function formatFallbackName(str) {
        if (!str) return '';
        var uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (uuidRegex.test(str)) return '';
        var hexRegex = /^[0-9a-fA-F]{8,32}$/;
        if (hexRegex.test(str)) return '';
        
        var cleanStr = str.replace(/[-_]+/g, ' ').trim();
        return cleanStr.replace(/\b\w/g, function(char) {
            return char.toUpperCase();
        });
    }

    // -------------------------------------------------------
    // Helper: Premium Typing Animation
    // -------------------------------------------------------
    function bpInitTyping(el, fullText) {
        if (!el) return;
        el.classList.add('typing-initialized');
        
        if (el._bpTypingObserver) el._bpTypingObserver.disconnect();
        if (el._bpTypingTimeout) clearTimeout(el._bpTypingTimeout);

        var p = 0;
        var isDeleting = false;
        var isBlocked = false;
        
        el.innerHTML = '';
        var textSpan = document.createElement('span');
        textSpan.className = 'bp-typed-text';
        var cursor = document.createElement('span');
        cursor.className = 'bp-typed-cursor';
        
        el.appendChild(textSpan);
        el.appendChild(cursor);
        
        el._bpTypingObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (!el.querySelector('.bp-typed-cursor')) {
                    fullText = el.innerText.trim() || fullText;
                    el.innerHTML = '';
                    el.appendChild(textSpan);
                    el.appendChild(cursor);
                    p = 0;
                    isDeleting = false;
                    isBlocked = false;
                    textSpan.innerText = '';
                    textSpan.classList.remove('bp-typed-block');
                }
            });
        });
        el._bpTypingObserver.observe(el, { childList: true, characterData: true, subtree: true });

        function loop() {
            if (!document.body.contains(el)) return;
            var speed = 80;
            
            if (isBlocked) {
                textSpan.innerText = fullText;
                textSpan.classList.add('bp-typed-block');
                speed = 900;
                isBlocked = false;
                isDeleting = true;
            } else if (isDeleting) {
                textSpan.innerText = '';
                textSpan.classList.remove('bp-typed-block');
                p = 0;
                isDeleting = false;
                speed = 1000;
            } else {
                if (p <= fullText.length) {
                    textSpan.innerText = fullText.substring(0, p);
                    p++;
                    speed = 80 + Math.random() * 60;
                    if (p > fullText.length) {
                        speed = 2500;
                        isBlocked = true;
                    }
                }
            }
            el._bpTypingTimeout = setTimeout(loop, speed);
        }
        el._bpTypingTimeout = setTimeout(loop, 1000);
    }

    // -------------------------------------------------------
    // Helper: Initialize QR Download Button
    // -------------------------------------------------------
    function bpInitQrDownload(canvasWrap, parentWrap, guestData) {
        var downloadBtnWrap = parentWrap ? parentWrap.querySelector('.bp-qr-download-btn-wrap') : null;
        if (!downloadBtnWrap) return;

        var downloadBtn = downloadBtnWrap.querySelector('.bp-qr-download-btn');
        if (!downloadBtn) return;

        // Tunggu canvas ter-generate (qrcodejs async)
        setTimeout(function() {
            var canvas = canvasWrap.querySelector('canvas');
            if (!canvas) return; // Tidak ada canvas (fallback image mode) → biarkan tersembunyi

            // Reveal tombol download wrapper
            downloadBtnWrap.style.display = '';

            // Click handler — bind once
            if (downloadBtn._bpClickBound) return;
            downloadBtn._bpClickBound = true;

            downloadBtn.addEventListener('click', function(e) {
                e.preventDefault();

                var prefix = downloadBtn.getAttribute('data-filename-prefix') || 'QR';
                var guestName = (guestData && (guestData.name || guestData.nama)) || '';
                var filename = prefix;

                if (guestName) {
                    // Sanitize: hanya alphanumeric, spasi, strip, underscore
                    guestName = guestName.replace(/[^\w\s\-]/g, '').trim().replace(/\s+/g, '-');
                    filename = prefix + '-' + guestName;
                }

                try {
                    var dataUrl = canvas.toDataURL('image/png');
                    var link = document.createElement('a');
                    link.href = dataUrl;
                    link.download = filename + '.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (err) {
                    console.error('Failed to download QR code:', err);
                }
            });
        }, 150);
    }

    // -------------------------------------------------------
    // Inject Data into Elements
    // -------------------------------------------------------
    function injectGuestData(scope, guestData) {
        var isCheckedIn = ['checked_in', 'present', 'attended'].includes(guestData.status);
        var isSouvenirClaimed = 
            guestData.is_souvenir_claimed === true || 
            guestData.is_souvenir_claimed === 1 || 
            guestData.is_souvenir_claimed === '1' ||
            guestData.souvenir_claimed === true ||
            guestData.souvenir_claimed === 1 ||
            guestData.souvenir_status === 'claimed' ||
            guestData.is_claimed === true ||
            guestData.is_claimed === 1;

        // Target selectors
        var guestNameElements    = scope.querySelectorAll('.bp-dynamic-guest-name, .namatamu, #namatamu, .wds-name-cover, #wds-name-cover');
        var guestCategoryElements = scope.querySelectorAll('.bp-dynamic-guest-category');
        var guestPaxElements     = scope.querySelectorAll('.bp-dynamic-guest-pax');
        var qrImageElements      = scope.querySelectorAll('.bp-dynamic-qr-image');
        var selfieBtnElements    = scope.querySelectorAll('.bp-dynamic-selfie-btn');
        var souvenirElements     = scope.querySelectorAll('.bp-dynamic-souvenir-claim');

        // --- Guest Details ---
        guestNameElements.forEach(function (el) {
            el.classList.remove('bp-skeleton-loading');
            var targetName = guestData.name || guestData.nama || el.getAttribute('data-fallback') || 'Tamu Undangan';
            var decodedName = decodeHtml(targetName);

            if (el.classList.contains('bp-anim-typing')) {
                bpInitTyping(el, decodedName);
            } else {
                var innerSpan = el.querySelector('span');
                if (innerSpan) {
                    innerSpan.textContent = decodedName;
                } else {
                    el.textContent = decodedName;
                }
            }
        });

        guestCategoryElements.forEach(function (el) {
            el.classList.remove('bp-skeleton-loading');
            var categoryVal = guestData.category || guestData.kategori;
            var fallbackVal = el.getAttribute('data-fallback') || '';
            var targetVal = categoryVal || fallbackVal;

            if (targetVal) {
                el.textContent = decodeHtml(targetVal);
                var wrapper = el.closest('.bp-dynamic-guest-category-wrapper');
                if (wrapper) wrapper.style.display = '';
                else el.style.display = '';
            } else {
                var wrapper = el.closest('.bp-dynamic-guest-category-wrapper');
                if (wrapper) wrapper.style.display = 'none';
                else el.style.display = 'none';
            }
        });

        guestPaxElements.forEach(function (el) {
            el.classList.remove('bp-skeleton-loading');
            var paxVal = guestData.pax;
            var fallbackVal = el.getAttribute('data-fallback') || '';
            var targetVal = paxVal || fallbackVal;

            if (targetVal) {
                el.textContent = targetVal;
                var wrapper = el.closest('.bp-dynamic-guest-pax-wrapper');
                if (wrapper) wrapper.style.display = '';
                else el.style.display = '';
            } else {
                var wrapper = el.closest('.bp-dynamic-guest-pax-wrapper');
                if (wrapper) wrapper.style.display = 'none';
                else el.style.display = 'none';
            }
        });

        // --- QR Code ---
        var hasQrData = guestData.uuid || guestData.fallback_qr_slug || guestData.fallback_qr || guestData.is_fallback;
        if (qrImageElements.length > 0) {
            qrImageElements.forEach(function (fallbackImg) {
                fallbackImg.classList.remove('bp-skeleton-loading');

                var parentWrap = fallbackImg.closest('.bp-dynamic-qr-wrapper');
                var fallbackType = parentWrap ? parentWrap.getAttribute('data-fallback-type') : 'slug';

                // --- Mode: Fallback Image ---
                // Jika user pilih "Fallback Image" dan tidak ada uuid dari API,
                // tampilkan gambar fallback apa adanya, tanpa generate QR.
                if (fallbackType === 'image' && !guestData.uuid) {
                    // Biarkan <img> fallback tetap visible (tidak di-hide)
                    return;
                }

                // --- Mode: QR Generation (slug / full_url) ---
                var elQrContent = guestData.uuid;
                if (!elQrContent) {
                    if (fallbackType === 'full_url') {
                        elQrContent = guestData.fallback_qr_url || window.location.href;
                    } else if (fallbackType === 'slug') {
                        // Slug first, fallback ke full URL jika tidak ada slug
                        elQrContent = guestData.fallback_qr_slug || guestData.fallback_qr_url || window.location.href;
                    } else {
                        // fallbackType === 'image' tapi ada uuid → tetap generate QR
                        elQrContent = guestData.uuid;
                    }
                }

                if (!elQrContent) {
                    // Tidak ada data sama sekali → biarkan fallback image tampil
                    return;
                }

                // Load QR library dan generate
                loadScript(
                    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
                    function () {
                        fallbackImg.style.display = 'none';

                        var colorDarkValue  = parentWrap ? parentWrap.getAttribute('data-color-dark')  : '#000000';
                        var colorLightValue = parentWrap ? parentWrap.getAttribute('data-color-light') : '#ffffff';

                        var canvasWrap = fallbackImg.nextElementSibling; // .bp-qr-canvas-wrap
                        if (!canvasWrap || !canvasWrap.classList.contains('bp-qr-canvas-wrap')) return;

                        canvasWrap.innerHTML = '';
                        var sizeX = parentWrap ? parentWrap.offsetWidth : 256;
                        if (sizeX < 50) sizeX = 256;

                        var qrCode = new QRCode(canvasWrap, {
                            text: elQrContent,
                            width: sizeX,
                            height: sizeX,
                            colorDark:  colorDarkValue  || '#000000',
                            colorLight: colorLightValue || '#ffffff',
                            correctLevel: QRCode.CorrectLevel.H
                        });

                        // Initialize download button handler
                        bpInitQrDownload(canvasWrap, parentWrap, guestData);
                    }
                );
            });
        }

        // --- Selfie/Check-in Button ---
        selfieBtnElements.forEach(function (el) {
            var autoHide = el.getAttribute('data-auto-hide') === 'yes';
            if (!guestData.uuid && autoHide) {
                el.style.display = 'none';
                return;
            }

            var normalHtml = el.getAttribute('data-normal-html') || '';
            var confirmedHtml = el.getAttribute('data-confirmed-html') || '';
            var isCheckedIn = ['confirmed', 'checked_in', 'present', 'attended'].includes(guestData.status) || guestData.is_checked_in === true || guestData.checked_in == 1;

            if (isCheckedIn) {
                el.innerHTML = confirmedHtml;
                el.classList.add('bp-is-confirmed');
                el.href = 'javascript:void(0)';
                el.style.display = 'inline-flex';
            } else {
                var pwaUrl = guestData.pwa_url || guestData.selfie_url || '#';
                el.innerHTML = normalHtml;
                el.classList.remove('bp-is-confirmed');
                el.href = pwaUrl;
                el.style.display = 'inline-flex';
            }
        });

        // --- Souvenir Status ---
        souvenirElements.forEach(function (el) {
            var autoHide = el.getAttribute('data-auto-hide') === 'yes';
            if (!guestData.uuid && autoHide) {
                el.style.display = 'none';
                return;
            }

            var isSouvenirClaimed = guestData.is_souvenir_claimed === true || guestData.souvenir_claimed == 1;
            var pendingHtml = el.getAttribute('data-pending-html') || '';
            var claimedHtml = el.getAttribute('data-claimed-html') || '';

            if (isSouvenirClaimed) {
                el.innerHTML = claimedHtml;
                el.classList.add('bp-is-claimed');
                el.style.display = 'inline-flex';
            } else {
                el.innerHTML = pendingHtml;
                el.classList.remove('bp-is-claimed');
                el.style.display = 'inline-flex';
            }
        });
    }

    // -------------------------------------------------------
    // Core Fetch & Inject — accepts a scope (document or popup el)
    // -------------------------------------------------------
    function runBpFetch(scope) {
        if (!scope) return;
        
        // Guard: if already fetched in EXACT this scope, skip
        if (scope._bpFetched) return;

        if (!isConfigValid()) {
            removeLoadingClass();
            return;
        }

        // Editor Guard: Jangan lakukan injeksi/menyembunyikan elemen jika sedang berasa di Live Editor Elementor
        if (typeof elementorFrontend !== 'undefined' && elementorFrontend.isEditMode()) {
            var typingElements = scope.querySelectorAll('.bp-anim-typing');
            typingElements.forEach(function(el) {
                bpInitTyping(el, el.innerText.trim() || el.getAttribute('data-fallback') || 'Tamu Undangan');
            });
            removeLoadingClass();
            return;
        }

        var hash = getHashFromUrl();
        if (!hash) {
            // Tidak ada slug di URL: tetap kirim fallback agar QR "Full URL" bisa tampil.
            injectGuestData(scope, {
                fallback_qr_url: window.location.href,
                is_fallback: true
            });
            removeLoadingClass();
            return;
        }

        // Target elements for pre-loading state
        var guestNameElements     = scope.querySelectorAll('.bp-dynamic-guest-name, .namatamu, #namatamu, .wds-name-cover, #wds-name-cover');
        var guestCategoryElements = scope.querySelectorAll('.bp-dynamic-guest-category');
        var guestPaxElements      = scope.querySelectorAll('.bp-dynamic-guest-pax');
        var qrImageElements       = scope.querySelectorAll('.bp-dynamic-qr-image');
        var selfieBtnElements     = scope.querySelectorAll('.bp-dynamic-selfie-btn');
        var souvenirElements      = scope.querySelectorAll('.bp-dynamic-souvenir-claim');

        var totalElements = guestNameElements.length + guestCategoryElements.length +
            guestPaxElements.length + qrImageElements.length +
            selfieBtnElements.length + souvenirElements.length;
            
        if (totalElements === 0) return;

        // Mark scope as fetched
        scope._bpFetched = true;

        // If we already have the data globally, inject immediately
        if (window._bpGuestData) {
            injectGuestData(scope, window._bpGuestData);
            removeLoadingClass();
            return;
        }

        // Apply skeleton while fetching
        guestNameElements.forEach(function (el) { el.classList.add('bp-skeleton-loading'); });
        guestCategoryElements.forEach(function (el) { el.classList.add('bp-skeleton-loading'); });
        guestPaxElements.forEach(function (el) { el.classList.add('bp-skeleton-loading'); });
        qrImageElements.forEach(function (el) { el.classList.add('bp-skeleton-loading'); });

        var apiUrl = bpConfig.api_base_url + '/api/v1/event/' + bpConfig.event_id + '/guest/' + hash;

        fetch(apiUrl, { method: 'GET', headers: { 'Accept': 'application/json' } })
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function (data) {
                if (data.success) {
                    var guestData = data.data || data;
                    window._bpGuestData = guestData; // Cache it globally
                    injectGuestData(scope, guestData);
                } else {
                    // Graceful Fallback: Biarkan teks fallback dari widget settings tetap tampil.
                    // Slug URL ditampilkan sebagai nama tamu jika API tidak match.
                    // Validasi data valid/tidak diserahkan ke aplikasi bukutamu-pro saat scan.
                    var hashFound = getHashFromUrl();
                    var fallbackName = formatFallbackName(hashFound);
                    injectGuestData(scope, { 
                        name: fallbackName,
                        fallback_qr_slug: hashFound || '',
                        fallback_qr_url: window.location.href,
                        is_fallback: true
                    });
                }
                removeLoadingClass();
            })
            .catch(function (error) {
                console.error('Bukutamu Pro Fetch Error:', error);
                
                // Graceful Fallback: Tampilkan slug URL sebagai nama tamu.
                var hashFound = getHashFromUrl();
                var fallbackName = formatFallbackName(hashFound);
                injectGuestData(scope, { 
                    name: fallbackName,
                    fallback_qr_slug: hashFound || '',
                    fallback_qr_url: window.location.href,
                    is_fallback: true
                });

                removeLoadingClass();

                // Fail-Safe: clean up skeletons for other elements
                guestCategoryElements.forEach(function (el) { el.classList.remove('bp-skeleton-loading'); });
                guestPaxElements.forEach(function (el) { el.classList.remove('bp-skeleton-loading'); });
            });
    }

    // -------------------------------------------------------
    // 1. Normal Page / Post — run on DOMContentLoaded
    // -------------------------------------------------------
    document.addEventListener('DOMContentLoaded', function () {
        if (typeof elementorFrontend !== 'undefined' && elementorFrontend.isEditMode()) {
            var typingElements = document.querySelectorAll('.bp-anim-typing');
            typingElements.forEach(function(el) {
                bpInitTyping(el, el.innerText.trim() || el.getAttribute('data-fallback') || 'Tamu Undangan');
            });
            removeLoadingClass();
            return;
        }
        runBpFetch(document);
    });

    // -------------------------------------------------------
    // 2. Elementor Global Initialization
    // -------------------------------------------------------
    function initElementorHooks() {
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks) return;

        // Generic widget ready hook - runs for every widget instance (including popups)
        elementorFrontend.hooks.addAction('frontend/element_ready/widget', function ($scope) {
            runBpFetch($scope[0]);
        });
    }

    if (window.jQuery) {
        jQuery(window).on('elementor/frontend/init', initElementorHooks);
    }

    // -------------------------------------------------------
    // 3. Elementor Popup Fallback — re-run when popup is shown
    // -------------------------------------------------------
    window.addEventListener('elementor/popup/show', function (e) {
        var popupId = e.detail && e.detail.id;
        if (!popupId) return;

        // Search for popup element with multiple possible selectors
        var selectors = [
            '#elementor-popup-modal-' + popupId,
            '.elementor-popup-modal[data-elementor-id="' + popupId + '"]',
            '.elementor-element-' + popupId
        ];
        
        var popupEl = null;
        for (var i = 0; i < selectors.length; i++) {
            popupEl = document.querySelector(selectors[i]);
            if (popupEl) break;
        }

        if (popupEl) {
            // Force re-scan of this scope even if marked fetched
            popupEl._bpFetched = false;
            runBpFetch(popupEl);
        } else {
            // Last resort: scan whole document again if popup found but selector failed
            runBpFetch(document);
        }
    });

})();
