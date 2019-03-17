/*

 This software is released under the MIT License.

 Copyright (c) 2013-2015, Brenda Zysman

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.

 */
$(document).ready(function(){

  var DEFAULT_FILENAME = "smoother.gpx";
  var rawValues = [];
  var smoothValues = [];
  var ABOUT_HEIGHT = "400px";
  var UPDATE_HEIGHT = "600px";
  var xml, newXML;
  var rawTotalSlope;
  var totalDistance;
  var eltFileName = $("#fileName");
  var eltGPXName = $("#gpxName");
  var eltGPXDescription = $("#gpxDescription");
  var eltDownloadStatus = $(".downloadStatus");
  var eltElevationStatus = $('.eleStatus');
  var eltNumPoints = $("#numPoints");
  var graph = new AreaGraph();
  var gpxFile= new GPXFile();
  var fileName = DEFAULT_FILENAME;
  var gpxName = gpxFile.DEFAULT_GPXNAME;
  var gpxDescription = gpxFile.DEFAULT_DESCRIPTION;

  function init() {

    $('#gpxFile').change(handleFileSelect);
    $("#downloadGPX").click(onDownloadGPX);
    $('#smooth').click(smooth);
    $('#setRange').click(setRange);
    $('#flatten').click(flatten);
    $('#elevate').click(elevate);
    $('#reload').click(reloadValues);
    $('.nav-bar button').click(toggleView);
    $('.chart-bar button').click(toggleChart);
    $(".show-original").click(onToggleOriginalDisplay);

    eltGPXName.change(function() {
      updateXMLMetadata();
    });
    eltGPXDescription.change(function() {
      updateXMLMetadata();
    });

    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList) {
      // Great success! All the File APIs are supported.
    } else {
      alert('Sorry, this will not work in your browser, because file APIs are not fully supported.');
    }
  }

  function displaySlope(totalSlope, numValues) {
    var strSlope = '';
    if (numValues > 1) {
      totalSlope += .0000000005;  // Deal with floating point error
      strSlope = strSlope + parseInt((totalSlope / (numValues - 1) ) * 10000) / 100;
    }
    $('.avg').text(strSlope + '%');
    return(strSlope);
  }

  function updateUI(points, totalSlope) {
    displaySlope(totalSlope, points.length);
    graph.setLine(points, "modified", true);
    updateNewXML(gpxFile.generateNewGPX(newXML, points));
  }

  function toggleView(event) {
    var active = $(".nav-bar button.active");
    active.removeClass("active");
    if (active.hasClass("btnSmooth")) {
      $(".smootherView").hide();
    } else if (active.hasClass("btnAbout")) {
      var about = $(".about");
      about.hide();
      about.height(0);
    } else if (active.hasClass("btnUpdates")) {
      var newStuff = $(".newStuff");
      newStuff.hide();
      newStuff.height(0);
    }
    var targetButton = $(event.target);
    targetButton.addClass('active');
    if (targetButton.hasClass('btnAbout')) {
      var aboutSection =  $(".about");
      $("body,html").stop().animate({scrollTop: 0}, 444);
      aboutSection.show();
      aboutSection.stop().animate({height: ABOUT_HEIGHT, opacity: 1}, 555, "swing", function() {
      });
    } else if (targetButton.hasClass('btnUpdates')) {
      var updateSection =  $(".newStuff");
      $("body,html").stop().animate({scrollTop: 0}, 444);
      updateSection.show();
      updateSection.stop().animate({height: UPDATE_HEIGHT, opacity: 1}, 555, "swing", function() {
      });
    } else if (targetButton.hasClass('btnSmooth')) {
      $(".smootherView").show();
      if (graph) {
        graph.resize();
      }
    }
  }

  function toggleChart(event) {
    event.preventDefault();
    var active = $(".chart-bar button");
    active.removeClass("active");
    var targetButton = $(event.target);
    targetButton.addClass('active');
    graph.graphType(targetButton.data("target"));
    graph.reset();
    if (rawValues.length)
      graph.setLine(rawValues, "original", true);
    if (smoothValues.length)
      graph.setLine(smoothValues, "modified", true);
  }

  function onToggleOriginalDisplay() {
    graph.showOriginal($('.show-original input').is(':checked'));
  }

   function smooth() {
    var dataLength = rawValues.length;
    if (dataLength === 0) {
      return;
    }

    var smoothingSize = Math.floor(Number(eltNumPoints.val())/2);
    if (smoothingSize < 2 || smoothingSize > dataLength / 2) {
      smoothingSize = 2;
      eltNumPoints.val(5);
    }

    var toSmooth = rawValues;
    if (smoothValues.length > 0) {
      toSmooth = smoothValues;
    }
    var selected = graph.selected();
    var startDistance = selected[0];
    var endDistance = selected[1];
    var distance = 0;
    var newElevations = [];
    for (var i = 0; i < dataLength; i++) {
      var sumValues = 0;
      var start = i - smoothingSize;
      if (start < 0) {
        start = 0;
      }
      var end = i + smoothingSize;
      if (end > dataLength - 1){
        end = dataLength - 1;
      }
      for (var j = start; j <= end; j++) {
        sumValues += toSmooth[j].ele;
      }
      newElevations.push(sumValues / (end - start + 1));
    }
    var newValues = [];
    var previous = null;
    var totalSlope = 0;
    for (i = 0; i < dataLength; i++) {
      var point = jQuery.extend(true, {},  toSmooth[i]);
      distance = distance + point.distance;
      if (distance >= startDistance && distance <= endDistance) {
        point.ele = newElevations[i];
        point.slope = 0;
        if (previous && point.distance) {
          point.slope = (point.ele - previous.ele) / point.distance;
        }
      }
      newValues.push(point);
      previous = point;
      totalSlope = totalSlope + point.slope;
    }
    smoothValues = newValues;
    updateUI(smoothValues, totalSlope);
   }

  function flatten() {
    var dataLength = rawValues.length;
    if (dataLength === 0)
      return;
    var toFlatten = rawValues;
    if (smoothValues.length > 0) {
      toFlatten = smoothValues;
    }
    var flatValues = [];
    var maxDelta = Math.abs(Number($("#maxDelta").val())) / 100;
    var previous = null;
    var totalSlope = 0;
    var selected = graph.selected();
    var startDistance = selected[0];
    var endDistance = selected[1];
    var distance = 0;
    for (var i = 0; i < dataLength; i++) {
      var point = jQuery.extend(true, {},  toFlatten[i]);
      if (previous) {
        distance = distance + point.distance;
        if (distance >= startDistance && distance <= endDistance) {
          var deltaSlope = point.slope - previous.slope;
          if (Math.abs(deltaSlope) > maxDelta) {
            if (deltaSlope > 0) {
              point.slope = previous.slope + maxDelta;
            } else if (deltaSlope < 0) {
              point.slope = previous.slope - maxDelta;
            }
          }
          point.ele = (point.slope * point.distance) + previous.ele;
        }
      }
      totalSlope = totalSlope + point.slope;
      flatValues.push(point);
      previous = point;
    }
    smoothValues = flatValues;
    updateUI(smoothValues, totalSlope);
  }

  function elevate () {
    var dataLength = rawValues.length;
    if (dataLength === 0)
    return;
    var toElevate = rawValues;
    if (smoothValues.length > 0) {
      toElevate = smoothValues;
    }
    var distance = 0;
    var elevatedValues = [];
    var elevateValue = Number($("#elevateValue").val());
    var selected = graph.selected();
    var startDistance = selected[0];
    var endDistance = selected[1];
    var totalSlope = 0;
    for (var i = 0; i < dataLength; i++) {
      var point = jQuery.extend(true, {},  toElevate[i]);
      if (distance >= startDistance && distance <= endDistance) {
        point.ele = point.ele + elevateValue;
      }
      distance =  distance + point.distance;
      totalSlope = totalSlope + point.slope;
      elevatedValues.push(point);
    }
    smoothValues = elevatedValues;
    updateUI(smoothValues, totalSlope);
  }

  function setRange() {
    var dataLength = rawValues.length;
    if (dataLength === 0)
      return;
    var toFlatten = rawValues;
    if (smoothValues.length > 0) {
      toFlatten = smoothValues;
    }
    var flatValues = [];
    var maxSlope = Number($("#maxSlope").val()) / 100;
    var minSlope = Number($("#minSlope").val()) / 100;
    var selected = graph.selected();
    var startDistance = selected[0];
    var endDistance = selected[1];
    var distance = 0;
    var previous = null;
    var totalSlope = 0;
    for (var i = 0; i < dataLength; i++) {
      var point = jQuery.extend(true, {},  toFlatten[i]);
      if (previous) {
        var slope = toFlatten[i].slope;
        distance = distance + point.distance;
        if (distance >= startDistance && distance <= endDistance) {
          if (slope > maxSlope) {
            slope = maxSlope;
          } else if (slope < minSlope) {
            slope = minSlope;
          }
        }
        point.ele = (slope * point.distance) + previous.ele;
        point.slope = slope;
        totalSlope = totalSlope + point.slope;
      }
      flatValues.push(point);
      previous = point;
    }
    smoothValues = flatValues;
    updateUI(smoothValues, totalSlope);
  }

  function updateFilename() {
    var newName = eltFileName.val();
    newName = $.trim(newName);
    if (newName.length > 0) {
      fileName = newName;
    } else {
      fileName = DEFAULT_FILENAME;
      eltFileName.val(fileName);
    }
  }

  function updateXMLMetadata() {
    if (newXML) {
      gpxName = $.trim(eltGPXName.val());
      gpxDescription = $.trim(eltGPXDescription.val());
      newXML = $("#newXML").val();
      newXML = gpxFile.generateNewHeader(newXML, gpxName, gpxDescription);
      return updateNewXML(newXML);
    } else {
      return(null);
    }
  }

  function onDownloadGPX(event) {
    // Update before downloading (in case we haven't
    // lost focus from an input box)
    updateFilename();
    if (!updateXMLMetadata())
      event.preventDefault();
  }

  function updateNewXML(value) {
    var canDownload;
    newXML = gpxFile.formatXML(value);
    $("#newXML").val(newXML);
    var downloadGPX = $("#downloadGPX");
    var fileContents = 'File too large to download...';
    if (newXML.length > 1100000 ) {
      eltDownloadStatus.show();
      canDownload = false;
    } else {
      eltDownloadStatus.hide();
      fileContents = encodeURIComponent(newXML);
      canDownload = true;
    }
    downloadGPX.attr('href', 'data:text/plain;charset=utf-8,' + fileContents);
    downloadGPX.attr('download', fileName);
    return(canDownload);
  }

  function reloadValues() {
    if (rawValues.length > 0) {
      smoothValues = [];
      updateNewXML(gpxFile.generateNewGPX(newXML, rawValues));
      graph.reset();
      graph.setLine(rawValues, "original", false);
      displaySlope(rawTotalSlope, rawValues.length);
    }
  }

  function parseValues() {
    smoothValues = [];
    var gpxFileInfo = gpxFile.parseGPX(xml);
    gpxName = gpxFileInfo.gpxName;
    gpxDescription = gpxFileInfo.gpxDescription;
    rawTotalSlope =  gpxFileInfo.totalSlope;
    rawValues = gpxFileInfo.rawValues;
    totalDistance = gpxFileInfo.totalDistance;

    $("#gpxName").val(gpxName);
    $("#gpxDescription").val(gpxDescription);
    displaySlope(rawTotalSlope, rawValues.length);
    graph.setLine(rawValues, "original", false);
    if (gpxFileInfo.bElevationAdded) {
      eltElevationStatus.show();
      updateNewXML(gpxFile.generateNewGPX(xml, rawValues));
    } else {
      eltElevationStatus.hide();
      updateNewXML(xml);
    }
  }

  function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object
    if (files.length === 0)
      return;
    var reader = new FileReader();
    reader.onload = function() {
      xml = reader.result;
      graph.reset();
      parseValues();
    };
    reader.readAsText(files[0]);
  }

  init();

});