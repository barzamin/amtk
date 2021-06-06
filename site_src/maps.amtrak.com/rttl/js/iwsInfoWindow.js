/*
 Developed by: IT WORKS! Inc.
 Website: http://www.itworksdc.com/
 Copyright 2013 by IT WORKS! Inc.
 
 Date last modified: $Date$
 */


// Much of this shamelessly cribbed from:
// 		http://gmaps-samples-v3.googlecode.com/svn/trunk/infowindow_custom/infowindow-custom.html
// - Clifton

function iwsInfoWindow(opts) {
    google.maps.OverlayView.call(this);

    this.offsetVertical = 0;
    this.offsetHorizontal = 0;
    this.position = null;
    this.map = null;
    this.height = 165;
    this.width = 424;
    this.top_pointer = false;
    this.bottom_pointer = false;
    this.div_ = null;
    this.moveListener_ = null;
    this.hover = false;
    this.hover_content = "";
    this.left_content = "";
    this.right_content = "";
    this.mid_content = "";
    this.extra_content = "";
    this.fixup = null;
    this.fixupCalled_ = false;
    this.winCaret = null;
    this.dashes = false;
    this.collapsed = true;

    // Check the options for default properties before folding them into the object. 
    if (
            typeof opts.hover != "undefined" && opts.hover &&
            typeof opts.type != "undefined" && opts.type.length > 0
            ) {
        var img = images["hoverwindow_" + opts.type];
        if (typeof img != "undefined") {
            this.width = img.width;
            this.height = img.height;
            this.offsetVertical = -this.height;
            this.offsetHorizontal = -this.width / 2;
        }
    }

    $.extend(this, opts);

    if (this.position === null) {
        throw("iwsInfoWindow: MISSING REQUIRED PARAMETER - position");
    }

    // Once the properties of this OverlayView are initialized, set its map so
    // that we can display it.  This will trigger calls to panes_changed and
    // draw.
    // 
    // If the type is "search_results" we add the content to the DOM.
    if (typeof this.type != "undefined") {
        this.setGMap(this.map);
    }
}

// InfoBox extends GOverlay class from the Google Maps API 
iwsInfoWindow.prototype = new google.maps.OverlayView();

$.extend(iwsInfoWindow.prototype, {
    show: function() {
        // Only create Info element if no map is attached.
        if (this.div_ == null && this.map == null) {
            this._createInfoElement();
            $(this.div_).appendTo('body');
        }
        $(this.div_).show();
        $(this.div_).visible();
    },
    hide: function() {
        if (this.div_ != null) {
            $(this.div_).hide();
        }
    },
    setContent: function(o) {
        // If [o] was passed but is not an object, bail.
        if (typeof o != "undefined" && typeof o != "object")
            return;

        // Only override the content variables if [o] was specified.
        var Override = {
            fixup: null
        };
        if (typeof o != "undefined" && typeof o == "object") {
            $.each(["left_content", "right_content", "mid_content", "extra_content"], function(i, c) {
                if (typeof o[c] != undefined && o[c] != null) {
                    Override[c] = o[c];
                }
            });
            if (typeof o.fixup == "function") {
                Override.fixup = o.fixup;
            }

            $.extend(this, Override);
        }

        // Reset content.
        var idAdd = "";
        if (this.type == "search_results") {
            idAdd = "_" + this.type;
        }
        $(this.div_).find("#iwsIW_left_content" + idAdd).html(this.left_content);
        $(this.div_).find("#iwsIW_right_content" + idAdd).html(this.right_content);
        $(this.div_).find("#iwsIW_mid_content" + idAdd).html(this.mid_content);
        $(this.div_).find("#iwsIW_extra_content" + idAdd).html(this.extra_content);

        if (idAdd != "") {
            var me = this;
            setTimeout(function() {
                var elem = $("#iwsIW_extra_content" + idAdd).find(".if_train_search_result");
                var tb = $(elem).find(".text_bottom");
                $.each($(tb), function(i, e) {
                    var textBlock = $(e).attr('class').match("text_grey") != null;
                    if (textBlock) {
                        $(e).css('position', 'relative');
                    }
                    $(e).css('top',
                            // cw: Ugly but should work in most cases.
                                    (textBlock ? 12 : -5) + "px"
                                    );
                });

                // Run fixup if set during this call.
                if (Override.fixup != null && !me.fixupCalled_) {
                    me.fixup(me, me.div_);
                    me.fixupCalled_ = true;
                }
            }, 100);
        }
    },
    setGMap: function(m) {
        if (m !== null) {
            this.setMap(m);

            // cw: Should not be done here. Maybe at instantiation?
            if (this.div_ === null) {
                this.createElement();
            }

            if (!this.hover) {
                var me = this;
                this.boundsChangedListener_ = google.maps.event.addListener(m, "bounds_changed", function() {
                    me.draw();
                });
            }

            if (this.anchor) {
                this.position = this.anchor.getPosition();
                if (!this.hover) {
                    // Remove event listener if it already exists.
                    this.removeListener();
                    this.moveListener_ = google.maps.event.addListener(this.anchor, "position_changed", function() {
                        me.setPosition(this.getPosition());
                    });
                }
            }
        } else {
            this.setMap(null);
        }

        this.map = m;
    },
    removeListener: function() {
        if (this.moveListener_) {
            google.maps.event.removeListener(this.moveListener_);
            this.moveListener_ = null;
        }
    },
    // Remove the DIV from the DOM.
    remove: function() {
        if (this.div_) {
            $(this.div_).detach();
            this.div_ = null;
        }
    },
    close: function() {
        if (typeof this.type != "undefined") {
            if (this.type == "search_results") {
                // Remove any on-element styles.
                $(this.div_).attr('style', 'display: block');
                // Hides the DIV
                $(this.div_).hide();
                $("#search_field").val('');
            } else if (this.type == "station") {
                // Remove from map
                this._close();
                $("#search_field").val('');
            } else {
                this._close();
			}
        } else {
            // Remove from map.
            this._close();
        }
        this.fixupCalled_ = false;
    },
//MB 3/6/2014
    closeForSearch: function() {
        if (typeof this.type != "undefined") {
            if (this.type == "search_results") {
                // Remove any on-element styles.
                $(this.div_).attr('style', 'display: block');
                // Hides the DIV
                $(this.div_).hide();
            } else if (this.type == "station") {
                // Remove from map				
                this._close();
            } else {
                this._close();
            }
        } else {
            // Remove from map.
            this._close();
        }
        this.fixupCalled_ = false;
    },
    _close: function() {
        this.setGMap(null)
        this.remove();
        // cw: This variable should be global from the map.
        if (lastInfoWindow == this) {
            lastInfoWindow = null;
        }
    },
    setPosition: function(latlng) {
        this.position = latlng;

        if (this.div_) {
            this.draw();
        }

        /**
         * This event is fired when the position of the InfoBox changes.
         * @name InfoBox#position_changed
         * @event
         */
        google.maps.event.trigger(this, "position_changed");
    },
    // Pan the map to fit the InfoBox.
    panMap: function() {
        // if we go beyond map, pan map
        var bounds = this.map.getBounds();
        if (!bounds)
            return;
        if (!this.map.getBounds().contains(this.position)) {
            map.setCenter(this.position_);
        }

        var mapDiv = map.getDiv();
        var mapWidth = mapDiv.offsetWidth;
        var mapHeight = mapDiv.offsetHeight;
        var iwOffsetX = this.offsetVertical;
        var iwOffsetY = this.offsetHorizontal;
        var iwWidth = $(this.div_)[0].offsetWidth;
        var iwHeight = $(this.div_)[0].offsetHeight;
        var padX = 1;
        var padY = 1;

        var pixPosition = this.getProjection().fromLatLngToContainerPixel(this.position);
        log('Pixel Position: ' + pixPosition.toString());

        if (pixPosition.x < (-iwOffsetX + padX)) {
            xOffset = pixPosition.x + iwOffsetX - padX;
        } else if ((pixPosition.x + iwWidth + iwOffsetX + padX) > mapWidth) {
            xOffset = pixPosition.x + iwWidth + iwOffsetX + padX - mapWidth;
        }
        if (this.alignBottom_) {
            if (pixPosition.y < (-iwOffsetY + padY + iwHeight)) {
                yOffset = pixPosition.y + iwOffsetY - padY - iwHeight;
            } else if ((pixPosition.y + iwOffsetY + padY) > mapHeight) {
                yOffset = pixPosition.y + iwOffsetY + padY - mapHeight;
            }
        } else {
            if (pixPosition.y < (-iwOffsetY + padY)) {
                yOffset = pixPosition.y + iwOffsetY - padY;
            } else if ((pixPosition.y + iwHeight + iwOffsetY + padY) > mapHeight) {
                yOffset = pixPosition.y + iwHeight + iwOffsetY + padY - mapHeight;
            }
        }

        if (!(xOffset === 0 && yOffset === 0)) {
            // Move the map to the shifted center.
            var c = map.getCenter();
            map.panBy(xOffset, yOffset);
        }
    },
    createElement: function() {
        var panes = this.getPanes();
        if (!this.div_) {
            if (this.hover) {
                this._createHoverElement();
            } else {
                this._createInfoElement();
            }
            panes.floatPane.appendChild(this.div_[0]);
        } else if ($(this.div_).parent()[0] != panes.floatPane) {
            this.div_ = this.div_.detach();
            panes.floatPane.appendChild(this.div_[0]);
        }

        // cw: Possibility that fixup may be called twice.
        if (this.fixup != null && typeof this.fixup == "function") {
            if (!this.fixupCalled_) {
                this.fixup(this, this.div_);
                this.fixupCalled_ = true;
            }
        }

        // Cancel event defined in mapStyle.js -- Note the use of the DOM object.
        google.maps.event.addDomListener(this.div_[0], 'click', cancelEvent);
        google.maps.event.addDomListener(this.div_[0], 'dblclick', cancelEvent);
        google.maps.event.addDomListener(this.div_[0], 'mousemove', cancelEvent);
        google.maps.event.addDomListener(this.div_[0], 'mouseout', cancelEvent);
        google.maps.event.addDomListener(this.div_[0], 'mousedown', cancelEvent);
    },
    _createHoverElement: function() {
        var additionalClasses = "";

        // Change content classes if requested.
        if (typeof this.type != "undefined" && this.type.length > 0) {
            additionalClasses = " hoverwindow_" + this.type
        }

        // IE8 Fix
        /*var additionalStyles = 'height: 32px; width: 222px;';
         if(this.type == 'station')
         additionalStyles += 'background: url(img/STA_HVR_Up.png) no-repeat;';
         else // Active Train Hovers
         additionalStyles += 'background: url(img/hovers/TR_HVR_' + this.type.replace('train_','') + '.png) no-repeat;';*/

        var hoverWindowHTML =
                //'<div class="hoverwindow_wrapper' + additionalClasses + '" style="display: none;' + ((isIE8)?additionalStyles:'') + '">'
                '<div class="hoverwindow_wrapper' + additionalClasses + '" style="visibility: hidden;">'
                + '<div class="hoverwindow_text" id="iwsHW_text"></div>'
                + '</div>';
        this.div_ = $.parseHTML(hoverWindowHTML);

        $(this.div_).find("#iwsHW_text").html(this.hover_content);

        var me = this.div_;
        setTimeout(function() {
            // Adjust text sizes for TRAIN hover divs
            textDiv = $(me).find("#iwsHW_text");
            if (textDiv.parent().attr('class').indexOf('train') < 0)
                return;

            textVal = $(textDiv).html();
            /*
             var deltaTop = 1;
             if (textVal.length > 15) {
             if (textVal.length > 25) {
             $(textDiv).attr(
             'style', "font-size:" + (parseInt($(textDiv).css("font-size"), 10) - 2) + "px !important"
             );
             deltaTop += 2;
             } else {
             $(textDiv).attr(
             'style', "font-size:" + (parseInt($(textDiv).css("font-size"), 10) - 1) + "px !important"
             );
             ++deltaTop
             }
             $(textDiv).css("top", deltaTop + "px");
             }
             */
        }, ((!_$$_666.isIE8) ? 25 : 0));
    },
    // Creates the DIV representing this InfoBox
    _createInfoElement: function() {
        var winID = "";
        var idAdd = "";
        if (!this.div_) {
            if (this.infoWinID) {
                winID = ' id="' + this.infoWinID + '"';
            }
            if (this.type == "search_results") {
                idAdd = "_" + this.type;
            }
            var infoWindowHTML = '<div class="infowindow_wrapper" style="visibility: hidden"' + winID + '>' +
                    '<div class="if_header_left">' +
                    '<div class="if_header_left_corner"></div>' +
                    '<div class="if_header_left_mid_spacer"></div>' +
                    '</div>' +
                    '<div class="if_header_left_content" id="iwsIW_left_content' + idAdd + '"></div>' +
                    '<div class="if_header_crossover"></div>' +
                    '<div class="if_header_right_content" id="iwsIW_right_content' + idAdd + '">&nbsp;</div>' +
                    '<div class="if_header_right">' +
                    '<div class="if_header_right_corner"></div>' +
                    '<div class="if_header_right_mid_spacer"></div>' +
                    '</div>' +
                    '<div class="if_header_close_icon"></div>' +
                    '<div class="if_mid">' +
                    '<div class="if_mid_dotted" style="display:none"></div>' +
                    '<div class="if_mid_content" id="iwsIW_mid_content' + idAdd + '"></div>' +
                    '</div>' +
                    '<div class="if_extra_content" id="iwsIW_extra_content' + idAdd + '"></div>' +
                    '<div class="if_bottom">' +
                    '<div class="if_bottom_left_corner"></div>' +
                    '<div class="if_bottom_mid">&nbsp;</div>' +
                    '<div class="if_bottom_right_corner"></div>' +
                    '</div>';
            if (this.bottom_pointer)
                infoWindowHTML += '<div class="if_pointer"></div>';
            if (this.top_pointer)
                infoWindowHTML += '<div class="if_top_pointer"></div>';
            infoWindowHTML += '</div>';
            this.div_ = $.parseHTML(infoWindowHTML);
        }

        // Change content classes if requested.
        if (typeof this.type != "undefined" && this.type.length > 0) {
            $(this.div_).find("div.if_header_left_content").attr('class', 'if_header_left_content_' + this.type);
            $(this.div_).find("div.if_header_right_content").attr('class', 'if_header_right_content_' + this.type);
            $(this.div_).find("div.if_mid_content").attr('class', 'if_mid_content_' + this.type);
            $(this.div_).find("div.if_extra_content").attr('class', 'if_extra_content_' + this.type);
        }
        this.winCaret_ = $(this.div_).find(this.bottom_pointer ? ".if_pointer" : ".if_top_pointer");
        if (this.dashes) {
            $(this.div_).find(".if_mid_dotted").show();
        }

        this.setContent();

        // Set hover events.
		//TEMP FIX for CMSTEST - the images will not show up in local
		//MB 6/16/2014
        var me = this;
        $(this.div_).find("div.if_header_close_icon").hover(
                function() {
                    $(this).css('background-image', 'url(' + hostConfig.hostPath + '/img/infowindow/AW_closeOver.png)');
                },
                function() {
                    $(this).css('background-image', 'url(' + hostConfig.hostPath + '/img/infowindow/AW_closeUp.png)');
                }
        );
        $(this.div_).find("div.if_header_close_icon").click(function() {
            // Destruction of Info Window Reference
			//BT:3490 - if lastInfoWindow is null, an exception is thrown.
			//MB 6/12/2014
            if(lastInfoWindow!=null){
					if(lastInfoWindow.type == 'train'){					
						//MB 7/24/2014- collapse the train infoWindow when it's closed. otherwise it would show up as expanded.
						//#:3525
						map.collapseInfoWindow();
						lastSelectedTrainDataID = null;
					}					
			}
			me.close();
            if (this.type == "search_results") {
                var sf = $("#search_field");
                if (sf != null) {
                    sf.val('');
                }
            }
            // Stop the event from propagating to the map.
            if (typeof event != "undefined" && event && event.stopPropagation) {
                event.stopPropagation()
            }
        });
    },
    draw: function() {		
        // Creates the element if it doesn't exist already.
        if (!this.div_)
            return;
        if (!this.map)
            return;

        var zoomLevel = map.getZoom();
        var scale = Math.pow(2, zoomLevel);

        // cw: At low enough zoom levels, world coordinates can jump and cause InfoWindow to dissapear. 
        // Need to find suitable adjustment.
        var nw = new google.maps.LatLng(
                map.getBounds().getNorthEast().lat(),
                map.getBounds().getSouthWest().lng()
                );
        var worldCoordinateNW = map.getProjection().fromLatLngToPoint(nw);
        var worldCoordinate = map.getProjection().fromLatLngToPoint(this.anchor.getPosition());
        var pixPosition = new google.maps.Point(
                Math.floor((worldCoordinate.x - worldCoordinateNW.x) * scale),
                Math.floor((worldCoordinate.y - worldCoordinateNW.y) * scale)
                );

        $(this.div_).show();
        var adjustHeight = $(this.div_).find("#iwsIW_mid_content").height() + $(this.div_).find("#iwsIW_extra_content").height();
        if (adjustHeight == null) {
            adjustHeight = 0;
        } else {
            if (!this.hover) {
                adjustHeight += 3;
            }
        }

        // Proper offset depends on size of any content appearing above the map canvas as 
        // well as the height of the middle content.
        var searchDivHeight = $("#search").height();
        $(this.div_).offset({
            left: pixPosition.x + this.offsetHorizontal,
            top: pixPosition.y + this.offsetVertical - adjustHeight + searchDivHeight
        });
    },
    hideCaret: function() {
        this.winCaret_.hide();
    },
    showCaret: function() {
        this.winCaret_.show();
    }

});

