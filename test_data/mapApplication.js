/*
 Developed by: IT WORKS! Inc.
 Website: http://www.itworksdc.com/
 Copyright 2015 by IT WORKS! Inc.
 
 Date last modified: $Date$
 */
var map;
var __$$__dd; // used for storing the data returned from __$$__dd so we can query against it
var autoCompleter;
var searchWindow;
var sortedTrains; // used to store array of train objects returned from the search results
var lastValidCenter;
var redrawInfoWindowWhenIdle = false;
var lastInfoWindow = null;
var lastSearchInfoWindow = null;
var lastHover = null;
var lastSelectedFeatures = null;
var __$$_lastSelTrDa = null;
var lastSelectedTrainNumber = null;
var lastSelectedStationID = null;
var lastZoomLevel = null;
var refreshInterval = 0;
var timeoutInterval = 0;
var markerClusterer = null;
var filteredMarkers = [];
var featureIDs = [];
var __$$_td = [];
var routes = {};
var stations = {};
var images = {};
var resolver = {
    station_city: {},
    station_name: {},
    trains: {},
    routes: {},
    routeTrains: {}
};
var __$$_tm = new google.maps.MVCArray();
var __$$_tdr = 0;
var __$$_sdr = 0;
var zoomEventCount = 0;
var offsetSearchWindowCount = 0;
/*
__$$_jmd - public key
masterSegment - length of data to be extracted from the encrypted response - 55 is just a fake
//FAKE VARIABLES to throw off people hahahahaha
__$_s - salt value
__$_v - iv vale
*/
var __$$_jmd = '';
var masterSegment=55;
var __$_s = '';
var __$_v='';

// cw: We really should not have to do this, but data issues can break the entire 
// app. We can't have that so we have to resort to hacks like this.
var defData = {
    City: "",
    State: "",
    Code: ""
};

var isUnavailable = false;

var LastDate = [];

var date_sort_desc = function(date1, date2) {
// This is a comparison function that will result in dates being sorted in
// DESCENDING order.
    if (date1 > date2)
        return -1;
    if (date1 < date2)
        return 1;
    return 0;
};
/*Fibonacci function from 2-9 -this will sum up to 88 which is the length of data we need to get the private key*/
function returnSegmentData(){
	var i;
	var segmentData = []; //Initialize array!

	segmentData[0] = 0;
	segmentData[1] = 1;
	for(i=2; i<=9; i++)
	{    
		segmentData[i] = segmentData[i-2] + segmentData[i-1];   
	}
	return segmentData;
}

var isChrom = navigator.userAgent.toLowerCase().indexOf('chrome') > -1? true:false;


function resetTimeout() {
    if (timeoutInterval > 0) {
        clearTimeout(timeoutInterval);
    }
    timeoutInterval = setTimeout(sessionTimeout, _$$_666.session_timeout * 1000);
}

function resetGlobals() {
    lastInfoWindow = null;
    lastSearchInfoWindow = null;
    lastHover = null;
    lastSelectedFeatures = null;
    __$$_lastSelTrDa = null;
    lastSelectedTrainNumber = null;
    lastSelectedStationID = null;
}

function sessionTimeout() {
    //hide the tracking unavailable if it conflicts with the session time out	
    //AC comment - don't show timeout window if the tracking is not available. In other words tracking unavailable takes priority over time out.
    //showTrackingUnavailable(false);

    if (!isUnavailable) {
        $(window).resize();
        $("#timeout").show();
        $("#timeout_content").show();
        $("#search_button").prop('disabled', true);
        if (typeof searchWindow != "undefined" && searchWindow != null) {
            searchWindow.close();
        }
        clearTimeout(refreshInterval);
    }
}

function showTrackingUnavailable(show) {
    //Bugfix: 3298
    //MB 10/7/2013
    if(_$$_666.debug) return;
    if (show) {
        $(window).resize();
        $("#unavailable").show();
        $("#unavailable_content").show();
        $("#search_button").prop('disabled', true);
        if (typeof searchWindow != "undefined" && searchWindow != null) {
            searchWindow.close();
        }
        clearTimeout(refreshInterval);
    }
    else {
        $("#unavailable").hide();
        $("#unavailable_content").hide();
        $("#search_button").prop('disabled', false);
    }
}

function showCompatWindow() {
    //the overridden function will not come into the picture if we are checking for compat mode on the initializiation.
    $('.compatmode_content').css({
        top: ($('#compatmode').outerHeight(false) - $('.compatmode_content').height()) / 2 + "px",
        left: ($('#compatmode').outerWidth(false) - $('.compatmode_content').width()) / 2 + "px"
    });
    $(window).resize();
    $("#compatmode").show();
    $("#compatmode_content").show();
    $("#search_button").prop('disabled', true);
    if (typeof searchWindow != "undefined" && searchWindow != null) {
        searchWindow.close();
    }
    clearTimeout(refreshInterval);
}

function autoCompleteCallback(req, res) {
    var matches = {
        trains: [],
        station_codes: [],
        station_city: [],
        station_names: [],
        routes: [],
        matched: {}
    };

    resetTimeout();

    var lowerTerm = req.term.toLowerCase();

    var buildStationTerm = function(s) {
        var stName = "";
        if (s.Name.length > 0) {
            stName += " - " + s.Name;
        }
        return (s.City + ", " + s.State + stName + " (" + s.Code + ")");
    }

    var buildStationNameTerm = function(s) {
        var stName = "";
        if (s.Name.length > 0) {
            stName += " - " + s.Name;
        }
        return (s.City + ", " + s.State + stName + " (" + s.Code + ")");
    }

    //default message
    var lblnoResults = "No results found";

    if (req.term.match("^\\d+$")) {
        // Search train numbers only.
        for (t in __$$_td) {
            if (__$$_td[t].properties.TrainNum.indexOf(req.term) == 0) {
                var term = __$$_td[t].properties.TrainNum;
                if (typeof matches.matched[term] == "undefined") {
                    matches.trains.push({label: term + "  " + __$$_td[t].properties.RouteName, id: term});
                    matches.matched[term] = 1;
                }
            }
        }
        //set the no results to be the numeric train search.
        lblnoResults = "There are no active trains that match your search.";
    } else {
        //set the no results to be the alpha search.
        lblnoResults = "There are no routes or stations that match your search.";
        // Process stations first.
        for (s in stations) {
            // Search through station codes as long as length isn't more than 3.
            if (req.term.length <= 3) {
                // Starts with
                if (stations[s].Code.toLowerCase().indexOf(lowerTerm) == 0) {
                    var term = buildStationTerm(stations[s]);
                    if (typeof matches.matched[term] == "undefined") {
                        matches.station_codes.push({label: term, id: s, code: s});
                        matches.matched[term] = 1;
                    }
                }
            }

            // Starts with (composite)
            if (req.term.length >= 3) {
                var cityState = stations[s].City + ", " + stations[s].State;               
				//match the search term in cityState as well.
				//BT:3537 MB 10/13/2014
				if (cityState.toLowerCase().indexOf(lowerTerm) >=0) {
                    term = buildStationTerm(stations[s]);
                    if (typeof matches.matched[term] == "undefined") {
                        matches.station_city.push({label: term, id: s});
                        matches.matched[term] = 1;
                    }
                }

                if (
                    stations[s].Name != null &&
                    typeof stations[s].Name != "undefined" &&
                    stations[s].Name.toLowerCase().indexOf(lowerTerm) >= 0
                ) {
                    var term = buildStationTerm(stations[s]);
                    if (typeof matches.matched[term] == "undefined") {
                        matches.station_names.push({label: term, id: s, sortOrder: stations[s].Name});
                        matches.matched[term] = 1;
                    }
                }
            }
        }


        // Process routes next
        if (req.term.length >= 3) {
            for (r in routes) {
                if (typeof r == "undefined")
                    continue;
                if (r == "__proto__")
                    continue;
                $.each(routes[r].Name.split(" / "), function(i, rte) {
                    var lowerRoute = rte.toLowerCase();
                    if (lowerRoute.indexOf(lowerTerm) >= 0) {
                        matches.routes.push({label: rte, id: lowerRoute});
                    }
                });
            }
        }
    }



    // cw: Return results sorted by category.
    //MB: Display Route info first 3/18/2014
    //Sort the stationcode
    //then the city
    //then the stationname
    matches.routes.sort();
    //Add the horizontal line flag to the last item for the displayed trains
    //And there should be other data that is going to be displayed.
    if (matches.routes.length > 0 && (matches.station_codes.length > 0 || matches.station_city.length > 0 || matches.station_names.length > 0)) {
        matches.routes[matches.routes.length - 1].appendHR = true;
    }
    var results = [].concat(
            matches.routes,
            matches.trains.sort(function(a, b) {
                return parseInt(a.label) - parseInt(b.label)
            }),
            matches.station_codes.sort(function(a, b) {
                return (a.code < b.code) ? -1 : (a.label > b.code) ? 1 : 0
            }),
            matches.station_city.sort(function(a, b) {
                return (a.label < b.label) ? -1 : (a.label > b.label) ? 1 : 0
            }),
            matches.station_names.sort(function(a, b) {
                return (a.sortOrder < b.sortOrder) ? -1 : (a.sortOrder > b.sortOrder) ? 1 : 0
            })
            );

    // Process matches into return.
    res(
            (results.length > 0) ? results : [{id: 0, label: lblnoResults}]
            );
}

function retrieveStationData(data) {

    var stationCount = 0;
    
    
	
	
	$.each(data.features, function(i, d) {		
        if (d.properties.IsTrainSt ===false) {
			return;
        }
        ++stationCount;

        var ID = d.properties.Code;
        var position = new google.maps.LatLng(
                d.geometry.coordinates[1], d.geometry.coordinates[0]
                );
				

        stations[ID] = d.properties;
       
		var stationIcon= calculateIconScaleFromZoomLevel(map.getZoom());
		
	

		stations[ID].marker = new google.maps.Marker({
            position: position,
            icon: stationIcon,
            zIndex: 3,
            clickable: true
        });


		var cityState = d.properties.City + ", " + d.properties.State;
		

        // Populate helper structure for autocomplete.
        if (
            d.properties.Name != null && 
            typeof d.properties.Name != "undefined" && 
            d.properties.Name.length > 0
        ) {
            resolver.station_name[d.properties.Name.toUpperCase()] = ID;
        }
        resolver.station_city[cityState.toLowerCase()] = ID;

        var midContent = '<div class="if_mid_content_station_line">';
        var sType = d.properties.StaType;
        if (
            d.properties.Name != null && 
            typeof d.properties.Name != "undefined" 
            && d.properties.Name.length > 0
        ) {
            midContent += "<span>" + d.properties.Name + "</span><br />";
        }
        midContent += sType + "<br />";
        midContent += d.properties.Address1 + "<br />";
        if (
            d.properties.Address2 != null && 
            d.properties.Address2 != "undefined" && 
            d.properties.Address2.length > 0
        ) {
            midContent += d.properties.Address2;
        }

        sType = sType.toLowerCase();
        iconType = "station";
        if (sType.indexOf("platform") >= 0) {
            if (sType.indexOf("no shelter") >= 0) {
                iconType = "platform";
            }
            else if (sType.indexOf("with shelter") >= 0) {
                iconType = "shelter";
            }
            else {
                iconType = "platform";
            }
        }
		
        var rightContent =
                '<div class="if_station_info">'
                + '<div class="if_station_code">' + ID + '</div>'
                + '<div class="if_station_icon_' + iconType + '">'
        '</div>';
		
		

		//initialize the extra content
		 var extraContent=
                    '<div class="if_train_extra_content">'
                    + '<div class="if_extra_content_train_topborder"></div>'
                    + '<div class="float_left">'
                    + '<div class="if_station_extra_content_status_plus_arr" id="expand_status_button_arr" />'
                    + '</div>'
					+'<div class="float_left centerdiv">&nbsp;</div>'
					+ '<div class="float_right">'
                    + '<div class="if_station_extra_content_status_plus_dep" id="expand_status_button_dep"/>'                 
                    + '</div>'
                    + '</div><div class="imageleft float_left">&nbsp;</div><div class="imageright float_right">&nbsp;</div><div class="if_station_extra_status" id="stationStatus">';

        stations[ID].infoWindow = new iwsInfoWindow({
            dashes: true,
            left_content: cityState.toUpperCase(),
            right_content: rightContent,
            mid_content: midContent,
            extra_content: extraContent,
            position: position,
            anchor: stations[ID].marker,
            bottom_pointer: true,
            offsetHorizontal: -173,
            //MB - offset to pin the infoWindow right next to the station marker.
           // offsetVertical: isChrom===true?-83:-74,
		    offsetVertical: -74,
            type: "station",
            fixup: function(t, d) {
                // Insure we drop font size down slightly to handle long station names.
                if (t.left_content.length > 50) {
                    var lc = $(d).find("#iwsIW_left_content");
                    $(lc).attr('style', 'font-size: ' + (parseInt(lc.css('font-size'), 10) - 1) + "px !important;");
                }

				var statDiv = $(d).find(".if_station_extra_status");
				statDiv.empty();

				var data = setStationStatus(ID);				
				statDiv.html(data.ArrivalContent + data.DepartureContent);
				var statCenter = $(d).find(".centerdiv");
				var statArrLine = $(d).find(".imageleft");
				var statDepLine = $(d).find(".imageright");
                var statDivArr = $(d).find("#stationStatus_arr");
				var statDivDep = $(d).find("#stationStatus_dep");
                
				var statArr = $(d).find("#expand_status_button_arr");
				var statDep = $(d).find("#expand_status_button_dep");

                $( statArr ).click( function(){
                    resetTimeout();
					resetStationStatusWindow(d,false); //reset the departure header
                    if (this.className.indexOf("minus") >= 0) {
                        this.className = 'if_station_extra_content_status_plus_arr';
                        t.showCaret();
	                    statDiv.hide();
						statDivArr.hide();	
						statArrLine.hide();					
						statCenter.show();
                        map.redrawInfoWindow(250);
                        lastInfoWindow.collapsed = true;
                    } else {
                        this.className = 'if_station_extra_content_status_minus_arr';
                        t.hideCaret();
					    statDiv.show();
                        statDivArr.show();
						statArrLine.show();
						statCenter.hide();
                        statDivArr.scrollTop(0);                      
                        lastInfoWindow.collapsed = false;
						
                    }
                });

				$( statDep ).click( function(){                    
                    resetTimeout();
					resetStationStatusWindow(d,true); //reset the arrival header
                    if (this.className.indexOf("minus") >= 0) {
                        this.className = 'if_station_extra_content_status_plus_dep';
                        t.showCaret();
                        statDiv.hide();
						statDivDep.hide();
						statCenter.show();
						statDepLine.hide();
                        map.redrawInfoWindow(250);
                        lastInfoWindow.collapsed = true;
                    } else {
                        this.className = 'if_station_extra_content_status_minus_dep';
                        t.hideCaret();
                        statDiv.show();
						statDivDep.show();
						statCenter.hide();
						statDepLine.show();
                        statDivDep.scrollTop(0);
                        /*if (t.last_station >= 1) {
                            statDiv.scrollTop(
                                    $(d).find("#train_" + ID + "_status_" + t.last_station).position().top
                                    );
                        }*/
                        lastInfoWindow.collapsed = false;
                    }
                });
                statDivArr.hide();
				statDivDep.hide();

				$(d).find('div.train').on('click', function(i,el){
						var ID = $(this).attr('id');
						var arr = [];
						arr.push(__$$_td[ID]);
						filterTrains(arr);
						map.setZoom(_$$_666.item_zoom);
						map.setCenter(__$$_td[ID].marker.getPosition());
						google.maps.event.trigger(__$$_td[ID].marker, "click");
						getRouteLayer('');
				});
			}
        });

        var hoverLength = (cityState.toUpperCase() + " " + ID.toUpperCase()).length;
        var hoverContent = cityState.toUpperCase() + "&nbsp;&nbsp;(" + ID.toUpperCase() + ")";
        var hoverType = "station_";
        if (hoverLength >= 26)
            hoverType += 'long';
        else if (hoverLength >= 17)
            hoverType += 'med';
        else
            hoverType += 'short';

		var yOffset = -34;
		//if(isChrom)
		//	yOffset = -40;

        var hoverOffsets = {
            station_long: {
               // X: -119,
			    X: -130,
				Y: yOffset
                //Y: -22

            },
            station_med: {
               // X: -89,
			    X: -100,
                //Y: -22
				Y: yOffset
            },
            station_short: {
                //X: -67,
				X: -78,
//                Y: -22
				Y: yOffset
            }
        }

        stations[ID].hoverWindow = new iwsInfoWindow({
            hover_content: hoverContent,
            hover: true,
            position: position,
            anchor: stations[ID].marker,
            type: hoverType,
            // cw: Find out why!
            offsetVertical: hoverOffsets[hoverType].Y,
            offsetHorizontal: hoverOffsets[hoverType].X
        });

        stations[ID].events = {};
        stations[ID].events.click =
                new google.maps.event.addDomListener(stations[ID].marker, "click", function(event) {
					__$$_lastSelTrDa = null; // reset this since this is no longer the focus, mainly for refreshActiveTrainsLayer
                    lastSelectedStationID = ID;              
                    resetTimeout();
					//clear out the previous info
                   
                    map.hideHoverWindows();
                    map.hideInfoWindows();

                    lastInfoWindow = stations[ID].infoWindow;
                    lastInfoWindow.setGMap(map);

                    map.setCenter(position);

					 // JW: Determine if we need to zoom or not, affects rendering of info windows
					 //Commented out as it is duplicate behavior - part of 4217 fix.
					/*if ((map.IsDefaultView() || map.ZoomLevelChanged())) {                    
						if (map.MinorZoomTriggered()) {
                            map.redrawInfoWindow(500);						
                        }
                        map.setZoom(_$$_666.item_zoom);
					
					}
					*/

                    // JW: Determine if we need to zoom or not, affects rendering of info windows
                    if ((map.IsDefaultView() || map.ZoomLevelChanged())) {                     
						
						if (map.MinorZoomTriggered()) {							
							map.redrawInfoWindow(500);
                        }

                        // jw: enhancement to prevent clustering from affecting info window rendering
                        // VV 7/1/2014: fix bug in IE8 - check map zoom with _$$_666.item_zoom and redraw infoWindow if different
                        if (map.zoom != _$$_666.item_zoom) {
                            map.setZoom(_$$_666.item_zoom);
                        } else {
                            map.redrawInfoWindow(500);
                        }
                    }

					lastInfoWindow.draw();
                    lastInfoWindow.show();
					
					map.redrawInfoWindow(500);
                    // Reset event counts
                    zoomEventCount = 0; 
                    // Prevent original info window from showing. -- DOMListener only?
                    //cancelEvent(event);

                });

        stations[ID].events.mouseover =
                new google.maps.event.addDomListener(stations[ID].marker, "mouseover", function(event) {					
					//BT: 3538 - hover window would show up after you clicked after opening the infoWindow.
					if(lastInfoWindow==stations[ID].infoWindow){
							return;
					}
					if (lastHover) {
						return;
                    }			

                    lastHover = stations[ID].hoverWindow;
                    lastHover.setGMap(map);
                    lastHover.show();
                    // Prevent original info window from showing.					
                    cancelEvent(event);
                });

        stations[ID].events.mouseout = new google.maps.event.addDomListener(stations[ID].marker, "mouseout", function(event) {			
			
			if (lastHover === null) {
                return;
            }
            if (lastHover.removeHoverDiv) {
                lastHover.removeHoverDiv();
                lastHover = null;
                return;
            }
            lastHover.remove();
			lastHover.setGMap(null);
            lastHover = null;
			
			map.hideHoverWindows();
            // Prevent original info window from showing.
           // cancelEvent(event);
        });
    });

    if (_$$_666.debug)
        log("Stations Fetched: " + stationCount);

    // Load active trains after stations have finished.
    setTimeout(__$$_ratl, _$$_666.train_layer_delay);
}

function setStationStatus(ID){
    var extraContentArr = '<div id="stationStatus_arr">';
    var stationStatus = getStationStatus( ID );
    // IF THERE ARE NO ARRIVALS, PUT A 'NO SCHEDULED TRAINS' MESSAGE
    if( !stationStatus.arrivalStatus.length )
        extraContentArr += '<div class="if_station_extra_status_row bold text_center">No Scheduled Trains</div>';
    // LOOP THROUGH ARRIVALS ...
    $.each( stationStatus.arrivalStatus, function( i, status ){
        $.each( status.stationStatus, function( index, field ){ // LOOP THROUGH STATIONSTATUS FIELDS ...
            // IF THE FIELD MATCHES THE 'STATION_N' FORMAT ...
            var matches = index.match( /^station(\d+)/ ); 
            if( matches ){
                // IF THERE IS NOTHING SET FOR THIS FIELD, OR IF THE FIELD IS NOT AN OBJECT, CONTINUE TO NEXT FIELD
                if( !field || typeof field !== 'object' ) return true;
                // BUILD THE STATION INFO MARKUP AND ADD IT TO THE EXTRACONTENTARR VAR
                var hasSchCmnt = (
                    typeof field.schcmnt !== "undefined" &&
                    field.schcmnt !== null &&
                    field.length > 0
                );
                var hasCancellation = hasSchCmnt && field.toUpperCase() === "CANCELED";
                var hasPostArr = (typeof field.postarr != "undefined" && field.postarr != null);
                var hasEstArr = (typeof field.estarr != "undefined" && field.estarr != null);
                var hasSchArr = (typeof field.scharr != "undefined" && field.scharr != null);
                var hasSchDep = (typeof field.schdep != "undefined" && field.schdep != null);
                var noStatus = (field.postcmnt == "ARRIVED");
                var notLast = true;
                var blue = ((hasPostArr || hasCancellation) ? " text_grey" : " text_blue underlined pointer train");
                var blueDate = ((hasPostArr || hasCancellation) ? " text_grey" : " text_blue");
                var black = ((hasPostArr) ? " text_grey" : " text_black");
                var grey = ((notLast || hasSchCmnt) ? " text_grey" : "");
                if( hasPostArr || hasEstArr || hasSchArr || hasSchDep ){
                    // SHOW THE TRAINNUM, LINKING OR NOT LINKING DEPENDING ON THE SHOWMARKER VALUE
                    if( status.stationStatus.showmarker == 'Y' ){
                        extraContentArr += ( status.showmarker == 'Y' )?
                            '<div class="if_station_extra_status_row"><div class="if_station_extra_status_station '+ blue + '" id=' + status.ActiveTrainId + '>' + status.TrainNum + '</div><div class="if_station_extra_status_station '+ blueDate +' trainDate">'+ moment(status.datetoSort).format('MMMM D, YYYY') + '</div>' :  
                            '<div class="if_station_extra_status_row"><div class="if_station_extra_status_station float_left text_black" id=' + status.ActiveTrainId + '>' + status.TrainNum + '</div><div class="if_station_extra_status_station '+ blueDate +' trainDate">'+ moment(status.datetoSort).format('MMMM D, YYYY') + '</div>';
                    } else {
                        if( blueDate == ' text_blue') blueDate = ' text_black';
                        extraContentArr += '<div class="if_station_extra_status_row"><div class="if_station_extra_status_station float_left text_black" id=' + status.ActiveTrainId + '>' + status.TrainNum + '</div><div class="if_station_extra_status_station '+ blueDate +' trainDate">'+ moment(status.datetoSort).format('MMMM D, YYYY') + '</div>';
                    }
                    var schDate = ( hasSchArr )? field.scharr : field.schdep;
                    if( hasCancellation ){
                        extraContentArr +=
                            '<div class="if_station_extra_status_label float_left text_grey">Scheduled</div>' +
                            '<div class="if_station_extra_status_times float_left text_grey">'
                            + moment(schDate).format(_$$_666.time_format) + ' '
                            + field.tz + 'T</div>';
                        extraContentArr +=
                            '<div class="if_station_extra_status_comment float_right' + grey + '">' + formatComment(field.schcmnt) + '<div class="if_station_status_'  + evalStationStatus(field.schcmnt) + '"></div></div></div>';
                    } else {
                        if ( hasPostArr ) extraContentArr +=
                            '<div class="if_station_extra_status_label float_left text_grey">Arrived</div>' +
                            '<div class="if_station_extra_status_times float_left text_grey">'
                            + moment(field.postarr).format(_$$_666.time_format) + ' '
                            + field.tz + 'T</div>';
                        else if( hasEstArr ){ 
                            extraContentArr +=
                                '<div class="if_station_extra_status_label float_left text_black">Scheduled</div>' +
                                '<div class="if_station_extra_status_times float_left text_black">'
                                + moment(schDate).format(_$$_666.time_format) + ' '
                                + field.tz + 'T</div>';
                            extraContentArr +=
                                '<div class="if_station_extra_status_label float_left text_black">Estimated</div>' +
                                '<div class="if_station_extra_status_times float_left text_black">'
                                + moment(field.estarr).format(_$$_666.time_format) + ' '
                                + field.tz + 'T</div>';        
                        } else if( hasSchArr && !hasPostArr && !hasEstArr ) extraContentArr +=
                            '<div class="if_station_extra_status_label float_left text_black">Scheduled</div>' +
                            '<div class="if_station_extra_status_times float_left text_black">'
                            + moment(schDate).format(_$$_666.time_format) + ' '
                            + field.tz + 'T</div><div class="if_station_extra_status_comment float_right text_black">&nbsp;<div class="if_station_status_none">&nbsp;</div></div>';
                        else extraContentArr +=
                            '<div class="if_station_extra_status_label float_left text_black">Scheduled</div>' +
                            '<div class="if_station_extra_status_times float_left text_black">'
                            + moment(schDate).format(_$$_666.time_format) + ' '
                            + field.tz + 'T</div>';
                        var c = (hasSchCmnt) ?
                            field.schcmnt :
                            (hasPostArr) ? field.postcmnt : field.estarrcmnt;
                        if( typeof c!=='undefined' )
                            extraContentArr +=
                                '<div class="if_station_extra_status_comment float_right' + black + '">' + formatComment(c) + '<div class="if_station_status_'  + evalStationStatus(c) + '"></div></div>';	
                        extraContentArr += '</div>';        
                    }
                }
            }
        });
    });
    extraContentArr += '</div>';    
    var extraContentDep = '<div id="stationStatus_dep">';     
    // IF THERE ARE NO DEPARTURES, PUT A 'NO SCHEDULED TRAINS' MESSAGE   
    if( !stationStatus.departureStatus.length )
        extraContentDep+= '<div class="if_station_extra_status_row bold text_center">No Scheduled Trains</div>';
    // LOOP THROUGH DEPARTURES ...
    $.each( stationStatus.departureStatus, function( i, status ){
        $.each( status.stationStatus, function( index, field ){ // LOOP THROUGH STATIONSTATUS FIELDS ...
            // IF THE FIELD MATCHES THE 'STATION_N' FORMAT ...
            var matches = index.match( /^station(\d+)/ ); 
            if( matches ){
                // IF THERE IS NOTHING SET FOR THIS FIELD, OR IF THE FIELD IS NOT AN OBJECT, CONTINUE TO NEXT FIELD
                if( !field || typeof field !== 'object' ) return true;
                // BUILD THE STATION INFO MARKUP AND ADD IT TO THE EXTRACONTENTDEP VAR
                var hasSchCmnt = (
                    typeof field.schcmnt !== "undefined" &&
                    field.schcmnt !== null &&
                    field.schcmnt.length > 0
                );
                var hasCancellation = hasSchCmnt && field.schcmnt.toUpperCase()==="CANCELED";
                var hasPostDep = ( typeof field.postdep != "undefined" && field.postdep != null );
                var hasEstDep = ( typeof field.estdep != "undefined" && field.estdep != null );
                var hasSchDep = ( typeof field.schdep != "undefined" && field.schdep != null );
                var noStatus = ( field.postcmnt == "DEPARTED" );
                var notLast = true;
                var blue = ( hasPostDep  || hasCancellation )? " text_grey" : " text_blue underlined pointer train";
                var blueDate = ( hasPostDep  || hasCancellation )? " text_grey" : " text_blue";
                var black = hasPostDep ? " text_grey" : " text_black";
                var grey = ( notLast || hasSchCmnt )? " text_grey" : "";
                if( hasPostDep ||  hasEstDep || hasSchDep ){
                    if( status.stationStatus.showmarker == 'Y' )
                        extraContentDep += '<div class="if_station_extra_status_row"><div class="if_station_extra_status_station '+ blue + '" id=' + status.ActiveTrainId + '>' + status.TrainNum + '</div><div class="if_station_extra_status_station '+ blueDate +' trainDate">'+ moment(status.datetoSort).format('MMMM D, YYYY') + '</div>';
                    else {
                        if( blueDate == ' text_blue') blueDate = ' text_black';
                        extraContentDep += '<div class="if_station_extra_status_row"><div class="if_station_extra_status_station float_left text_black" id=' + status.ActiveTrainId + '>' + status.TrainNum + '</div><div class="if_station_extra_status_station '+ blueDate +' trainDate">'+ moment(status.datetoSort).format('MMMM D, YYYY') + '</div>';
                    }
                    if( hasCancellation ){
                        extraContentDep +=
                            '<div class="if_station_extra_status_label float_left text_grey">Scheduled</div>' +
                            '<div class="if_station_extra_status_times float_left text_grey">'
                            + moment(field.schdep).format(_$$_666.time_format) + ' '
                            + field.tz + 'T</div>';
                        extraContentDep +=
                            '<div class="if_station_extra_status_comment float_right' + grey + '">' + formatComment(field.schcmnt) + '<div class="if_station_status_'  + evalStationStatus(field.schcmnt) + '"></div></div></div>';
                    } else {
                        if( hasPostDep )					
                            extraContentDep +=
                                '<div class="if_station_extra_status_label float_left text_grey">Departed</div>' +
                                '<div class="if_station_extra_status_times float_left text_grey">'
                                + moment(field.postdep).format(_$$_666.time_format) + ' '
                                + field.tz + 'T</div>';
                        else if( hasEstDep ){							
                            extraContentDep +=
                                '<div class="if_station_extra_status_label float_left text_black">Scheduled</div>' +
                                    '<div class="if_station_extra_status_times float_left text_black">'
                                    + moment(field.schdep).format(_$$_666.time_format) + ' '
                                    + field.tz + 'T</div>';
                            extraContentDep +=
                                '<div class="if_station_extra_status_label float_left text_black">Estimated</div>' +
                                '<div class="if_station_extra_status_times float_left text_black">'
                                + moment(field.estdep).format(_$$_666.time_format) + ' '
                                + field.tz + 'T</div>';
                        } else if( hasSchDep && !hasPostDep && !hasEstDep )
                            extraContentDep +=
                                '<div class="if_station_extra_status_label float_left text_black">Scheduled</div>' +
                                '<div class="if_station_extra_status_times float_left text_black">'
                                + moment(field.schdep).format(_$$_666.time_format) + ' '
                                + field.tz + 'T</div><div class="if_station_extra_status_comment float_right text_black">&nbsp;<div class="if_station_status_none">&nbsp;</div></div>';		
                        var c = hasSchCmnt?
                            field.schcmnt :
                            (hasPostDep) ? field.postcmnt : field.estdepcmnt;
                        if( typeof c!=='undefined' )
                            extraContentDep +=
                                '<div class="if_station_extra_status_comment float_right' + black + '">' + formatComment(c) + '<div class="if_station_status_'  + evalStationStatus(c) + '"></div></div>';	
                        extraContentDep += '</div>';    
                    }
                }
            }
        });
    });
    extraContentDep += '</div>';
    return { ArrivalContent:  extraContentArr, DepartureContent:  extraContentDep };
}
function getStationStatus( stationCode ){
    var arrivalStatus = [], departureStatus = [], arrStationStatus = [];    
    // GET STATION DATA FROM VALL_TTM_TRAINS VIEW VIA ASYNC AJAX CALL CARTO SQL API
  

    var newURL = _$$_666.vAllTrainsURL;

  

    $.ajax({
        type: 'GET',
        url: newURL,
        dataType: 'json',
        success: function( data ) {
           
            // LOOP THROUGH THE DATA AND BUILD OUT THE ARRSTATIONSTATUS ARRAY
            $.each( data.features, function(i,f){
arrStationStatus.push({
                    TrainNum: f.properties.trainnum + ' ' + f.properties.routename,
                    ActiveTrainId: f.properties.id,
                    stationStatus: f.properties,
                    showmarker: f.properties.showmarker
                });
            });
            // LOOP THRU THE ARRSTATIONSTATUS ARRAY ...
            $.each( arrStationStatus, function( i, status ){
                // LOOP THROUGH EACH ITEM'S STATIONSTATUS ARRAY ...
                $.each( status.stationStatus, function( index, field ){ // LOOP THRU FIELDS
                    // SEE IF INDEX MATCHES 'STATION_N' FORMAT
                    var matches = index.match( /^station(\d+)/ ); 
                    if( matches ){ // IF THERE'S A MATCH ...
                        // IF THERE IS NOTHING SET FOR THIS FIELD, CONTINUE TO NEXT FIELD
                        if( !field ) return true; 
                        var fields = JSON.parse( field ); // JSON PARSE THE FIELD TO CREATE FIELDS
                        // CHECK TO SEE IF THIS STATION'S CODE MATCHES THE ONE WE WANT
                        if( fields.code == stationCode ){
                            status.datetoSort = ( typeof fields.schdep !== 'undefined' )? 
                            fields.schdep : fields.scharr;
                            var hasPostArr = (typeof fields.postarr != "undefined" && fields.postarr != null);
                            var hasEstArr = (typeof fields.estarr != "undefined" && fields.estarr != null);
                            var hasSchArr = (typeof fields.scharr != "undefined" && fields.scharr != null);
                            var hasSchDep = (typeof fields.schdep != "undefined" && fields.schdep != null);
                            if( hasPostArr || hasEstArr || hasSchArr ) arrivalStatus.push( status );
                            else if( 
                                typeof status.stationStatus.postcmnt !== 'undefined' && status.stationStatus.postcmnt === 'ARRIVED' 
                            ) arrivalStatus.push( status );
                            var hasPostDep = (typeof fields.postdep != "undefined" && fields.postdep != null);
                            var hasEstDep = (typeof fields.estdep != "undefined" && fields.estdep != null);
                            var hasSchDep = (typeof fields.schdep != "undefined" && fields.schdep != null);
                            if( hasPostDep || hasEstDep || hasSchDep ) departureStatus.push( status );
                            // STORE THE STATIONSTATUS DATA AS PARSED DATA RATHER THAN THE JSON STRING
                            status.stationStatus[ index ] = fields;
                        }
                    }
                });
            });
        },
        async: false
    });
    arrivalStatus.sort( customSort );
    departureStatus.sort( customSort );
    return {
        arrivalStatus: arrivalStatus, 
        departureStatus: departureStatus
    }
}
function customSort(a,b) {
    return [a.datetoSort] > [b.datetoSort] ? 1:-1;
}

//function that will only return a 'standara
function getTime(dateString){
		var d = new Date(dateString);		
		var  h = (d.getHours()<10?'0':'') + d.getHours();
		var m = (d.getMinutes()<10?'0':'') + d.getMinutes();
		var retVal = '01/01/2015 ' + h + ':' + m + ':00';		
		return retVal;

}
function resetStationStatusWindow(d,isArrival){
			//isArrival indicates whether to reset the arrival window or departure window.
			
			//Reset the Arrival window.	
			if(isArrival){
				$(d).find(".imageleft").hide();
				$(d).find("#stationStatus_arr").hide();
                
				if($(d).find("#expand_status_button_arr").attr('class').indexOf('minus')>=0){
						$(d).find("#expand_status_button_arr").removeClass('if_station_extra_content_status_minus_arr');
						$(d).find("#expand_status_button_arr").addClass('if_station_extra_content_status_plus_arr');
				}
				
			}
			else{
				$(d).find(".imageright").hide();
				$(d).find("#stationStatus_dep").hide();
                
				if($(d).find("#expand_status_button_dep").attr('class').indexOf('minus')>=0){
						$(d).find("#expand_status_button_dep").removeClass('if_station_extra_content_status_minus_dep');
						$(d).find("#expand_status_button_dep").addClass('if_station_extra_content_status_plus_dep');
				}
				

			}
}


function __$$_lsd() {	
    
	try{
	$.get(_$_sal_5,{
		})	
	.done(function(d){
				var x12 = d.trim();	
				
               retrieveStationData(JSON.parse(__$_s1._$_dcrt(x12.substring(0,x12.length-masterSegment),__$_s1._$_dcrt(x12.substr(x12.length - masterSegment),__$$_jmd).split('|')[masterSegment-88])).StationsDataResponse)
                // cw: FORCE the bloody stations to show at the initial zoom level. If this is not done, there is 
                // a possibility that stations will not show in the initial map load.
                setTimeout(function() {
                    google.maps.event.trigger(map, "zoom_changed");
                }, 500);
	})
	.fail(function(x) {
				retryStationsLayer();
            });

	}catch(err){
		log(err);
	}
}

function resetAllMap() {
    map.hideInfoWindows();
    
    resetTimeout();
    resetMap();
    resetGlobals();
    map.setCenter(_$$_666.map_center);
    map.setZoom(_$$_666.map_options.zoom);
    // vv: repopulate the map instruction text when user hits reset button
    $('#search_field').val('Track by Train Name, Train Number or Station');
    $('#search_id_hidden').val('Track by Train Name, Train Number or Station');
}



function retrieveRouteList(data) {
	var masterZoom = 0;
	$.each(data, function(i, d) {
        var ID = d.CMSID;
        if (typeof routes[ID] == "undefined") {
            routes[ID] = d;
			if (typeof d.ZoomLevel!=='undefined')
			{
				masterZoom += parseInt(d.ZoomLevel);
			}
        }

        // cw: Handle names resolver.
        $.each(d.Name.split(" / "), function(i, n) {			
            var routeLower = n.toLowerCase();
            if (typeof resolver.routes[routeLower] == "undefined") {
                resolver.routes[routeLower] = routes[ID];
            }
        });
    });

    $.getJSON(_$$_666.route_properties_url, function(data) {
        
        $.each(data.features, function(i, d) {
            $.each(d.properties.NAME.split(" / "), function(i, n) {
                var r = resolver.routes[n.toLowerCase()];
                if (typeof r == "undefined" && _$$_666.debug) {
                    log("Skipping undefined route " + n);
                    return;
                }
                if (typeof r.boxes == "undefined") {
                    r.boxes = [{
                            north: d.properties.NORTH,
                            east: d.properties.EAST,
                            south: d.properties.SOUTH,
                            west: d.properties.WEST
                        }];
                    r.gx_ids = [d.properties.gx_id];
                } else {
                    r.boxes.push({
                        north: d.properties.NORTH,
                        east: d.properties.EAST,
                        south: d.properties.SOUTH,
                        west: d.properties.WEST
                    });
                    r.gx_ids.push(d.properties.gx_id);
                }
                featureIDs.push(d.properties.gx_id);
            });
        });
        featureIDs = $.unique(featureIDs);

        for (r in resolver.routes) {
            var rt = resolver.routes[r];
            if (typeof rt == "undefined" && _$$_666.debug) {
                log("No resolver for " + r);
                continue;
            }
            if (typeof rt.boxes == "undefined" && _$$_666.debug) {
                log("No box definition for " + r);
                continue;
            }
            $.each(rt.boxes, function(i, box) {
                var b = new google.maps.LatLngBounds(
                        new google.maps.LatLng(box.south, box.west),
                        new google.maps.LatLng(box.north, box.east)
                        );
                if (typeof rt.bounds == "undefined") {
                    rt.bounds = new google.maps.LatLngBounds();
                }
                rt.bounds.union(b);
            });
        }
    });	
	 $.getJSON(_$$_666.route_listview_url, function(data) {		
		 /*MasterZoom is the sum of the zoom levels from the routes_list.json file. That is the index in the routesList.v.json -> arr array where we have the public key stored. 
		IF THE ROUTES_LIST CHANGES, REMEMBER TO CHANGE THE INDEX TO BE CORRECT */
		__$$_jmd = (data.arr[masterZoom]);
		
		/*Salt Value - the element is at the 8th position. So we can essentially pick any number from 0-100 (length of the s array in the file), get the length of the element, and then go to that index
		the following funky looking code will evaluate to 8. Salt has a length of 8
		*/
		__$_s1._$_s = data.s[data.s[Math.floor(Math.random() * (data.s.length + 1))].length]; 
		
		/*Initialization Vector Value - the element is at the 32th position. So we can essentially pick any number from 0-100 (length of the IV array in the file), get the length of the element, and then go to that index
		the following funky looking code will evaluate to 32 - IV has a length of 32		
		*/
		__$_s1._$_i = data.v[data.v[Math.floor(Math.random() * (data.v.length + 1))].length];
		
	 });
	 getSegments();
}

function getSegments(){		
		masterSegment=masterSegment-55; //55 is a throw off that's initialized in the code.
			for(var j=0;j<returnSegmentData().length;j++){
				masterSegment+= returnSegmentData()[j];
		}
}

function initialize() {
    // cw: JSONP, MUST have "callback=?" as part of the URL.
    // here we are calling a JSON file which means that we need to prefix the
    // callback to use "?", not "&"
    $.getJSON(_$$_666.route_list_url, {
        dataType: 'json',
        contentType: 'application/json',
        crossDomain: true,
        cache: false
    })
            .done(retrieveRouteList)
            .fail(function(x) {
                // cw: Should have retry logic here as well!
                if (_$$_666.debug)
                    log("Failed to retrieve route list data.");
            });

    var newStyle = "";
    var imgLoading = 0;
    if (!_$$_666.isIE8) {
        newStyle = $('<style type="text/css"></style>');
        $(newStyle).appendTo('head');
    }
    $.each(_$$_666.images, function(i, s) {
        var dynImage = new Image();
        var imgKey = s[0];
        var baseName = s[0].match("([^/]+)$");
        if (baseName != null) {
            imgKey = baseName[0];
        }
        imgLoading++;
        dynImage.onload = function() {
            images[imgKey] = {
                width: this.width,
                height: this.height,
                src: this.src
            };

            if (typeof s[1] == "object") {
                $.extend(images[imgKey], s[1]);
            } else if (typeof s[1] == "function") {
                var result = s[1](this, newStyle);
                if (_$$_666.isIE8 && typeof result != "undefined") {
                    newStyle += result;
                }
            } else {
                var styleName = s[1];
                if (typeof styleName != "undefined") {
                    var newStyleElem = "." + styleName + " { "
                            + "background-image: url(" + this.src + "); "
                            + "width: " + this.width + "px; "
                            + "height: " + this.height + "px; "
                            + ((s.length > 2 && typeof s[2] != "undefined") ? s[2] : "")
                            + " } \n";
                    if (_$$_666.isIE8) {
                        newStyle += newStyleElem + "\n";
                    } else {
                        $(newStyle).append(newStyleElem);
                    }
                }
            }
            imgLoading--;
        }
        dynImage.src = hostConfig.hostPath + "/img/" + s[0] + ".png";
    });
    // cw: XXX - chicken and egg problem. How do you know all of the onload functions have finished?
    // If images have added styles, apply them.
    //if (newStyle.length > 0) {
    //	$('head').append('<style type="text/css">\n' + newStyle + "</style>");
    //}

    var imgInterval = 0;
    setTimeout(function() { imgInterval = setInterval(function() {
        if (imgLoading > 0)
            return;
        if (_$$_666.isIE8) {
            head = document.getElementsByTagName('head')[0],
                    style = document.createElement('style');
            style.type = 'text/css';
            style.styleSheet.cssText = newStyle;
            head.appendChild(style);
        }
        // Load stations data.
        clearInterval(imgInterval);

        __$$_lsd();

    }, 250);
    }, 500);

	
	var mapInitZoom;
    if ($(document).width() > 2000)
        mapInitZoom = 6;
    else if ($(document).width() > 1400)
        mapInitZoom = 5;
    else if ($(document).width() > 1200)
        mapInitZoom = 5;
    else
        mapInitZoom = 4;
	
	_$$_666.map_options.zoom = mapInitZoom;

    map = new google.maps.Map($("#map_canvas")[0], _$$_666.map_options);
    map.SearchType = '';
    map.IsDefaultView = function() {
        return map.zoom == _$$_666.map_options.zoom && zoomEventCount == 1
    };
    map.ZoomLevelChanged = function() {
        return lastZoomLevel != map.zoom;
    };
    map.MinorZoomTriggered = function() {
        return Math.abs(_$$_666.item_zoom - map.zoom) <= 2;
    };
    map.redraw = function() {
        // force a map redraw to make sure info windows are positioned properly
        google.maps.event.trigger(map, 'resize');
    };
    map.redrawInfoWindow = function(v) {
        var timeout = (typeof v === 'undefined') ? _$$_666.redraw_timeout : v;
        // setting a timeout is a complete workaround, but the info windows render properly        
		//setTimeout('lastInfoWindow.draw()', timeout);	
		//MB 7/24/2014- After calling the collapse on the infoWindow, this lastInfoWindow.draw would give an error. hence added the if. 
    	setTimeout('if(lastInfoWindow!==null){lastInfoWindow.draw();}', timeout);
    };
    map.collapseInfoWindow = function() {
        if (lastInfoWindow != null && !lastInfoWindow.collapsed) {
            var btn = $(lastInfoWindow.div_).find('#expand_status_button');

			if(btn.length>0){
				btn.click();			
				btn[0].className = 'if_train_extra_content_status_plus';
			}
        
		//Collapse the stationStatus Window
			var btnArr = $(lastInfoWindow.div_).find('#expand_status_button_arr');

			if(btnArr.length>0 && btnArr.hasClass('if_station_extra_content_status_minus_arr')){
				btnArr.click();			
				btnArr[0].className = 'if_station_extra_content_status_plus_arr';
			}
			
			var btnDep = $(lastInfoWindow.div_).find('#expand_status_button_dep');

			if(btnDep.length>0 && btnDep.hasClass('if_station_extra_content_status_minus_dep')){
				btnDep.click();			
				btnDep[0].className = 'if_station_extra_content_status_plus_dep';
			}
		
		}
    };
    map.hideHoverWindows = function() {
		if (lastHover != null && typeof lastHover.setGMap == "function") {
            lastHover.setGMap(null);
        }
        if (lastHover != null && lastHover.removeHoverDiv) {
            lastHover.removeHoverDiv();
            lastHover = null;
        }
    };
    map.hideInfoWindows = function() {
        if (lastInfoWindow !== null) {           
			map.collapseInfoWindow(); //collapse the infoWindow other wise it will show up as "opened" when the same one is clicked after reset.
			lastInfoWindow.setGMap(null);
            lastInfoWindow.close();     		
		}
    };

    map.hideClusterInfoWindows = function() {
        //6/12/2014 - MB - this was giving an error if the markerClusterer is null. Didn't seem to affect the map.
        if (markerClusterer != null) {
            $.each(markerClusterer.getClusters(), function(i, c) {
                // At the first layer we must narrow down to clusters matching the minimum size
                if (c.getMarkers().length >= _$$_666.clustering_options.minimumClusterSize) {
                    $.each(c.getMarkers(), function(i, m) {
                        // If the __$$_lastSelTrDa value is not null, then we have an open info window.
                        // Narrowing down the close functionality to the open infoWindow
                        if(__$$_lastSelTrDa!==null){
							if (m === __$$_td[__$$_lastSelTrDa].marker) {
								m.infoWindow.setGMap(null);
								m.infoWindow.close();
								__$$_lastSelTrDa = null;
							}
						}
                    });
                }
            });
        }
    };
    map.updateStationMarkers = function() {
        var level = map.getZoom();
        for (s in stations) {
            if (level > _$$_666.zoom_level_resolver[stations[s].MapZmLvl]) {
            
				var stationIcon= calculateIconScaleFromZoomLevel(map.getZoom());									
				stations[s].marker.setIcon(stationIcon);
				stations[s].marker.setMap(map);
			} else {
                stations[s].marker.setMap(null);
            }
        }
    };
    map.updateTrainData = function() {
        for (var i in __$$_td) {
            if (typeof __$$_td[i] !== 'undefined') {
                var f = get__$$__ddTrainFeature(i);
                if (f === null) {
                    if (_$$_666.debug) {
                        log('Deleted: Train ' + __$$_td[i].properties.TrainNum + '[' + i + ']');
                    }
                    delete __$$_td[i];
                }
            }
        }
    };
    map.refocusLastSelectedMarker = function() {
        // Detect if the data for the train was removed during refresh - if so reset the map and exit the function
        if (__$$_lastSelTrDa !== null && typeof __$$_td[__$$_lastSelTrDa] === 'undefined') {
            resetAllMap();
            return;
        }

        //CRH: commenting out because this is causing a timeout not to occur when a train is selected
        // if (__$$_lastSelTrDa) {
        //     setTimeout(
        //             'map.panTo(__$$_td[__$$_lastSelTrDa].marker.position);' +
        //             'if(searchWindow){searchWindow.setOffset()}; map.redrawInfoWindow();' +
        //             'google.maps.event.trigger(__$$_td[__$$_lastSelTrDa].marker, "click");',
        //             _$$_666.redraw_timeout);
        // }
    };

    // Add Event Listener Methods to be assigned dynamically in several places 
    // Must be added as child to another object, otherwise it is a direct reference to the method for the map
    // Ex: map.events.zoom_changed instead of map.zoom_changed
    map.events = {
        zoom_changed: function() {
            map.collapseInfoWindow();

            zoomEventCount++;

            resetTimeout();

            // JW: 3/18/2014 - method created
            map.hideHoverWindows();

            // update all station markers
            // JW: 3/18/2014 - method created
            map.updateStationMarkers();

            // JW 3/18/2014
            // Modified to move functionality to a method
            searchWindow.minimize();

            // this is pure zoom functionality for the info windows - only occurs when actually zooming, not on marker click events
            if (lastInfoWindow) {

                // Forces the info window to remain in place 
                redrawInfoWindowWhenIdle = false;

                // Handles Stations
                if (lastSelectedStationID != null) {
                    map.panTo(lastInfoWindow.position);
                }

                // Handles Trains
                if (__$$_lastSelTrDa != null) {
                    map.panTo(lastInfoWindow.position);
                    /* VV on 7/7/2014: added this check to avoid overlaping SearchWindow with Train InfoIndow (bug #3509 - InfoWindow header hidden on Zoom) */
                    searchWindow.setOffset();
                }

                // JW: Final fix-up for any info window that wants to challenge its position
                if (map.MinorZoomTriggered()) {
                    map.redrawInfoWindow();
                }
            }
        },
        center_changed: function() {
            map.collapseInfoWindow();

            if (!_$$_666.restrict_bounds)
                return;
            if (_$$_666.strict_bounds.contains(map.getCenter())) {
                // still within valid bounds, so save the last valid position
                lastValidCenter = map.getCenter();
                return;
            }

            // not valid anymore => return to last valid position
            map.panTo(lastValidCenter);
            resetTimeout();
        },
        bounds_changed: function() {
            resetTimeout();
        },
        idle: function() {
            if (redrawInfoWindowWhenIdle && lastInfoWindow) {
                lastInfoWindow.draw();
                lastInfoWindow.setGMap(map);
                redrawInfoWindowWhenIdle = false;
            }
//            console.log('map complete');
//            $.each(markerClusterer.getClusters(), function(i, c) {
//                if (c.getMarkers().length > _$$_666.clustering_options.minimumClusterSize) {
//                    $.each(c.getMarkers(), function(i, m) {
//                        if (m === __$$_td[__$$_lastSelTrDa].marker) {
//                            console.log('Current Cluster Size: ' + c.getMarkers().length);
//                            console.log('matched marker:');
//                            console.log(m);
//                        }
//                    });
//                }
//            });

            // jw: Close All Info Windows if marker exists in a cluster
            map.hideClusterInfoWindows();
        },
        idle_once: function() {
            // The initial display of the map is done in this manner due to rate limits in __$$__dd.
           // routeLayer.setMap(map);
            displayStationLayer();

            // I crib this shamelessly from SO...because it is so useful!!
            // http://stackoverflow.com/questions/3125065/how-do-i-limit-panning-in-google-maps-api-v3
            lastValidCenter = map.getCenter();
            google.maps.event.addListener(map, 'center_changed', map.events.center_changed);

            google.maps.event.addListener(map, 'zoom_changed', map.events.zoom_changed);

            google.maps.event.addListener(map, 'bounds_changed', map.events.bounds_changed);




        }
    };

    var styledMapOptions = {
        name: 'Default'
    };


    var customMapType = new google.maps.StyledMapType(baseMapColorOpts, styledMapOptions);

    // Add custom control to reset map.
    var mapReset = $.parseHTML('<div><div class="map_reset_button" id="map_reset_button" title="Reset">&nbsp;</div></div>');
    mapReset[0].index = 1;
    map.controls[google.maps.ControlPosition.LEFT_TOP].push(mapReset[0]);
    // Setup the click event listeners.
    $(mapReset).click(resetAllMap);

    map.mapTypes.set(_$$_666.map_type_id, customMapType);

    // Load each layer.
    try {
        routeLayer = getRouteLayer('');        
    } catch (err) {
        routeLayer = getRouteLayer('');		
    }

    google.maps.event.addListenerOnce(map, 'idle', map.events.idle_once);

    google.maps.event.addListener(map, 'idle', map.events.idle);

    // vv - hover effect is achieved alreadapy from CSS
    /*
     $("#search_button").hover(
     function(e) {
     $(this).css("background-image", "url(img/WIN_GoOver.png)");
     },
     function(e) {
     $(this).css("background-image", "url(img/WIN_GoUp.png)");
     }
     );
     */

    // cw: see http://jsfiddle.net/jensbits/bM7ck/3/ for ability to customize autocomplete 
    // items

    // Initialize the autocompleter
    autoCompleter = $("#search_field").autocomplete({
        minLength: 1,
        source: autoCompleteCallback,
        autoFocus: true,
        focus: function(event, ui) {
			$('.ui-autocomplete').find('hr').removeClass('ui-menu-item-wrapper ui-state-active');
            $('#search_id_hidden').val(ui.item.id);
        },
        select: function(event, ui) {
            if (ui.item.id != 0) {
                $(this).val(ui.item.label);
                searchAction(ui.item.id);
            } else {
                return false;
            }
        }
    });

//Custom Implementation of the autocompleter to add the HR after the route names
//MB: 3/18/2014
//Bug:3430
    autoCompleter.data("ui-autocomplete")._renderItem = function(ul, item) {
        if (item.appendHR) {
            return $("<li>").append("<a>" + item.label + "</a>" + "<hr class='ui-menu-item-wrapper-hr'/>").appendTo(ul);

        }
        else {
            return $("<li>").append("<a>" + item.label + "</a>").appendTo(ul);
        }
    };

    autoCompleter.on("autocompleteresponse", function(event, ui) {		
        searchWindow.closeForSearch();
        $.each(stations, function(i, t) {
            stations[i].infoWindow.closeForSearch();
        });
        for ( t in __$$_td ) 
            if ( typeof __$$_td[ t ].infoWindow != "undefined" ) 
                __$$_td[ t ].infoWindow.closeForSearch();
    });


    $('#search_field').focus(function() {
        $('#search_id_hidden').val('');
        $('#search_field').val('');
        $('#search_field').css('color', 'black');
    });

    $('#search_button').click(function() {
        resetTimeout();
        searchAction($('#search_id_hidden').val());
    });

    $("#search_logo").click(resetAllMap);


    searchWindow = new iwsInfoWindow({
        dashes: true,
        left_content: "",
        right_content: "<span>SEARCH RESULTS<span>",
        mid_content: "",
        extra_content: "",
        top_pointer: true,
        // Required parameter, but since this is not tied to a map, we use a dummy value.
        position: -1,
        infoWinID: "iwsSearchInfowindow",
        type: "search_results",
        HasMultipleResults: function() {
            if (sortedTrains == null)
                return false;

            return sortedTrains.length > 1;
        },
        minimize: function() {
            //MB 3/7/2014.
            //Bug: 3435 - minimize the searchWindow (if it's open) when you zoom in or out.
            if ($('#expand_search_button').attr('class') == 'if_train_search_results_minus') {
                $('.if_train_search_results').hide();
                $('#expand_search_button').attr('class', 'if_train_search_results_plus');
            }
        },
        setOffset: function() {
            //not the most elegant solution to the panning issue, but this seems to work just fine.
            //basically, pan only if the search window is visible.
            //MB: 9/24/2013
            /*
             if ($(searchWindow.div_).is(":visible")) {
             map.panBy(0, -120);
             }
             */

            /* VV on 7/7/2014: added this check to avoid overlaping SearchWindow with Train InfoIndow (bug #3509 - InfoWindow header hidden on Zoom) 
             VV on 7/14/2014: added redraw of InfoWindow to force it to position corectly over the train icon (bug #3518 -  Zoom Bar and InfoWindow)
             */
            /*
             * JW: 7/15/2014: Discovered that panBy smooth animation causing performanc issues in older browsers. 
             *                  Modified to use setCenter with offset.
             */

            if ($(searchWindow.div_).is(":visible")) {
                var offsets = [0, 0, 0, 0, 3, 2, 1, .5, .2, .1, .05, .03, .02, .01, .004, .002];
                var position = new google.maps.LatLng(lastInfoWindow.position.lat(), lastInfoWindow.position.lng());
                var increment = offsets[map.zoom];
                position.d = position.d + increment;
                map.setCenter(position);
            }
        }
    });

    resetTimeout();
}

function searchAction(sv) {
    __$$_lastSelTrDa = null; // reset for housekeeping
    var searchVal = sv || $("#search_field").val();
    if (searchVal.length == 0)
        return;
    searchVal = searchVal.toLowerCase();
    // cw: For now, we assume the autocompleter has done the searching for us, we just perform the action.
    if (typeof stations[searchVal.toUpperCase()] != "undefined") {
        // cw: When refactoring, let's look at standardizing things, like making all hash-codes the same case.
        selectStation(stations[searchVal.toUpperCase()]);
        $('#search_field').blur();
    } else if (typeof resolver.trains[searchVal] != "undefined") {
        selectTrain(resolver.trains[searchVal]);
        $('#search_field').blur();
        map.redrawInfoWindow();
    } else if (typeof resolver.routes[searchVal] != "undefined") {
        selectRoute(resolver.routes[searchVal]);
        lastZoomLevel = map.zoom; // modify the lastZoomLevel value if it has changed coming out of any of the above methods
        $('#search_field').blur();
        map.redrawInfoWindow();
    }
}

function openSearchWindow(label, trains) {
    // Add route and control content.
    var midContent = '<div class="if_train_search_results_minus" id="expand_search_button">&nbsp</div>';

    var setupSearchButton = function(t, d) {
        $(d).find("#expand_search_button").hover(
                function() {
                    if (this.className.indexOf("minus") >= 0) {
                        this.className = "if_train_search_results_minus_hover";
                    } else {
                        this.className = "if_train_search_results_plus_hover";
                    }
                },
                function() {
                    if (this.className.indexOf("minus") >= 0) {
                        this.className = "if_train_search_results_minus";
                    } else {
                        this.className = "if_train_search_results_plus";
                    }
                }
        );

        $(d).find("#expand_search_button").click(function() {
            
            resetTimeout();
            if (this.className.indexOf("minus") >= 0) {
                $(d).find(".if_train_search_results").hide();
                this.className = 'if_train_search_results_plus_hover';
            } else {
                $(d).find(".if_train_search_results").show();
                this.className = 'if_train_search_results_minus_hover';
            }
        });
    };

    if (typeof trains == "undefined" || trains.length == 0) {
        searchWindow.setContent({
            left_content: label.toUpperCase(),
            extra_content:
                    '<div class="if_train_search_results">'
                    + '<div class="if_search_no_results">'
                    + 'Currently, there are no active trains on this route.'
                    + '</div>'
                    + '</div>',
            mid_content: midContent,
            fixup: function(t, d) {
                setupSearchButton(t, d);
                $(d).find(".if_train_search_results").height("14px");
            }
        });
        searchWindow.show();

        return;
    }

    // Add Search Window Content
    var extraContent = '<div class="if_train_search_results">';

    // cw: xxx - Refactor this. There is an easier way to accomplish this now since things have simplified with the
    // data and requirements.
    var statusResolver = {
        /*
         "Departure": 
         [ "Departing", 2, function (t) {
         var retVal = '<div class="float_left text_grey search_arrdep">'
         + "Departed<br />Scheduled Departure"
         + '</div>'
         + '<div class="float_left text_grey">'
         + moment(t.properties.EventDT).format(_$$_666.time_format) + t.properties.EventTZ + "T<br />"
         + moment(t.properties.EventSchDp).format(_$$_666.time_format) + t.properties.EventTZ + "T"
         + '</div>';
         
         return retVal;
         }],
         */

        // cw: XXX - Show timezone of event or of next downline station.
        //var tz = t.properties.EventTZ || stations[]

        "Arrival":
                ["Arrived", 2, function(t) {

                        var at = t.properties.EventDT;
                        if (typeof at == "undefined" || at == null || at.length == 0) {
                            var ss = t.status_station[t.properties.EventCode]
                            at = ss.postarr || ss.postdep;
                        }

                        var tt = t.properties.EventSchAr || t.properties.EventSchDp;
                        if (typeof tt == "undefined" || tt == null || tt.length == 0) {
                            // Find train status line from EventCode and use schduled time blocks from there.
                            var ss = t.status_station[t.properties.EventCode];
                            tt = ss.scharr || ss.schdep;
                        }

                        var retVal = '<div class="float_left text_grey search_arrdep">'
                                + "Arrived<br />Scheduled Arrival"
                                + '</div>'
                                + '<div class="float_left text_grey">'
                                + moment(at).format(_$$_666.time_format) + t.properties.EventTZ + 'T<br />'
                                + moment(tt).format(_$$_666.time_format) + t.properties.EventTZ + 'T'
                                + '</div>';

                        return retVal;
                    }],
        "Estimated Arrival":
                ["Next Station", 3, function(t) {
                        var nextStation = getNextStationDetail(t);
                        var retVal = '<div class="float_left text_grey search_arrdep">'
                                + "Scheduled Arrival"
                                + (((nextStation.HasEstimatedStatus)) ? "<br />Estimated Arrival" : "")
                                + '</div>'
                                + '<div class="float_left text_grey">';
                        if (nextStation.HasPostedStatus || nextStation.HasEstimatedStatus) {
                            retVal += moment(nextStation.scharr || nextStation.schdep).format(_$$_666.time_format) + nextStation.tz + "T";

                            if (nextStation.HasEstimatedStatus)
                                retVal += '<br />' + moment(nextStation.estarr).format(_$$_666.time_format) + nextStation.tz + "T";
                        } else {
                            var tt = t.properties.EventSchAr || t.properties.EventSchDp;
                            if (typeof tt == "undefined" || tt == null || tt.length == 0) {
                                // Find train status line from EventCode and use schduled time blocks from there.
                                var ss = t.status_station[t.properties.EventCode];
                                tt = ss.scharr || ss.schdep;
                            }
                            retVal += moment(tt).format(_$$_666.time_format) + t.properties.EventTZ + "T";

                            if (nextStation.HasEstimatedStatus)
                                retVal += '<br />' + moment(t.properties.EventDT).format(_$$_666.time_format) + t.properties.EventTZ + "T"
                        }
                        retVal += '</div>'
                        return retVal;
                    }],
        // Predeparture. Will ALWAYS get a station status record instead of a train record.
        "Predeparture":
                ["Next Station", 2, function(t) {
                        var retVal = '<div class="float_left text_grey search_arrdep">Scheduled Departure</div>'
                                + '<div class="float_left text_grey">'
                                + moment(t.schdep).format(_$$_666.time_format) + t.tz + "T"
                                + '</div>'
                        return retVal;
                    }],
        "":
                ["No Status", 3, function(t) {
                        return '<div class="float_left text_gray search_arrdep">No Data Available</div>';
                    }]
    };
    statusResolver["Departure"] = statusResolver["Estimated Arrival"];
    statusResolver["Estimated Departure"] = statusResolver["Estimated Arrival"];

    sortedTrains = trains.sort(function(a, b) {
        return parseInt(a.properties.TrainNum) - parseInt(b.properties.TrainNum)
    });

    // JW: Only construct and display the search results window if there is more than 1 train in the results
    if (sortedTrains.length < 2) {
        lastInfoWindow = sortedTrains[0].infoWindow;
        sortedTrains[0].infoWindow.setGMap(map);
        sortedTrains[0].infoWindow.show();
        return false;
    }

    $.each(sortedTrains, function(i, t) {
        var code = t.properties.EventCode;
        var orig = t.properties.OrigCode;
        var dest = t.properties.DestCode;
        var preD = (t.properties.TrainState == "Predeparture");
        var evnt = t.properties.EventT || "";

        // Fix event type to match requirements.
        if (
            evnt != null &&
            !preD && 
            evnt == "" && 
            code.length > 0
        ) {
            evnt = 'Estimated Arrival';
        }

        if (evnt == 'Arrival' && code != dest) {
            evnt = 'Estimated Arrival';
        }
        if (preD) {
            evnt = 'Predeparture';
        }

        var cc = ((!preD) ? code : t.train_status[1].code);
        var nextStation = getNextStationDetail(t);
        var stationLabel = ((typeof stations[cc] != "undefined") ? stations[cc].City : cc);
        if (typeof nextStation != "undefined" && !nextStation.HasPostedStatus)
            stationLabel = ((typeof stations[nextStation.code] != "undefined")
                    ? stations[nextStation.code].City : nextStation.code
                    );
        extraContent +=
            '<div class="if_train_search_result" id="search_train_' + t.properties.ID + '">'
            + '<div class="float_left">'
            + '<div class="text_blue underlined pointer">' + t.properties.TrainNum + " " + label + '</div>';
        if (typeof t.properties.StatusMsg != "undefined" && t.properties.StatusMsg.indexOf("SERVICE DISRUPTION") >= 0) {
            extraContent +=
                    '<div class="text_black disruption">'
                    + 'Due to a service disruption, no information is currently available. For additional assistance, '
                    + 'please contact us at <br>1-800-USA-RAIL (1-800-872-7245).'
                    + '</div>'
                    + '</div></div>';
        } else {
            extraContent +=
                    '<div class="text_blue">'
                    + statusResolver[evnt][0]
                    + (typeof stationLabel != "undefined" ? (' &mdash; ' + stationLabel) : "")
                    + '</div>'
                    + '<div class="clear normal text_black">'
                    + stations[orig].City + ", " + stations[orig].State
                    + '<img src="' + images.TR_arrow.src + '" />'
                    + stations[dest].City + ", " + stations[dest].State
                    + '</div>'
                    + statusResolver[evnt][2]((!preD) ? t : t.train_status[1])
                    + '</div>';

            var cmnt = "no status";
            var trainStatus = "predeparture";
            if (!preD) {
                // Retrieve the status comment.
                cmnt = t.properties.Comment;
                if (typeof cmnt == "undefined" || cmnt == null || cmnt.length == 0) {
                    cmnt = t.status_station[t.properties.EventCode].estarrcmnt;
                }

                // Validate the status comment.
                trainStatus = "predeparture";
                if (typeof cmnt == "undefined" || cmnt == null || cmnt.length == 0) {
                    cmnt = "no status";
                } else {
                    trainStatus = evalTrainStatus(t, cmnt);
                }
            }

            var breaks = statusResolver[evnt][1];
            if (typeof nextStation != "undefined" && !nextStation.HasEstimatedStatus)
                breaks--;
            extraContent +=
                    '<div class="float_right">'
                    + '<div class="text_blue">'
                    + '<br />'.repeat(breaks)
                    + '</div>'
                    + '<div class="float_right text_bottom if_search_results_flag if_train_status_' + trainStatus + '">&nbsp;</div>'
                    + '<div class="float_right text_grey text_bottom">' + formatComment(cmnt.toLowerCase()) + '</div>'
                    + '</div>'
                    + '</div>';
        }
    });
    extraContent += "</div>";

    // Open Search Window
    //if (searchWindow != null) {
    //	searchWindow.close();
    //}

    searchWindow.setContent({
        left_content: label.toUpperCase(),
        mid_content: midContent,
        extra_content: extraContent,
        fixup: function(t, d) {
            setupSearchButton(t, d);

            $(d).find(".if_train_search_result").click(function() {
                
                resetTimeout();
                var tn = $(this).attr('id').replace("search_train_", "");
                $(d).find("#expand_search_button").trigger("click");
				map.setCenter(__$$_td[tn].marker.getPosition());
				google.maps.event.trigger(__$$_td[tn].marker, "click");          
			
			});
        }
    });
    searchWindow.show();
}

// cw: Note we need to check for IE8 support in both routines in the case where line styles for IE8 are to be
// separately set from resetting the routeLines. There are use cases for both, even though we may not be using them... yet.

function setLineStyles(list, ls) {
	//routeLayer.layers[0].sub.setSQL('SELECT * FROM national_route_shape_v16 where name=\'Vermonter\'');
	if (typeof ls == "undefined")
        return;

    if (list != null) {
        if (DynamicMapsEngineLayerSupport()) {
            $.each(list, function(i, gx) {
                var gxs = routeLayer.getFeatureStyle(gx);
                if (typeof ls.strokeColor != "undefined")
                    gxs.strokeColor = ls.strokeColor;
                if (typeof ls.strokeWidth != "undefined")
                    gxs.strokeWidth = ls.strokeWidth;
                if (typeof ls.strokeOpacity != "undefined")
                    gxs.strokeOpacity = ls.strokeOpacity;
                if (typeof ls.zIndex != "undefined")
                    gxs.zIndex = ls.zIndex;
            });
        } else {
            // TODO - Handle IE8 support, here.
        }
    }
}

function resetRouteLines() {
    if (lastSelectedFeatures == null)
        return;

  /* routeLayer.getSubLayers()[0].set({
	 sql: "SELECT * FROM national_route_shape_v16",
	 cartocss: "#layer {line-color: #FF0000;line-width: 2;}"
    }); */
    
    getRouteLayer('');

    lastSelectedFeatures = null;
}

function resetMap() {	
    map.SearchType = '';
    resetRouteLines();
    $.each(__$$_td, function(i, t) {
        if (typeof t == "undefined" || typeof t.properties == "undefined")
            return;
        t.marker.setOptions({map: map, visible: true});
    });
    if (filteredMarkers.length > 0) {
        filteredMarkers = [];
    }
    if (markerClusterer === null) {
        markerClusterer = new MarkerClusterer(map, __$$_tm.getArray(), _$$_666.clustering_options);
    } else {
        markerClusterer.removeHoverDiv();
        markerClusterer.clearMarkers();
        markerClusterer.addMarkers(__$$_tm.getArray());
    }
    if (searchWindow !== null)
        searchWindow.close();
}

function get__$$__ddTrainFeature(id) {
    var data = null;
    $.each(__$$__dd.features, function(i, g) {
        if (g.properties.ID == id) {
            data = g;
        }
    });
    return data;
}

function trainPropMatched(t, k, v) {
    return t.property[k] == v;
}

function filterTrains(tl) {	
    // Hide all trains.
    markerClusterer.clearMarkers();

    for (t in __$$_td) {
        if (typeof __$$_td[t] == "undefined")
            continue;
        __$$_td[t].marker.setMap(null);
    }
    // Reveal trains in list.

    $.each(tl, function(i, t) {
        t.marker.setOptions({map: map, visible: true});
        filteredMarkers.push(t.marker);
    });

}

function filterTrainsByTrainNumber(tn) {
    // Hide all trains.
    markerClusterer.clearMarkers();
    for (t in __$$_td) {
        if (typeof __$$_td[t] == "undefined")
            continue;
        __$$_td[t].marker.setMap(null);
    }
    // Reveal trains in list.
    for (t in __$$_td) {
        if (typeof __$$_td[t] == "undefined")
            continue;


        if (__$$_td[t].properties.TrainNum == tn) {
            __$$_td[t].marker.setOptions({map: map, visible: true});
            filteredMarkers.push(__$$_td[t].marker);
        }
    }
}

function selectRoute(r) {
    if (typeof r == "undefined") {
        alert("Undefined route!");
        return;
    }
    resetMap();
    map.SearchType = 'Route';
    map.hideInfoWindows();

	//var strName = r.Name.split(' ')[0];
	var strName = r.Name;

	//str = str.substring(0,str.length-1);
	//var sqlStmt = "SELECT * FROM "+_$_ral_31+" where name like '%"+ strName +"%'";



getRouteLayer(strName);

    /*

	routeLayer.getSubLayers()[0].set({
		 sql: sqlStmt,
		 cartocss:_$$_666.higlightedLineStyle
	});
*/

    lastSelectedFeatures = r.gx_ids;

    // vv - modify route bounds with offsets for preventing overlapping search window 
    var OffsetY = r.bounds.getNorthEast().lat();
    if (r.OffsetY)
        OffsetY = parseFloat(r.OffsetY) + parseFloat(OffsetY);

    var OffsetX = parseFloat(r.bounds.getSouthWest().lng());
    if (r.OffsetX)
        OffsetX = parseFloat(r.OffsetX) + parseFloat(OffsetX);

    var offsetBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(r.bounds.getSouthWest().lat(), OffsetX),
            new google.maps.LatLng(OffsetY, r.bounds.getNorthEast().lng())
            );

    //map.fitBounds(r.bounds);    
    map.fitBounds(offsetBounds);
    // Filter trains.
    var selectedTrains = resolver.routeTrains[r.CMSID] || [];
    filterTrains(selectedTrains);	
    if (selectedTrains.length == 1) {
        //set the correct zoom based on the route if a single train is returned
        //MB 4/2/2014		
        map.setZoom(r.ZoomLevel);
        //MB 7/7/2014
        //BT# 3507. Fire the click event of the marker when a route search returns a single train instead of showing the infoWindow.
        google.maps.event.trigger(selectedTrains[0].marker, "click");
        map.setCenter(selectedTrains[0].marker.position);
    }
    else {
        openSearchWindow(r.Name, selectedTrains);
    }

}
function addslashes( str ) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

function displayRouteForTrainSearch(r) {	
   if (typeof r == "undefined") {
        alert("Undefined route!");
        return;
    }
    resetMap();
    map.hideInfoWindows();
    // USING JUST 'EMPIRE' FOR EMPIRE BUILDER IS RETURNING UNWANTED RESULTS
    // HERE WE SET UP AN EXCEPTION FOR THE EMPIRE BUILDER QUERY
    var strName = ( r.Name != 'Empire Builder' )? r.Name.split(' ')[0] : r.Name;
    /*var sqlStmt = "SELECT * FROM " + _$_ral_31 + " where name like '%"+ strName +"%'";
	routeLayer.getSubLayers()[0].set({
		 sql: sqlStmt,
		 cartocss: _$$_666.higlightedLineStyle
	});*/
    getRouteLayer(strName);



    lastSelectedFeatures = r.gx_ids;

    // vv - modify route bounds with offsets for preventing overlapping search window 
    var OffsetY = r.bounds.getNorthEast().lat();
    if (r.OffsetY)
        OffsetY = parseFloat(r.OffsetY) + parseFloat(OffsetY);

    var OffsetX = parseFloat(r.bounds.getSouthWest().lng());
    if (r.OffsetX)
        OffsetX = parseFloat(r.OffsetX) + parseFloat(OffsetX);

    var offsetBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(r.bounds.getSouthWest().lat(), OffsetX),
            new google.maps.LatLng(OffsetY, r.bounds.getNorthEast().lng())
            );

    //map.fitBounds(r.bounds);    
    map.fitBounds(offsetBounds);
}

function selectStation(s) { 
	resetMap();
    map.SearchType = 'Station';

    map.hideInfoWindows();

    map.fitBounds(new google.maps.LatLngBounds().extend(s.marker.getPosition()));
    google.maps.event.trigger(s.marker, "click");

    map.redrawInfoWindow();
}

function selectTrain(t) {
    resetMap();
    map.SearchType = 'Train';
    map.hideInfoWindows();

	

    // cw: xxx - Turn off clustering and filter trains.

    // Open search window if array of trains, otherwize zoom in.

    //MB: 3/18/2014 Updates to only display the route for that train and remove other trains.
    if (t.length == 1) {
        var x = t[0].properties.RouteName;
        if (t[0].properties.RouteName.indexOf("/") > 0) {
            displayRouteForTrainSearch(resolver.routes[x.split("/")[0].trim().toLowerCase()]);
        }
        else {
            displayRouteForTrainSearch(resolver.routes[x.toLowerCase()]);
        }
        map.fitBounds(new google.maps.LatLngBounds().extend(t[0].marker.getPosition()));
        map.setZoom(_$$_666.item_zoom);
        filterTrainsByTrainNumber(t[0].properties.TrainNum);
        google.maps.event.trigger(t[0].marker, "click");

    } else {
        var rn = t[0].properties.RouteName.toLowerCase();
        rn = rn.replace(/ \/.+$/, '');
        displayRouteForTrainSearch(resolver.routes[rn]);
        filterTrainsByTrainNumber(t[0].properties.TrainNum);
        openSearchWindow(resolver.routes[rn].Name, t);
    }

}

function getNextStationDetail(t) {	
	


  var ec = t.properties.EventCode;

	var eventStation = $.grep(t.train_status, function(e, i) {
        if (t.properties.TrainState != 'Predeparture') {								
					return e.code == ((ec != t.train_status[0].code) ? ec : t.train_status[parseInt(1)].code);
				
        } else {
            // cw: Design rule. Take the FIRST station stop for predeparture.
            return i == 1;
        }
    })[0];

	
    if (typeof eventStation == "undefined") {
        if (t.TrainState != "Predeparture")
            log("eventStation not defined for train #" + t.properties.TrainNum + ': ' + t.properties.EventCode + ': ID :' + t.properties.ID );
        return {HasPostedStatus: false, HasPostedArrivedStatus: false, HasPostedDepartedStatus: false, HasEstimatedStatus: false, code: t.properties.EventCode};
        ;
    }

	if(eventStation.code=='CBN'){	
		var j = 1;
		for(var i=0;i<t.train_status.length;i++){
			if(t.train_status[i].code=='CBN'){
				j=i+1;
				break;
			}
		}		
		eventStation = t.train_status[j];		
	}
	

	
    eventStation.HasPostedStatus = stationHasPostedStatus(eventStation);
    eventStation.HasPostedArrStatus = stationHasPostedArrivedStatus(eventStation);
    eventStation.HasPostedDepartedStatus = stationHasPostedDepartedStatus(eventStation);
    eventStation.HasEstimatedStatus = stationHasEstimatedStatus(eventStation);
    if (!eventStation.HasPostedArrStatus)
        return eventStation;

    var idx = 0;
    for (i in t.train_status) {
        if (t.train_status[i].code == t.properties.EventCode) {
            idx = i;
            break;
        }
    }
    var nextStation = (typeof t.train_status[parseInt(idx) + 1] != "undefined") ? t.train_status[parseInt(idx) + 1] : t.train_status[idx];
    if (typeof nextStation != "undefined" && typeof nextstation != null) {
        nextStation.HasPostedStatus = stationHasPostedStatus(nextStation);
        nextStation.HasPostedArrivedStatus = stationHasPostedArrivedStatus(nextStation);
        nextStation.HasPostedDepartedStatus = stationHasPostedDepartedStatus(nextStation);
        nextStation.HasEstimatedStatus = stationHasEstimatedStatus(nextStation);
    }
    else
        nextStation = {HasPostedStatus: false, HasPostedArrivedStatus: false, HasPostedDepartedStatus: false, HasEstimatedStatus: false, code: t.properties.EventCode};

    return nextStation;
}

function stationHasPostedStatus(st) {
    return (typeof st.postdep != "undefined" || typeof st.postarr != "undefined");

}

function stationHasPostedArrivedStatus(st) {
    return (typeof st.postarr != "undefined");
}

function stationHasPostedDepartedStatus(st) {
    return (typeof st.postdep != "undefined");
}

function stationHasEstimatedStatus(st) {
    return (typeof st.estarr != "undefined" || typeof st.estdep != "undefined");
}

function displayStationLayer() {
    var mz = map.getZoom();
    for (s in stations) {
        if (mz > _$$_666.zoom_level_resolver[stations[s].MapZmLvl])
            stations[s].marker.setMap(map);
    }
}

function retryTrainsLayer() {
    if (++__$$_tdr > _$$_666.max_load_retries) {
        // cw: Throw up timeout layer with error message.
    }
    setTimeout(__$$_ratl, 2000 * Math.pow(2, __$$_tdr - 1));
}

function retryStationsLayer() {
    if (++__$$_sdr > _$$_666.max_load_retries) {
        // cw: Show timeout or error message on screen.
		showTrackingUnavailable(true);
    }
    setTimeout(__$$_lsd, 2000 * Math.pow(2, __$$_sdr - 1));
}

function evalTrainStatus(t, c) {
    var retTs = "predeparture";
    if (typeof c != "undefined") {
        c = c.toLowerCase();
        if (t.properties.TrainState != "Predeparture") {
            if (c == "canceled") {
                retTs = "cancel";
            } else if (c.match("late") != null) {
                retTs = "delay";
                // cw: Minutes late is in $3.
                minMatch = c.match("((\\d+) hr )?(\\d+) min?");
                // cw: Only process if we have minute data only ($2 is undefined and $3 is not).
                //MB 7/3/2014 Bug: 3504 minMatch[2] will be blank and not undefined in IE8
                if (minMatch != null && (typeof minMatch[2] == "undefined" || minMatch[2] == '') && parseInt(minMatch[3]) < 10) {
                    retTs = "ok";
                }
            } else {
                retTs = "ok";
            }
        }
    }

    return retTs;
}

function evalStationStatus(c) {
    var retTs = "ok";
    if (typeof c != "undefined") {
        c = c.toLowerCase();
       
            if (c == "canceled") {
                retTs = "cancel";
            } else if (c.match("late") != null) {
                retTs = "delay";
                // cw: Minutes late is in $3.
                minMatch = c.match("((\\d+) hr )?(\\d+) min?");
                // cw: Only process if we have minute data only ($2 is undefined and $3 is not).
                //MB 7/3/2014 Bug: 3504 minMatch[2] will be blank and not undefined in IE8
                if (minMatch != null && (typeof minMatch[2] == "undefined" || minMatch[2] == '') && parseInt(minMatch[3]) < 10) {
                    retTs = "ok";
                }
            } else {
                retTs = "ok";
            }
    }
    return retTs;
}


var pt;
var m;
function __$$_rtd(data) {
	try{
	__$$__dd = data;
   
    
	/*data.features = $.grep(data.features, function (element, index) {
		console.debug((new Date(Date.now())-new Date(element.properties.LastValTS))/1000/60);
		return ((new Date(Date.now())-new Date(element.properties.LastValTS))/1000/60>=0);
	});*/
	
	LastDate = [];
    LastDate.length = 0;
    // cw: Handle failure case for IE.
   /* if (typeof data.error != "undefined" && _$$_666.debug) {
        log("Error fetching active trains: " + data.error.message);
        retryTrainsLayer();
        return;
    }*/

    // cw: Insure we clear the train resolvers during a refresh.
    resolver.trains = {};
    resolver.routeTrains = {};
    /*
     // cw: Handle updating issue with __$$__dd.
     if (typeof data.features != "undefined" && data.features.length == 0) {
     log("No features retrieved when fetching active trains!");
     retryTrainsLayer();
     return;
     }
     */

    __$$_tdr = 0;
    if (_$$_666.debug)
        log("Active Trains Fetched: " + data.features.length);

var idxOfTrain=-1;
    if (data.features.length > 0) {
		//Fix for when train is activated by sightings in NTAMS even though it's not time yet due to a cancellation downline
		//Train 20 ORIG ATL 1/27/2015 issue fix.

		//Not needed - NTAMS takes care of it.
		/*$.each(data.features,function(i,d){
			if((new Date(Date.now())-new Date(d.properties.LastValTS))/1000/60<-5){
			//data.features.splice(i);
			console.debug('will remove ', d.properties.ID);
			idxOfTrain=i;
			}
		});
		if(idxOfTrain!==-1){
		//data.features.splice(idxOfTrain);
		}*/

		
		//We got the data from the calls - reset tries to 0;
		tries = 0;
        $.each(data.features, function(i, d) {           			
			if (d.properties.TrainState == 'Completed') {                
            }
        });


        $.each(data.features, function(i, d) {//	
            if (d.properties.TrainState == 'Active') {
                LastDate.push(new Date(d.properties.LastValTS));
            }
        });
        //Custom method to sort the array in descending order
        LastDate.sort(date_sort_desc);

        //pick the most recent last val ts.
        var dtLast = LastDate[0];
        var dtNow = new Date(Date.now());


       log('Minutes of Inactivity: ' + ((dtNow - dtLast) / 1000 / 60));

        // IN TESTING: END COMMENT SECTION IF USING SNAPSHOT DATA SOURCE FOR TESTING
		//Use the timezone check to make sure the window doesn't show up for non america users.
        if (!_$$_666.debug && jstz.determine().name().toLowerCase().indexOf('america')!=-1) {
            if ((dtNow - dtLast) / 1000 / 60 > _$$_666.lastUpdateDiff) {
                showTrackingUnavailable(true);
                isUnavailable = true;
            }
            else {
                if (isUnavailable) {
                    showTrackingUnavailable(false);
                    
                    resetTimeout();
                    isUnavailable = false;
                }
            }
        }
    }

    $.each(data.features, function(i, d) {
	
		
		if(d.properties.TrainState!=='Active'){
			//return true;
		}



		// cw: Business logic to prevent issues in the future:
        // If train has no route data, then we can't display it.
        if (typeof d.properties.RouteName == "undefined" || typeof d.properties.CMSID == "undefined") {
            if (_$$_666.debug)
                log("No route associated with " +
                        ((typeof d.properties.TrainNum == "undefined") ?
                                "train #" + d.properties.TrainNum :
                                "active train #" + d.properties.ID
                                )
                        );
            return;
        }

        var ID = d.properties.ID + "";		
		
		
		
        // See initialize method for the method used when preloading train directional markers.
        var icon = trainOrdinalMarkerIcons["x"];
       
		//TODO: THE HEADING IS NULL = THIS WILL NEED TO BE CORRECTED
		if (d.properties.hasOwnProperty("Heading") && d.properties.Heading!==null) {
            if (d.properties.Heading.length > 0) {
                icon = trainOrdinalMarkerIcons[d.properties.Heading.toLowerCase()];
            }
        }


        // jw: Modify train icon for completed trains
        if (d.properties.TrainState === 'Completed') {
            icon = trainOrdinalMarkerIcons['x'];
        }

		

        var position = new google.maps.LatLng(
                d.geometry.coordinates[1], d.geometry.coordinates[0]
                );

		

        if (typeof __$$_td[ID] == "undefined") {
            __$$_td[ID] = {};

            __$$_td[ID].marker = new google.maps.Marker({
                position: position,
                icon: icon,
                zIndex: 5,
                clickable: true
            });			
        } else {
            if (typeof __$$_td[ID].marker == "undefined") {
                log("Undefined ID: " + ID);
            }
            __$$_td[ID].marker.setPosition(position);
            __$$_td[ID].marker.setIcon(icon);
        }

		__$$_td[ID].properties = d.properties;

        // cw: Process train data here, instead of waiting for content generation.
        // jw: Iteration for populating station data from Train Status
        __$$_td[ID].train_status = [];
        __$$_td[ID].status_station = {};
        for (x = 1; x <= _$$_666.max_stations; x++) {
            if ((typeof d.properties["Station" + x] != "undefined") && d.properties["Station" + x] != null) {
                __$$_td[ID].train_status.push($.parseJSON(d.properties["Station" + x]));
            }
            // Create train-status-by-station-code structure for later use.
            var lts = __$$_td[ID].train_status[__$$_td[ID].train_status.length - 1];
            if (lts) {
                __$$_td[ID].status_station[lts.code] = lts;
            }
            // For release, let's try and keep some memory by deleting the JSON train status
            // data.
            if (!_$$_666.debug)
                delete d.properties["Station" + x];
        }

        // cw: Count BACKWARDS to find last station with posted TS.
        var x;
        for (x = __$$_td[ID].train_status.length - 1; x >= 0; x--) {
            if (typeof __$$_td[ID].train_status[x] == "undefined")
                continue;
            // cw: This will change, soon.
            if (
                    (typeof __$$_td[ID].train_status[x].postdep != "undefined") ||
                    (typeof __$$_td[ID].train_status[x].postarr != "undefined")
                    ) {
                break;
            }
        }
        __$$_td[ID].train_status.last_station = x;

        var extraContent, rightContent, midContent, trainStatus;
        var oData = stations[d.properties.OrigCode] || defData;
        var dData = stations[d.properties.DestCode] || defData;        

		//TODO: Null Cols are creating an issue??
		var nCode = d.properties.EventCode;
		var nData = stations[nCode];



			


		
		if(d.properties.StatusMsg === undefined){			
			return true;
		}

        var srvDis = (
                d.properties.StatusMsg !== null &&
                d.properties.StatusMsg.toUpperCase().indexOf('SERVICE DISRUPTION') >= 0
                );


        // cw: MB's fix for train search results.
        // Route CMSID to active train record for search.
        if (typeof resolver.routeTrains[d.properties.CMSID] == "undefined") {
            resolver.routeTrains[d.properties.CMSID] = [];
        }
        resolver.routeTrains[d.properties.CMSID].push(__$$_td[ID]);

        // Train number to active train ID resolver for autocomplete.
        if (typeof resolver.trains[d.properties.TrainNum] == "undefined") {
            resolver.trains[d.properties.TrainNum] = [];
        }
        resolver.trains[d.properties.TrainNum].push(__$$_td[ID]);


        midContent =
                '<div class="if_train_info_mid">'
                + '<div class="if_train_info_mid_o">'
                + oData.City + ", " + oData.State + " (" + oData.Code + ")"
                + '</div><div class="if_right_arrow" /><br />'
                + dData.City + ", " + dData.State + " (" + dData.Code + ")"
                + '<div class="if_train_info_mid_vspacer">&nbsp;</div>';

        if (!srvDis) {
            extraContent =
                    '<div class="if_train_extra_content">'
                    + '<div class="if_extra_content_train_topborder"></div>'
                    + '<div class="float_left">'
                    + '<div class="if_train_extra_content_status_plus" id="expand_status_button" />'
                    + '</div>'
                    + '<div class="if_train_extra_content_lastts float_right">'
                    + 'Status as of ';
                    //MB-JW: Show the time the train was updated in __$$__dd as the Status as of - since the 15 minutes will be based on when it is inserted into the __$$__dd cloud.
					//Use ViewStn2 since that is the local timezone value of viewstn1
					if(d.properties.TrainState === 'Completed'){
						extraContent += moment(d.properties.ViewStn2).format(_$$_666.time_format);
					}
					else
						extraContent += moment(d.properties.LastValTS).format(_$$_666.time_format);
                    
					//extraContent += (d.properties.EventTZ || d.properties.OriginTZ) + "T"

					extraContent+= (getNextStationDetail(__$$_td[ID])).tz + "T"
                    + '</div>'
                    + '</div><div class="if_train_extra_status">';

					

            for (x = 0; x < __$$_td[ID].train_status.length; x++) {
                var station_status = __$$_td[ID].train_status[x];
                var station_detail = stations[station_status.code] || defData;
                var hasSchCmnt = (
                        typeof station_status.schcmnt != "undefined" &&
                        station_status.schcmnt != null &&
                        station_status.schcmnt.length > 0
                        );
                var hasPostDep = (typeof station_status.postdep != "undefined" && station_status.postdep != null);
                var hasPostArr = (typeof station_status.postarr != "undefined" && station_status.postarr != null);
                var hasEstArr = (typeof station_status.estarr != "undefined" && station_status.estarr != null);
                var hasEstDep = (typeof station_status.estdep != "undefined" && station_status.estdep != null);
                var notLast = (x <= __$$_td[ID].train_status.last_station);
                var noStatus = (station_status.postcmnt == "ARRIVED");
                var blue = ((notLast || hasSchCmnt) ? " text_grey" : " text_blue");
                var black = ((notLast || hasSchCmnt) ? " text_grey" : " text_black");
                var grey = ((notLast || hasSchCmnt) ? " text_grey" : "");


                var stationblue = ((notLast || hasSchCmnt) ? " text_grey" : " text_blue");
                var stationblack = ((notLast || hasSchCmnt) ? " text_grey" : " text_black");
                var stationgrey = ((notLast || hasSchCmnt) ? " text_grey" : "");

                var stationDetailDisplay = (station_detail.City == '') ? station_status.code :
                    (
                        station_detail.City + ', ' + station_detail.State +
                        ( station_detail.Name != null && station_detail.Name.length > 0? " - " + station_detail.Name : '' )
                    );
                //Bug: 3209 - CBN should be ignored.
                if (stationDetailDisplay == 'CBN')
                    continue;


				
				if(blue===" text_blue"){
					blue = blue + " underlined pointer stationlink";
				}
				

                extraContent += '<div id="train_' + ID + '_status_' + x + '" class="if_train_extra_status_row">';
                extraContent += '<div class="if_train_extra_status_station' + blue + '" id="station_' + station_status.code +'">' + stationDetailDisplay + '</div>';


				
				if(x === __$$_td[ID].train_status.length-1){						
							extraContent+='<div class="stationDate if_train_extra_status_station'+ stationblue + '">'+ moment(station_status.scharr).format('MMMM D, YYYY') + '</div>';
				}
				else{
							extraContent+='<div class="stationDate if_train_extra_status_station'+ stationblue + '">'+ moment(station_status.schdep).format('MMMM D, YYYY') + '</div>';
				}

                if (x == 0) {                   
					if(hasPostDep){
						extraContent +=
								'<div class="if_train_extra_status_label float_left' + grey + '">'
								+ ((hasPostDep) ? "Departed" : "Scheduled Departure") +
								'</div>' +
								'<div class="if_train_extra_status_times float_left' + black + '">'
								+ moment(station_status.schdep).format(_$$_666.time_format)
								+ ' ' + station_status.tz + 'T</div>';
						}else if(hasEstDep){						
								extraContent +=
								'<div class="if_train_extra_status_label float_left' + grey + '">'
								+ "Scheduled Departure" +
								'</div>' +
								'<div class="if_train_extra_status_times float_left' + black + '">'
								+ moment(station_status.schdep).format(_$$_666.time_format)
								+ ' ' + station_status.tz + 'T</div>';

							extraContent +=
								'<div class="if_train_extra_status_label float_left' + grey + '">'
								+ ((hasEstDep) ? "Estimated Departure" : "Scheduled Departure") +
								'</div>' +
								'<div class="if_train_extra_status_times float_left' + black + '">'
								+ moment(station_status.estdep).format(_$$_666.time_format)
								+ ' ' + station_status.tz + 'T</div>';
						}
						else{					
							extraContent +=
								'<div class="if_train_extra_status_label float_left' + grey + '">'
								+ ((hasPostDep) ? "Departed" : "Scheduled Departure") +
								'</div>' +
								'<div class="if_train_extra_status_times float_left' + black + '">'
								+ moment(station_status.schdep).format(_$$_666.time_format)
								+ ' ' + station_status.tz + 'T</div>';
						}
                } else if (hasPostArr) {
                    extraContent +=
                            '<div class="if_train_extra_status_label float_left text_grey">Arrived</div>' +
                            '<div class="if_train_extra_status_times float_left text_grey">'
                            + moment(station_status.postarr).format(_$$_666.time_format) + ' '
                            + station_status.tz + 'T</div>';
                } else if (x != 0) {
                    if (!noStatus) {
                        extraContent +=
                                '<div class="if_train_extra_status_label float_left' + black + '">'
                                + 'Scheduled Arrival'
                                + ((hasEstArr) ? '<br />' + ((__$$_td[ID].properties.TrainState != 'Completed') ? 'Estimated Arrival' : 'Arrived') : "")
                                + '</div>'
                                + '<div class="if_train_extra_status_times float_left' + black + '">'
                                + moment(station_status.scharr || station_status.schdep).format(_$$_666.time_format)
                                + '&nbsp;' + station_status.tz + 'T'
                                + ((hasEstArr) ?
                                        '<br />'
                                        + moment(station_status.estarr).format(_$$_666.time_format)
                                        + '&nbsp;' + station_status.tz + 'T' : ''
                                        )
                                + '</div>';
                    } else {
                        extraContent +=
                                '<div class="if_train_extra_status_label float_left text_grey">'
                                + 'Arrived'
                                + '</div>'
                                + '<div class="if_train_extra_status_times float_left text_grey">&nbsp;</div>';
                    }
                }

                // cw: Now that sync service is determing no status trains by POSTCMNT, we check to insure
                // that the simpler logic (not the line below) will suffice.
                //if ((!hasPostArr && !hasPostDep && notLast) || noStatus) {
                if (noStatus) {
                    extraContent +=
                            '<div class="if_train_extra_status_comment float_right text_grey">'
                            + 'no status'
                            + '<div class="if_train_extra_status_ts_predeparture"></div>'
                            + '</div>';
                } else {
                    // cw: xxx - Dwell time bug lurks here.
                    // cw: xxx - Also be aware that if the train state is PREDEPARTURE, we should ignore any POSTED ARRIVALS.
                    // cw: Now handle downline station cancellations. 
                						
					
					var c = (hasSchCmnt) ?
                            station_status.schcmnt :
                            (hasPostArr) ? station_status.postcmnt : station_status.estarrcmnt;

				if(typeof c==='undefined')
						c= "";

					//It's a little convoluted but the X==0 takes care of showing the scheduled dep.			
                    extraContent +=
                            '<div class="if_train_extra_status_comment float_right' + grey + '">'
                            + formatComment((hasPostArr || hasSchCmnt || (hasEstDep && x==0)) ?
                                    c.toLowerCase() :
                                    ((hasEstArr) ? '<br />' + c.toLowerCase() : "")
                                    )
                            + ((hasPostArr || hasEstArr || hasSchCmnt) ?
                                    '<div class="if_train_extra_status_ts_' + evalTrainStatus(__$$_td[ID], c) + '"></div>' : ''
                                    )
                            + '</div>'				
                }
                extraContent += '</div>';			


            }

            // cw: Check for multi-day train.
            if (moment(d.properties.OrigSchDep).dayOfYear() != moment().dayOfYear()) {
                midContent +=
                        '<div class="float_left">' +
                        '<span class="text_blue bold">Departed From</span><br />' +
                        '<span class="text_black">'
                        + oData.City + ", " + oData.State + " (" + oData.Code + ")" +
                        '</span>' +
                        '</div><div class="float_right if_train_info_mid_mdt_orig"><br />' +
                        moment(d.properties.OrigSchDep).format("MMMM D, YYYY") +
                        '</div><div class="clear if_train_info_mid_vspacer">&nbsp;</div>'
            }

            d.train_status = __$$_td[ID].train_status;
            var nextStation = getNextStationDetail(d);

            // cw: May need to protect application against an undefined [nextStation.estarrcmnt].
            var tComment = d.properties.Comment;
            // cw: YYY - Stations can set downline ETAs or ETDs and the map will completely break. We need a more 
            // reliable way to determine the next station in absence of proper Event data.
            if (nextStation.HasEstimatedStatus) {
                tComment = formatComment(nextStation.estarrcmnt || nextStation.estdepcmnt);
            }

            var evnt = d.properties.EventT;			

            var tsRec = __$$_td[ID].train_status;
            trainStatus = evalTrainStatus(__$$_td[ID], tComment);

            if (evnt == "Estimated Departure")
                evnt = "Estimated Arrival";

            var nextStationDisplay = function(n, c) {
                return (typeof n == "undefined") ?
                        c :
                        n.City + ", " + n.State + " (" + n.Code + ")";
            };

            if (d.properties.TrainState == "Active") {
                if (typeof tComment == "undefined" && _$$_666.debug && _$$_666.log_type == 'verbose') {
                    log("No comment for active train: " + ID);
                }

                // cw: EventCode should ALWAYS be sent by __$$__dd.
				//TODO:  This is an issue 
                if (
                    d.properties.EventCode !== null &&
                    d.properties.EventCode.length > 0 
                ) {
                    // cw: If event isn't given, then assume "Estimated Arrival".
                    evnt = evnt || "Estimated Arrival";

                    var nextStation = getNextStationDetail(__$$_td[ID]);
                    if (typeof nextStation == "undefined") {
                        return;
                    }

				

                    if (evnt != "Arrival" || d.properties.EventCode != d.properties.DestCode) {
                        if (tsRec.length > 0) {
                            if (evnt == "Arrival" || evnt == "Departure") {
                                next_index = tsRec.last_station + 1;
                                if (next_index > tsRec.length - 1)
                                    next_index = tsRec.length - 1;

                                nCode = tsRec[next_index].code;
                                nData = stations[nCode];
                            }

							if(nCode==='CBN'){								
								nCode = nextStation.code;
								nData = stations[nCode];
							}

                            midContent +=
                                    "<span class=\"text_blue bold\">Next Station</span><br/>"
                                    + "<span class=\"text_black\">"
                                    + nextStationDisplay(nData, nCode)
                                    + "</span><br />"
                                    + '<div class="text_blue float_left if_train_info_mid_hspacer bold">'
                                    + ((nextStation.HasEstimatedStatus) ? "Estimated" : "Scheduled") + ' Arrival'
                                    + '</div>';
                        } else {
                            midContent += "<br />";
                        }
                    } else {
                        /*else if (evnt == "Departure") {
                         midContent += 
                         "<span class=\"text_blue bold\">Departure</span><br/>"
                         +	"<span class=\"text_black\">" 
                         + 		nData.City + ", " + nData.State + " (" + nData.Code + ")"
                         + 	"</span><br />" 
                         + 	'<div class="text_blue float_left if_train_info_mid_hspacer bold">Departed</div>';
                         } else if (evnt == "Arrival" && d.properties.EventCode == d.properties.DestCode) {
                         */
                        midContent +=
                                "<span class=\"text_blue bold\">Arrival Station</span><br/>"
                                + "<span class=\"text_black\">"
                                + nextStationDisplay(nData, nCode)
                                + "</span><br />"
                                + '<div class="text_blue float_left if_train_info_mid_hspacer bold">Arrived</div>';
                    }


                    /* 
                     * cw: xxx - Moved to extra content, float right.
                     *
                     midContent += "<div class=\"text_black clear\">As of " 
                     + moment(d.properties.LastValTS).format(_$$_666.time_format) + d.properties.EventTZ + "T</span></div></div>";
                     */
                    d.train_status = __$$_td[d.properties.ID].train_status;
                    var nextStation = getNextStationDetail(d);

                    midContent +=
                            '<div class="text_blue float_left bold">';

                    if (nextStation.HasPostedStatus) {
                        if (typeof d.properties.EventDT != "undefined" && d.properties.EventDT.length > 0) {
                            midContent += moment(d.properties.EventDT).format(_$$_666.time_format) + d.properties.EventTZ + "T";
                        }
                    } else {
                        if (nextStation.HasEstimatedStatus)
                            midContent += moment(nextStation.estarr).format(_$$_666.time_format) + nextStation.tz + "T";
                        else
                            midContent += moment(nextStation.scharr || nextStation.schdep).format(_$$_666.time_format) + nextStation.tz + "T";
                    }

                    midContent += '</div>'
                            + '<div class="text_black float_right if_train_info_comment">'
                            + ((nextStation.HasEstimatedStatus) ? tComment.toLowerCase() : 'no status')
                            + '<div class="if_train_extra_status_ts_' + trainStatus + '"></div>'
                            + '</div>';

                } else {
                    // cw: If we have no event, display that there is no current status for the train.
                    midContent +=
                            '<div class="text_black float_right if_train_info_comment">no status'
                            + '<div class="if_train_extra_status_ts_' + trainStatus + '"></div>'
                            + '</div>';
                }
            } else if (d.properties.TrainState == "Predeparture") {
				
                if (tsRec.length > 0) {
                nData = stations[tsRec[0].code];

				

				var hasED = false;
					
					//MB BUG 3456 fix. 4/22/2014				
                    midContent +=
                            "<span class=\"text_blue bold\">Departure Station</span><br/>"
                            + "<span class=\"text_black\">" + nextStationDisplay(nData, tsRec[0].code) + "</span><br />";

                    if (tsRec.length > 2) {                        
						//For the first station if there's an ED present show that.
						if(typeof (tsRec[0].estdep)!=='undefined'){
							midContent += '<div class="text_blue float_left if_train_info_mid_hspacer bold">Estimated Departure</div>'
                                + '<div class="text_blue float_left bold">'
                                + moment(tsRec[0].estdep).format(_$$_666.time_format) + tsRec[0].tz + 'T';
								hasED=true;
						
						}
						else{						
							midContent += '<div class="text_blue float_left if_train_info_mid_hspacer bold">Scheduled Departure</div>'
									+ '<div class="text_blue float_left bold">'
									+ moment(tsRec[0].schdep).format(_$$_666.time_format) + tsRec[0].tz + 'T';
						}
                    }
                    else {
                        midContent += '<div class="text_blue float_left if_train_info_mid_hspacer bold">Scheduled Arrival</div>'
                                + '<div class="text_blue float_left bold">'
                                + moment(tsRec[0].scharr).format(_$$_666.time_format) + tsRec[0].tz + 'T'
                    }

                 /*   midContent += '</div>'
                            + '<div class="text_black float_right if_train_info_comment">'
                            + 'no status'
                            + '<div class="if_train_extra_status_ts_predeparture"></div>'
                            + '</div>';*/

                } else {
                    // cw: xxx - Handling trains with no train status data?
                    midContent += '<br /><br />';
                }
            } else if (d.properties.TrainState == "Completed") {
                midContent +=
                        "<span class=\"text_blue bold\">Arrival Station</span><br/>"
                        + "<span class=\"text_black\">"
                        + nextStationDisplay(nData, nCode)
                        + "</span><br />"
                        + '<div class="text_blue float_left if_train_info_mid_hspacer bold">Arrived</div>';
            }
            midContent += "</div>";

			//TODO: The heading strikes again/
            var heading = "x";
            if(d.properties.Heading!==undefined){
				if (d.properties.Heading !== null && d.properties.Heading.length > 0) {
					heading = d.properties.Heading.toLowerCase();
				}
			}
			



            rightContent =
                    '<div class="if_train_info">'
                    + '<div class="if_train_speed">'
                    + '<div class="if_train_mph_val">';
					
					if(d.properties.TrainState==='Completed' || d.properties.TrainState==='Predeparture'){
						 rightContent+= Math.round('0.00');
					}
					else			
					{
						rightContent += Math.round(parseFloat(d.properties.Velocity) || 0);
					}

            rightContent += '</div>'
                    + '<div class="if_train_mph_label">MPH</div>'
                    + '</div>&nbsp;'
                    + '<div class="if_train_direction_' + heading + '"></div>&nbsp;'
                    + '<div class="if_train_status_' + trainStatus + '"></div>'
                    + '</div>';
        } else {
            /* SERVICE DISRUPTION */
            trainStatus = "predeparture";

            midContent +=
                    '<div class="error_icon"></div><span class="text_blue">INFORMATION UNAVAILABLE</span><br /><br />'
                    + 'Sorry, due to a service disruption, we are unable to provide estimated '
                    + 'departure and arrival times. For additional assistance, please contact '
                    + 'us at 1-800-USA-RAIL (1-800-872-7245).';

            rightContent =
                    '<div class="if_train_info">'
                    + '<div class="if_train_speed">'
                    + '<div class="if_train_mph_val">'
                    + Math.round(parseFloat(d.properties.Velocity) || 0)
                    + '</div>'
                    + '<div class="if_train_mph_label">MPH</div>'
                    + '</div>&nbsp;'
                    + '<div class="if_train_direction_x">&nbsp;</div>&nbsp;'
                    + '<div class="if_train_status_predeparture">&nbsp;</div>'
                    + '</div>';
        }

	
        var leftContent = d.properties.TrainNum;
        if( d.properties.RouteName != null ) leftContent += "&nbsp;&nbsp;" + d.properties.RouteName.toUpperCase();
        __$$_td[ID].infoWindow = new iwsInfoWindow({
            last_station: (srvDis) ? -1 : __$$_td[ID].train_status.last_station,
            left_content: leftContent,
            dashes: true,
            mid_content: midContent,
            extra_content: extraContent,
            right_content: rightContent,
            // cw: "position" probably unnecessary with Anchor.
            position: position,
            anchor: __$$_td[ID].marker,
            bottom_pointer: true,
            offsetHorizontal: -174,
            offsetVertical: -88,
            type: "train",
            fixup: (srvDis) ? null : function(t, d) {
                var statDiv = $(d).find(".if_train_extra_status");
                var statB = $(d).find("#expand_status_button");

                // Dynamic fix for no train status information.
                if (__$$_td[ID].train_status.length === 0) {
                    $(statB).hide();
                }

                // Dynamic fix for velocity > 99 mph.
                var vel = $(d).find(".if_train_mph_val");
                if (vel.text().length > 2) {
                    $(vel).attr('style', 'position: relative; left: -4px;');
                }

                $(statB).hover(
                        function() {
                            if (this.className.indexOf("minus") >= 0) {
                                this.className = "if_train_extra_content_status_minus_hover";
                            } else {
                                this.className = "if_train_extra_content_status_plus_hover";
                            }
                        },
                        function() {
                            if (this.className.indexOf("minus") >= 0) {
                                this.className = "if_train_extra_content_status_minus";
                            } else {
                                this.className = "if_train_extra_content_status_plus";
                            }
                        }
                ).click(function() {
                    
                    resetTimeout();
                    if (this.className.indexOf("minus") >= 0) {
                        this.className = 'if_train_extra_content_status_plus_hover';
                        t.showCaret();
                        statDiv.hide();						
                        map.redrawInfoWindow(250);
                        lastInfoWindow.collapsed = true;
                    } else {
                        this.className = 'if_train_extra_content_status_minus_hover';
                        t.hideCaret();
                        statDiv.show();
                        statDiv.scrollTop(0);
                        if (t.last_station >= 1) {
                            statDiv.scrollTop(
                                    $(d).find("#train_" + ID + "_status_" + t.last_station).position().top
                                    );
                        }
                        lastInfoWindow.collapsed = false;
                    }
                });
                statDiv.hide();

				var stnLink = $(d).find('.stationlink');
				stnLink.click(function(a,b){										
						selectStation(stations[a.currentTarget.id.split('_')[1]]);
				});
            }
        });

        // jw: Assign Info Window reference to the Marker. This reference will be used by a parent cluster.
        //      Unfortunately this creates a circular reference between the marker (anchor) and infoWindow
        __$$_td[ID].marker.infoWindow = __$$_td[ID].infoWindow;

		
	
        // cw: For length computations.
        var hoverLength = (d.properties.TrainNum + " " + d.properties.RouteName).length;
        var hoverPrefix = ((hoverLength > _$$_666.train_hover_long) ? "train_" : "train_short_");
        // cw: For display ONLY.
        var hoverContent = d.properties.TrainNum;
        if( d.properties.RouteName != null ) hoverContent += "&nbsp;&nbsp;" + d.properties.RouteName.toUpperCase();
        // cw: xxx - Move to _$$_666.js ASAP!
        
		var train_short_Y = -34;
		var train_Y = -36;
		
		if(isChrom){
			train_short_Y = -34;
			train_Y = -36;
		}

		var offsets = {
            train_short_: {
                Y: train_short_Y,
                X: -78
            },
            train_: {
                Y: train_Y,
                X: -110
            }
        };
        __$$_td[ID].hoverWindow = new iwsInfoWindow({
            hover_content: hoverContent,
            hover: true,
            position: position,
            anchor: __$$_td[ID].marker,
            type: hoverPrefix + trainStatus,
            // cw: Find out why!
            offsetVertical: offsets[hoverPrefix].Y,
            offsetHorizontal: offsets[hoverPrefix].X
        });

        __$$_tm.push(__$$_td[ID].marker);

		
		

        __$$_td[ID].events = {};

        __$$_td[ID].events.click = google.maps.event.addListener(__$$_td[ID].marker, "click", function(e) {

            __$$_lastSelTrDa = ID;
            
            resetTimeout();

            map.hideHoverWindows();
            map.hideInfoWindows();

			lastInfoWindow = __$$_td[ID].infoWindow;
            lastInfoWindow.setGMap(map);

            lastInfoWindow.draw();
            lastInfoWindow.show();
			map.setCenter(position);

            if ((map.IsDefaultView() || map.ZoomLevelChanged() || searchWindow.HasMultipleResults())) {
                if (map.MinorZoomTriggered()) {
                    map.redrawInfoWindow(500);
                }

                // jw: enhancement to prevent clustering from affecting info window rendering
                if (map.zoom < _$$_666.item_zoom) {
                    map.setZoom(_$$_666.item_zoom);
                } else {
                    map.redrawInfoWindow(500);
                }
            }		


            // Reset Values to Default
            zoomEventCount = 0;

            searchWindow.setOffset();

            searchWindow.minimize();

			if(searchWindow){
				if ($(searchWindow.div_).is(":visible")){
					if(searchWindow.extra_content.indexOf(__$$_lastSelTrDa)===-1){
						searchWindow.close();
						getRouteLayer(); //set the routelayer back
					}
				}  
			}


        });

        __$$_td[ID].events.mouseover =
                new google.maps.event.addDomListener(__$$_td[ID].marker, "mouseover", function(event) {
                    if (lastHover) {
                        return;
                    }

					//BT: 4035 - hover window would show up after you clicked after opening the infoWindow.
					if(lastInfoWindow==__$$_td[ID].infoWindow){
							return;
					}
                    lastHover = __$$_td[ID].hoverWindow;
                    lastHover.setGMap(map);
                    lastHover.show();
                    // Prevent original info window from showing.
                    cancelEvent(event);
                });

        __$$_td[ID].events.mouseout =
                new google.maps.event.addDomListener(__$$_td[ID].marker, "mouseout", function(event) {
                    if (lastHover === null) {
                        return;
                    }
                    if (lastHover.removeHoverDiv) {
                        lastHover.removeHoverDiv();
                        lastHover = null;
                        return;
                    }
                    lastHover.remove();
                    lastHover = null;

                    // Prevent original info window from showing.
                    cancelEvent(event);
                });
				
    });

    // Set up clustering and clustering hover events. 
    var setClusterDivImage = function(c, i) {
        var top, left;
        var cdiv = $(c.clusterIcon_.div_);

        cdiv.width(images[i].width);
        cdiv.height(images[i].height);
        cdiv.css("background-image", "url(" + images[i].src + ")");
        if (i == "cluster-hover") {
            deltaY = -1;
            deltaX = -1;
        } else {
            deltaY = 1;
            deltaX = 1;
        }
        cdiv.css("top",
                (
                        parseFloat(cdiv.css("top").replace("px", ""))
                        + deltaY * (images["cluster-hover"].height - images["cluster-bg"].height) / 2
                        ) + "px"
                );
        cdiv.css("left",
                (
                        parseFloat(cdiv.css("left").replace("px", ""))
                        + deltaX * (images["cluster-hover"].width - images["cluster-bg"].width) / 2
                        ) + "px"
                );
        cdiv.css("line-height", images[i].width + "px");
    }



    if (markerClusterer === null) {
			
        markerClusterer = new MarkerClusterer(map, __$$_tm.getArray(), _$$_666.clustering_options);
        google.maps.event.addListener(markerClusterer, 'mouseover', function(c, e) {
            map.hideHoverWindows();

            setClusterDivImage(c, "cluster-hover");
            this.attachHoverDiv(
                    c, c.getSize() + " TRAINS IN THE AREA", images["CL_HVR_Up"]
                    );
            cancelEvent(e);
        });
        google.maps.event.addListener(markerClusterer, 'mouseout', function(c, e) {
            this.removeHoverDiv();
            setClusterDivImage(c, "cluster-bg");
            cancelEvent(e);
        });
    } else if (filteredMarkers.length == 0) {
        // cw: XXX - So how do we update trains that may match the filter? Need a way to evaluate this on-the-fly!!
        markerClusterer.removeHoverDiv();
        markerClusterer.clearMarkers();
        markerClusterer.addMarkers(__$$_tm.getArray());
    }

    refreshInterval = setTimeout(__$$_ratl, _$$_666.train_refresh_interval * 1000);

    $("#timeout_content").mouseover(function() {
        $(this).focus();
    });

    $("#timeoutcontentlink").click(function() {
        self.location.reload();
    });
    if (timeoutInterval == 0){
        resetTimeout();
    }

    if ($("#search_field_wrapper").is(":hidden"))
        $("#search_field_wrapper").fadeIn(400);

    map.updateTrainData();
    map.refocusLastSelectedMarker();

}
catch(err){
	log(err);
}

}


var dRetry = 0;
var tries = 0;

/*Function to retrieve active trains layer*/
function __$$_ratl() {	
    //MB 7/3/2014: 
    if (map.SearchType == 'Route') {
        if (filteredMarkers.length == 0) {
            return;
        }
    }

	__$$_tm.clear();

	$.get(_$_tal_4,{
	
	})	
	.done(function(d){			
			try{			
                var dd=d.trim();
                /*MasterSegment is the length of the string at the end of the encrypted data that contains the secret key
                To decrypt - we do the following
                1. Take masterSegment (88) length - from the right of the data - this has the private key
                2. Everything from 0 to the end - master segment is the raw data - that needs to be decrypted
                3. Decrypt the 88 characters using the public key - that will give you a pipe separated string of the private key (random guid from MDS) and a time stamp (to scramble it)
                4. Now use the private key and decrypt the data stored from step 2.
                5. Parse the decrypted data - and rejoice
                6. KSUE -means key issue
                7. __$$_jmd - the public key that we obtain

                __$_s1 : variable name for the Security object in the Helper.js file - that file has the calls to actually decrypt the data.
                
                */

                var json = JSON.parse(__$_s1._$_dcrt(dd.substring(0,dd.length-masterSegment),__$_s1._$_dcrt(dd.substr(dd.length - masterSegment),__$$_jmd).split('|')[masterSegment-88]));
               //Bug fix 1: 9/17/2020
                __$$_rtd( json );
			}
			catch(r){
				tries++;
				if(tries<=dRetry){			
					setTimeout(__$$_ratl, 1500);
					log('retry num',tries);
				 }
				 else{
					log('ksue');
					showTrackingUnavailable(true);
	                isUnavailable = true;
				 }
			}	

});



    $(window).resize(function() {
        $('.timeout_content').css({
            top: ($('#timeout').outerHeight() - $('.timeout_content').height()) / 2 + "px",
            left: ($('#timeout').outerWidth() - $('.timeout_content').width()) / 2 + "px"
        });

        $('.unavailable_content').css({
            top: ($('#unavailable').outerHeight() - $('.unavailable_content').height()) / 2 + "px",
            left: ($('#unavailable').outerWidth() - $('.unavailable_content').width()) / 2 + "px"
        });

        $('.compatmode_content').css({
            top: ($('#compatmode').outerHeight() - $('.compatmode_content').height()) / 2 + "px",
            left: ($('#compatmode').outerWidth() - $('.compatmode_content').width()) / 2 + "px"
        });

    });
    $(window).resize();
}
var routeLayer;
function getRouteLayer(sqlStmt) {    

    if(sqlStmt=='' ){
    var url = _$$_666.baseRouteLayerURL;

    $.getJSON(url, function (data) {
         routeLayer = map.data.addGeoJson(data);
    map.data.setStyle({strokeColor:_$$_666.baseLayerLineStyleStrokeColor, strokeWeight:_$$_666.baseLayerLineStyleStrokeWeight});
  
    }); 

 
    }else{
        
        // Setup event handler to remove GeoJSON features

    for (var i = 0; i < routeLayer.length; i++){
      map.data.remove(routeLayer[i]);
    }
  
        var newURL = _$$_666.baseRouteLayerURL + sqlStmt;
    $.getJSON(newURL, function (data) {
        routeLayer = map.data.addGeoJson(data);
        map.data.setStyle({strokeColor:_$$_666.highlightedLayerLineStyleStrokeColor, strokeWeight:_$$_666.highlightedLineStyleStrokeWeight});
       
     }); 



    }

}

function calculateIconScaleFromZoomLevel(zLevel){
		var newIcon = _$$_666.stationIconRegular; //base value
		//Scale revised  Per BT:3607 MB
		if(zLevel>4 && zLevel<=7)
				newIcon=_$$_666.stationIconRegular;
		if(zLevel>=8 && zLevel<=10)
				newIcon=_$$_666.stationIconMedium;
		if(zLevel>10)
				newIcon=_$$_666.stationIconLarge;

		return newIcon;
}


$(document).ready(function() {
    jQuery.support.cors = true;

    //Check for IE 7.
    if (document.documentMode != null) {
        if (document.documentMode == 7 || $("html").hasClass("ie8")) {
            showCompatWindow();
            return;
        }
    }
    //before you do anything - check for IE7,8 mode - paranoid check
    if (navigator.userAgent.indexOf("MSIE 7.0") > -1 || navigator.userAgent.indexOf("MSIE 8.0")> -1) {
        showCompatWindow();
        return;
    }

    // Compute the rest of the fields in the configuration namespace.
    finalizeConfiguration();

    // Set error handling according to the configuration.
    if (_$$_666.silent_errors) {
      //  window.onerror = silentErrorHandler;
    }

    // Start the mapping application.
    //google.maps.event.addDomListener(window, 'load', initialize);
    
    initialize();
    //document.addEventListener("DOMContentLoaded", initialize);
    //$(window).load(initialize());
});