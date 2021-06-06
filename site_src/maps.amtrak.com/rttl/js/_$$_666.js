/*
 Developed by: Volanno.
 Website: //www.volanno.com/
 Copyright 2020 by Volanno.
 */

 var hostConfig = {
        hostPath: '//maps.amtrak.com/rttl'
        // hostPath: '//localhost:3000'
};



var _$_tal_4 = 'https://maps.amtrak.com/services/MapDataService/trains/getTrainsData';
var _$_sal_5 = 'https://maps.amtrak.com/services/MapDataService/stations/trainStations';


var trainOrdinalMarkerIcons = {};
var _$$_666 = {
    // Maximum idle time, in seconds.
    session_timeout: 1200,
    // Train layer refresh interval, in seconds.
    refresh_timeout: 270,
    // Max difference b/w the last validation timestamp and the current date in minutes.
    lastUpdateDiff: 30,
    // Maximum number of retries to reload train layer.
    max_load_retries: 3,
    // Time between active train reloads, in seconds.
    train_refresh_interval: 300,
    // Delay for loading active trains layer (which is loaded after stations data), in milliseconds.
    train_layer_delay: 150,
    // jw: Maximum number of stations any route can have for Train Status information
    max_stations: 45,
    //route_list_url: '//realtimetrainmap.iws.hq/rttl/js/RoutesList.json',
    route_list_url: hostConfig.hostPath + '/js/RoutesList.json',
    //route_properties_url: '//realtimetrainmap.iws.hq/rttl/js/route_properties.json',
    route_listview_url: hostConfig.hostPath + '/js/RoutesList.v.json',
	 route_properties_url: hostConfig.hostPath + '/js/route_properties.json',
    silent_errors: true,
    // TASK: Set back to false for production
    debug: true,
    log_type: 'info', // values are 'info', 'verbose'

    restrict_bounds: true,
    // Global time format.
    time_format: "h:mm a ",
    original_line_style: {
        strokeColor: "red",
        strokeWidth: "2px",
        strokeOpacity: 1//,
        //zIndex: "4"
    },
    highlighted_line_style: {
        strokeColor: "red",
        strokeWidth: "4px",
        zIndex: "6"
    },

    baseLayerLineStyleStrokeColor:'#FF031D',
    baseLayerLineStyleStrokeWeight:2,
    highlightedLayerLineStyleStrokeColor:'#FF0000',
    highlightedLineStyleStrokeWeight:3,
    baseRouteLayerURL:'//maps.amtrak.com/services/MapDataService/stations/nationalRoute?routeName=',
    vAllTrainsURL:'//maps.amtrak.com/services/MapDataService/stations/AllTTMTrains',

    // Default center of map.
    map_center: new google.maps.LatLng(37.7, -100.0),
    // Station icon.

   /* station_icon: {
        // Location relative to root of image to be used for stations.
        // This is preloaded using config.images, below.
        url: "/rttl/img/STA_icon.png",
        // Anchor point for icon
        anchor: new google.maps.Point(5, 5)
    },*/

	stationIconRegular: {
	    	url: hostConfig.hostPath + '/img/small-station.png',
	 	    anchor: new google.maps.Point(5, 5),
			getNewInstance: function(){ return Object.create(this); }
	},
	stationIconMedium: {
	    	url: hostConfig.hostPath + '/img/medium-station.png',
			anchor: new google.maps.Point(7, 7),
            getNewInstance: function(){ return Object.create(this); }
	 },
	stationIconLarge: {
	    	url: hostConfig.hostPath + '/img/large-station.png',
			anchor: new google.maps.Point(9, 9),
            getNewInstance: function(){ return Object.create(this); }
	},
    map_type_id: 'custom_style',//'base_map_style', //
    train_hover_long: 17,
    // vv - changed from 12
    item_zoom: 6,

    // JW - added to set timeouts for zoom info window redraws
    redraw_timeout: 800,
    map_options: {
        zoom: 4, //this zoom gets overwritten by the zoom level depending on the screen size like TPM
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
            // Defined in post-config.
            mapTypeIds: [],
			 position: google.maps.ControlPosition.RIGHT_TOP
        },
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.LARGE,
            position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        // Defined in post-config.
        mapTypeId: '',
        streetViewControl: false,
        panControl: false, /* VV - 7/1/2014 - changed to false to hide pan control */
        panControlOptions: {
            style: google.maps.ZoomControlStyle.LARGE,
            position: google.maps.ControlPosition.LEFT_TOP
        },
        maxZoom: 15,
        minZoom: 4,
        controlSize: 24
    },
    zoom_level_resolver: {
        1: 0,
        2: 4,
        3: 6,
        4: 8,
        5: 9
    },
    clustering_options: {
        minimumClusterSize: 4,
        maxZoom: 15,
        gridSize: 40,
        averageCenter: true
    },
    // Visible bounds of North America.
    strict_bounds: new google.maps.LatLngBounds(
            new google.maps.LatLng(24.70, -127.50), // sw
            new google.maps.LatLng(49.85, -68.90)		// ne
            ),
    fields: [
        'ID',
        'TrainNum',
        'Aliases',
        'OrigSchDep',
        'OriginTZ',
        'TrainState',
        'Velocity',
        'RouteName',
        'CMSID',
        'OrigCode',
        'DestCode',
        'EventCode',
        'EventDT',
        'EventT',
        'EventTZ',
        'LastValTS',
        'Heading',
        'Comment',
        'EventSchAr',
        'EventSchDp',
    ],
    // Reserve for image definitions.
    images: [],
    // Reserve for train status fields.
    extra_fields: []
};

function finalizeConfiguration() {
	// Determine browser.
    _$$_666.isIE8 = ($("html").hasClass("ie8"));

    // Post configuration settings.
    _$$_666.map_options.center = _$$_666.map_center;
    _$$_666.map_options.mapTypeId = _$$_666.map_type_id;
    _$$_666.map_options.mapTypeControlOptions.mapTypeIds = [google.maps.MapTypeId.SATELLITE, _$$_666.map_type_id];

    // Add in train status fields.
    for (var i = 1; i <= _$$_666.max_stations; i++) {
        _$$_666.extra_fields.push('Station' + i);
    }
    _$$_666.extra_fields.push('StationMsg');

    // Clustering images.
    _$$_666.images.push(
            ["cluster-hover"],
            ["STA_icon"],
            ["CL_HVR_Up", {offsetX: 79, offsetY: 40}],
            ["hovers/STA_Short_Up", "hoverwindow_station_short"],
            ["hovers/STA_Medium_Up", "hoverwindow_station_med"],
            ["hovers/STA_Long_Up", "hoverwindow_station_long"],
            ["BTN_resetUp", "map_reset_button"],
            ["STA_platform", "if_station_icon_platform"],
            ["STA_shelter", "if_station_icon_shelter"],
            ["STA_station", "if_station_icon_station"],
            ["SessionTimeout", "timeout_content"],
            ["ErrorIcon", "error_icon",
                "position: relative; " +
                        "float: left; " +
                        "padding-right: 5px; " +
                        "background-repeat: no-repeat; "
            ],
            // Images that add custom CSS to basic style.
                    [
                        "TR_arrow", "if_right_arrow",
                        "background-repeat: no-repeat; " +
                                "background-position: center; "
                    ]
                    );

            // Minus/Plus "buttons"
            $.each(["Minus", "Plus"], function(i, s) {
				_$$_666.images.push(
                        ["TR_NAME_Active" + s + "_Up", "if_train_search_results_" + s.toLowerCase()],
                        ["TR_Status" + s + "_Up", "if_train_extra_content_status_" + s.toLowerCase()],
                        ["TR_NAME_Active" + s + "_Over", "if_train_search_results_" + s.toLowerCase() + "_hover"],
                        ["TR_Status" + s + "_Over", "if_train_extra_content_status_" + s.toLowerCase() + '_hover'],

						["STA_Arrivals" + s , "if_station_extra_content_arrivals_" + s.toLowerCase()],
						["STA_Departures" + s, "if_station_extra_content_departures_" + s.toLowerCase()]

                        );
            });

            // Go Buttons
            _$$_666.images.push(["WIN_GoUp", function(t, s) {
                    var newStyleElem = "#search_button { width: " + t.width + "px; height: " + t.height + "px; }"
                    if (_$$_666.isIE8) {
                        return newStyleElem;
                    } else {
                        $(s).append(newStyleElem);
                    }
                }]);

            // Main clustering image.
            _$$_666.images.push(["cluster-bg", function(t) {
                    _$$_666.clustering_options.styles = [
                        {
                            textColor: "white",
                            width: t.width,
                            height: t.height,
                            url: t.src
                        }
                    ];
                }]);

            // Status images.
            $.each(["ok", "cancel", "delay", "predeparture"], function(i, s) {
                _$$_666.images.push(["status_flags/TR_Flag_" + s, "if_train_status_" + s]);
                _$$_666.images.push(["status_flags/TR_SqStatus_" + s, "if_train_extra_status_ts_" + s]);
                _$$_666.images.push(["hovers/TR_HVR_" + s, "hoverwindow_train_" + s]);
                _$$_666.images.push(["hovers/TR_HVR_short_" + s, "hoverwindow_train_short_" + s]);
            });

            // Directional images.
            $.each(["x", "n", "ne", "e", "se", "s", "sw", "w", "nw"], function(i, o) {
                _$$_666.images.push(["directions/TR_Direction_" + o.toUpperCase(), "if_train_direction_" + o]);
                _$$_666.images.push(["TR_icon_" + o, function(t) {
                        // Note use of function to preserve scope of [o].
                        (function(ord) {
                            trainOrdinalMarkerIcons[ord] = {
                                anchor: new google.maps.Point(t.width / 2, t.height / 2),
                                url: t.src
                            };
                        })(o);
                    }]);
            });
        }