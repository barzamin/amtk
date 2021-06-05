#!/bin/sh

curl -LO https://maps.amtrak.com/rttl/js/RoutesList.v.json
curl -L 'https://maps.amtrak.com/rttl/js/RoutesList.json?dataType=json&contentType=application%2Fjson&crossDomain=true&cache=false' > RoutesList.json
curl -LO 'https://maps.amtrak.com/services/MapDataService/stations/trainStations'
