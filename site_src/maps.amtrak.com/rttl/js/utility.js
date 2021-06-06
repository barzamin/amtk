/*
 Developed by: IT WORKS! Inc.
 Website: http://www.itworksdc.com/
 Copyright 2013 by IT WORKS! Inc.
 
 Date last modified: $Date: 2013-10-21 12:26:15 -0400 (Mon, 21 Oct 2013) $
 */

Date.now = Date.now || function() {
    return +new Date();
};

// Helper functions that need to be loaded before other JS files.
function log(l) {
    if (typeof console != "undefined" && _$$_666.debug) {
        console.log(l);
    }
}

function cancelEvent(e) {
    if (typeof e != "undefined" && e) {
        e.cancelBubble = true;
        if (e.stopPropagation)
            e.stopPropagation();
    }
}

function formatComment(c) {  
	
	if (c === "cancel")
        return "cancelled";
    
    c = c.toLowerCase().replace(/0(\d+)/g, "$1");
    if(c.indexOf('min') === -1)
        c = c.replace('mi', 'min');
    
    return c;
}
;

// Extend String prototype with repeat helper function.
// Once again we crib from SO: http://stackoverflow.com/questions/202605/repeat-string-javascript
String.prototype.repeat = function(num)
{
    return new Array(num + 1).join(this);
}

// Extend jQuery to add the following helper functions.
jQuery.fn.visible = function() {
    return this.css('visibility', 'visible');
};

jQuery.fn.invisible = function() {
    return this.css('visibility', 'hidden');
};

if (!google.maps.LatLngBounds.prototype.getDimensions) {
    google.maps.LatLngBounds.prototype.getDimensions = function() {
        if (!google.maps.geometry || !google.maps.geometry.spherical) {
            // Routine requires the "geometry" library
            throw "getDimension() requires Google geometry library."
        }

        var center = this.getCenter();
        var ne = this.getNorthEast();
        var sw = this.getSouthWest();
        var se = new google.maps.LatLng(sw.lat(), ne.lng());
        var geo = google.maps.geometry.spherical;

        return {
            height: geo.computeDistanceBetween(ne, se),
            width: geo.computeDistanceBetween(se, sw)
        };
    }
}

if (!google.maps.LatLngBounds.prototype.multiply) {
    // Return a LatLngBounds representing the area of the original bounds multiplied by 
    // factor, f
    google.maps.LatLngBounds.prototype.multiply = function(f) {
        if (!google.maps.geometry || !google.maps.geometry.spherical) {
            // Routine requires the "geometry" library
            throw "multiply() requires Google geometry library."
        }

        var geo = google.maps.geometry.spherical;
        var dim = this.getDimensions();
        var center = this.getCenter();
        var newDist = f * Math.sqrt(
                //f * (Math.pow(dim.width, 2) + Math.pow(dim.height, 2))
                        (Math.pow(dim.width, 2) + Math.pow(dim.height, 2))
                        ) / 2;
        var diagHeading = geo.computeHeading(center, this.getNorthEast());

        // Use heading from OLD NE and SW!!!
        return new google.maps.LatLngBounds(
                geo.computeOffset(center, newDist, diagHeading),
                geo.computeOffset(center, newDist, diagHeading + 180)
                );
    }
}

function DynamicMapsEngineLayerSupport() {
    return (typeof (routeLayer.getFeatureStyle) == 'function');
}

function silentErrorHandler() {
    return true;
}