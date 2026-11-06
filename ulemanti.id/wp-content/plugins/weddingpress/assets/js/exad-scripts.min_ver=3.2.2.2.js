(function ($) {
    "use strict";

    var editMode = false;

// modal popup script starts

var exclusiveModalPopup = function ($scope, $) {

    var modalWrapper        = $scope.find( '.exad-modal' ).eq(0),
        modalOverlayWrapper = $scope.find( '.exad-modal-overlay' ),
        modalItem           = $scope.find( '.exad-modal-item' ),
        modalAction         = modalWrapper.find( '.exad-modal-image-action' ),
        closeButton         = modalWrapper.find( '.exad-close-btn' );

    var closeModal = function() {
        modalOverlayWrapper.removeClass( 'active' );
        modalItem.removeClass( 'active' );
        setTimeout( function() {
            if ( ! modalItem.hasClass( 'active' ) ) {
                modalItem.css( 'display', 'none' );
            }
        }, 300 );

        // Stop video playback on close; avoid reloading regular external_page iframes
        var isExternalPage = modalItem.hasClass( 'external_page' );
        if ( ! isExternalPage ) {
            var modal_iframe = modalWrapper.find( 'iframe' );
            if ( modal_iframe.length ) {
                var currentSrc = modal_iframe.attr( 'src' );
                if ( currentSrc && ( currentSrc.indexOf( 'youtube' ) !== -1 || currentSrc.indexOf( 'vimeo' ) !== -1 ) ) {
                    var modal_src = currentSrc.replace( '&autoplay=1', '' );
                    modal_iframe.attr( 'src', '' );
                    modal_iframe.attr( 'src', modal_src );
                }
            }
        }

        var $modal_video_tag = modalWrapper.find( 'video' );
        if ( $modal_video_tag.length && $modal_video_tag[0] ) {
            $modal_video_tag[0].pause();
            $modal_video_tag[0].currentTime = 0;
        }
    };

    modalAction.on( 'click', function(e) {
        e.preventDefault();
        var currentWrapper = $(this).closest( '.exad-modal' );
        var modalOverlay   = currentWrapper.find( '.exad-modal-overlay' );
        var targetModalId  = $(this).data( 'exad-modal' );
        var targetModal    = targetModalId ? $(targetModalId) : currentWrapper.find( '.exad-modal-item' );
        var overlay        = $(this).data( 'exad-overlay' );

        var modalIframe = targetModal.find( 'iframe.exad-modal-iframe' );
        if ( modalIframe.length ) {
            var dataSrc = modalIframe.attr( 'data-src' );
            var currentSrc = modalIframe.attr( 'src' );
            if ( dataSrc && ( ! currentSrc || 'about:blank' === currentSrc ) ) {
                modalIframe.attr( 'src', dataSrc );
            }
        }

        targetModal.css( 'display', 'block' );
        setTimeout( function() {
            targetModal.addClass( 'active' );
        }, 50 );

        if ( 'yes' === overlay ) {
            modalOverlay.addClass( 'active' );
        }
    } );

    closeButton.on( 'click', function(e) {
        e.preventDefault();
        closeModal();
    } );

    modalOverlayWrapper.on( 'click', function() {
        var overlay_click_close = $(this).data( 'exad_overlay_click_close' );
        if ( 'yes' === overlay_click_close ) {
            closeModal();
        }
    } );
};

// modal popup script ends



$(window).on('elementor/frontend/init', function () {
    if( elementorFrontend.isEditMode() ) {
        editMode = true;
    }
    
    
    elementorFrontend.hooks.addAction( 'frontend/element_ready/weddingpress-modal-popup.default', exclusiveModalPopup );

});	

}(jQuery));