var baseMapColorOpts = 
[
    {
        "featureType": "water",
        "stylers": [ 
            { 
                "color": "#74E0FD" 
            } 
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "geometry",
        "stylers": [ 
            {
                "color": "#F3F7F8" 
            } 
        ]
    },
    {
        "featureType": "landscape.natural",
        "elementType": "geometry",
        "stylers": [ 
            {
                "color": "#F3F7F8" 
            } 
        ]
    },
    {
        "featureType": "landscape.natural.terrain",
        "stylers": [ 
            { 
                "visibility": "off" 
            } 
        ]
    },
    {
        "featureType": "road",
        "stylers": [ 
            { 
                "visibility": "simplified" 
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [ 
            { 
                "color": "#FFFFFF" 
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels.icon",
        "stylers": [
            {
                "saturation": "-100"
            },
            {
                "lightness": "44"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#666969"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [ 
            { 
                "color": "#F1F8B2" 
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "labels.icon",
        "stylers": [ 
            {
                "saturation": "-100"
            },
            {
                "lightness": "20"
            }
        ]
    },
    {
        "featureType": "poi.attraction",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#DAE8D1"
            }
        ]
    },
    {
        "featureType": "poi.school",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#F3F7F8"
            }
        ]
    },
    {
        "featureType": "poi.medical",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#F3F7F8"
            }
        ]
    },
    {
        "featureType": "poi.business",
        "elementType": "geometry",
        "stylers": [ 
            { 
                "color": "#DAE8D1" 
            } 
        ]
    },
    {
        "featureType": "poi.government",
        "elementType": "geometry",
        "stylers": [ 
            { 
                "color": "#DAE8D1" 
            }
        ]
    },
    {
        "featureType": "poi.place_of_worship",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#F3F7F8"
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [ 
            { 
                "color": "#F1F8B2" 
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels",
        "stylers": [
            { 
                "visibility": "off" 
            }
        ]
    },
    {
        "featureType": "transit.line",
        "stylers": [ 
            { 
                "visibility": "off" 
            } 
        ]
    },
    {
        "featureType": "administrative",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#666969"
            }
        ]
    },
];

var baseMapStyle = 
{
    MapTypeId: 'base_map_style',
    CustomMapType: new google.maps.StyledMapType(baseMapColorOpts, { name: 'Map' })
};