/*
 Developed by: IT WORKS! Inc.
 Website: http://www.itworksdc.com/
 Copyright 2013 by IT WORKS! Inc.
 
 Date last modified: $Date$
 */


/* jQuery must be loaded first! */

// cw: There are better ways to subclass, but not the time to implement them. See: 
//		http://ejohn.org/blog/simple-javascript-inheritance/

$.extend(ClusterIcon.prototype, {
    // @Override
    onAdd: function() {
        var cClusterIcon = this;
        var cMouseDownInCluster;
        var cDraggingMapByCluster;

        this.div_ = document.createElement("div");
        this.div_.className = this.className_;
        if (this.visible_) {
            this.show();
        }

        this.getPanes().overlayMouseTarget.appendChild(this.div_);

        // Fix for Issue 157
        this.boundsChangedListener_ = google.maps.event.addListener(this.getMap(), "bounds_changed", function() {
            cDraggingMapByCluster = cMouseDownInCluster;
        });

        google.maps.event.addDomListener(this.div_, "mousedown", function() {
            cMouseDownInCluster = true;
            cDraggingMapByCluster = false;
        });

        google.maps.event.addDomListener(this.div_, "click", function(e) {           
            // Remove references to persistent Train Info Windows when cluster is clicked
            if (lastInfoWindow != null) {
                if (lastInfoWindow.type == 'train') {
                    lastInfoWindow.close();
                    lastSelectedTrainDataID = null;
                }
                lastInfoWindow = null;
            }

            cMouseDownInCluster = false;
            if (!cDraggingMapByCluster) {
                var theBounds;
                var mz;
                var mc = cClusterIcon.cluster_.getMarkerClusterer();

                // BEGIN IWS Addition. Insure we close the last opened infowindow
                if (lastInfoWindow) {
                    lastInfoWindow.remove();
                }
                // END IWS Addition. 

                /**
                 * This event is fired when a cluster marker is clicked.
                 * @name MarkerClusterer#click
                 * @param {Cluster} c The cluster that was clicked.
                 * @event
                 */
                google.maps.event.trigger(mc, "click", cClusterIcon.cluster_);
                google.maps.event.trigger(mc, "clusterclick", cClusterIcon.cluster_); // deprecated name

                // The default click handler follows. Disable it by setting
                // the zoomOnClick property to false.
                if (mc.getZoomOnClick()) {
                    // Zoom into the cluster.
                    mz = mc.getMaxZoom();
                    theBounds = cClusterIcon.cluster_.getBounds();
                    mc.getMap().fitBounds(theBounds);
                    // There is a fix for Issue 170 here:
                    setTimeout(function() {
                        mc.getMap().fitBounds(theBounds);
                        // Don't zoom beyond the max zoom level
                        if (mz !== null && (mc.getMap().getZoom() > mz)) {
                            mc.getMap().setZoom(mz + 1);
                        }
                    }, 100);
                }

                // Prevent event propagation to the map:
                cancelEvent(e);
            }
        });

        google.maps.event.addDomListener(this.div_, "mouseover", function(e) {
            var mc = cClusterIcon.cluster_.getMarkerClusterer();
            /**
             * This event is fired when the mouse moves over a cluster marker.
             * @name MarkerClusterer#mouseover
             * @param {Cluster} c The cluster that the mouse moved over.
             * @event
             */
            google.maps.event.trigger(mc, "mouseover", cClusterIcon.cluster_, e);
            cancelEvent();
        });

        google.maps.event.addDomListener(this.div_, "mouseout", function(e) {
            var mc = cClusterIcon.cluster_.getMarkerClusterer();
            /**
             * This event is fired when the mouse moves out of a cluster marker.
             * @name MarkerClusterer#mouseout
             * @param {Cluster} c The cluster that the mouse moved out of.
             * @event
             */
            google.maps.event.trigger(mc, "mouseout", cClusterIcon.cluster_, e);
            cancelEvent();
        });

        google.maps.event.addDomListener(this.div_, "mousemove", cancelEvent);
    }
});

$.extend(MarkerClusterer.prototype, {
    // @Override
    onAdd: function() {
        var cMarkerClusterer = this;

        this.activeMap_ = this.getMap();
        this.ready_ = true;

        this.repaint();

        // Add the map event listeners
        this.listeners_ = [
            google.maps.event.addListener(this.getMap(), "zoom_changed", function() {
                cMarkerClusterer.resetViewport_(false);
                // Workaround for this Google bug: when map is at level 0 and "-" of
                // zoom slider is clicked, a "zoom_changed" event is fired even though
                // the map doesn't zoom out any further. In this situation, no "idle"
                // event is triggered so the cluster markers that have been removed
                // do not get redrawn. Same goes for a zoom in at maxZoom.
                if (this.getZoom() === (this.get("minZoom") || 0) || this.getZoom() === this.get("maxZoom")) {
                    google.maps.event.trigger(this, "idle");
                }
                if (typeof cMarkerClusterer.clusterDiv_ != "undefined" && cMarkerClusterer.clusterDiv_) {
                    cMarkerClusterer.removeHoverDiv();
                }
            }),
            // To insure we redraw the hover div properly.
            google.maps.event.addListener(this.getMap(), "bounds_changed", function() {
                cMarkerClusterer.redraw_();
            }),
            google.maps.event.addListener(this.getMap(), "idle", function() {
                cMarkerClusterer.redraw_();
            })
        ];
    },
    attachHoverDiv: function(c, t, opts) {
        var divHTML =
                "<div class=\"clusterHoverDiv\">" +
                "	<div class=\"clusterHoverDiv_text\" id=\"iwsCD_clusterText\"></div>" +
                "</div>";

        this.clusterDiv_ = $.parseHTML(divHTML);
        $(this.clusterDiv_).find("#iwsCD_clusterText").html(t);

        // Note, using a jQuery object so we must refer to the DOM object.
        var panes = this.getPanes();
        panes.floatPane.appendChild(this.clusterDiv_[0]);

        // To prevent flashing we show this only once.
        $(this.clusterDiv_).css("background-image", "url(" + opts.src + ")");
        $(this.clusterDiv_).css("width", opts.width + "px");
        $(this.clusterDiv_).css("height", opts.height + "px");

        // Try to prevent flickering
        google.maps.event.addDomListener(this.clusterDiv_[0], 'mousemove', cancelEvent);
        google.maps.event.addDomListener(this.clusterDiv_[0], 'mouseout', cancelEvent);
        google.maps.event.addDomListener(this.clusterDiv_[0], 'blur', cancelEvent);

        lastHover = this;

        this.centerPoint_ = c.getCenter();
        this.hoverOffsetX_ = opts.offsetX;
        this.hoverOffsetY_ = opts.offsetY;
        this.drawHover();
    },
    removeHoverDiv: function() {
        return $(this.clusterDiv_).detach();
        lastHover = null;
    },
    drawHover: function() {
        this.clusterDivCenter_ = this.getProjection().fromLatLngToDivPixel(this.centerPoint_);
        $(this.clusterDiv_).css("left", (this.clusterDivCenter_.x - this.hoverOffsetX_) + "px");
        $(this.clusterDiv_).css("top", (this.clusterDivCenter_.y - this.hoverOffsetY_) + "px");
    }
});

$.extend(google.maps.Marker.prototype, {
    attachHoverDiv: function(c, t, opts) {
        var divHTML =
                "<div class=\"clusterHoverDiv\">" +
                "	<div class=\"clusterHoverDiv_text\" id=\"iwsCD_clusterText\"></div>" +
                "</div>";

        this.clusterDiv_ = $.parseHTML(divHTML);
        $(this.clusterDiv_).find("#iwsCD_clusterText").html(t);

        // Note, using a jQuery object so we must refer to the DOM object.
        var panes = this.getPanes();
        panes.floatPane.appendChild(this.clusterDiv_[0]);

        // To prevent flashing we show this only once.
        $(this.clusterDiv_).css("background-image", "url(" + opts.src + ")");
        $(this.clusterDiv_).css("width", opts.width + "px");
        $(this.clusterDiv_).css("height", opts.height + "px");

        this.centerPoint_ = c.getCenter();
        this.hoverOffsetX_ = opts.offsetX;
        this.hoverOffsetY_ = opts.offsetY;
        this.drawHover();
    },
    removeHoverDiv: function() {
        return $(this.clusterDiv_).detach();
    },
    drawHover: function() {
        this.clusterDivCenter_ = this.getProjection().fromLatLngToDivPixel(this.centerPoint_);
        $(this.clusterDiv_).css("left", (this.clusterDivCenter_.x - this.hoverOffsetX_) + "px");
        $(this.clusterDiv_).css("top", (this.clusterDivCenter_.y - this.hoverOffsetY_) + "px");
    }
});