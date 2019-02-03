GPXFile = function() {

  var gpxFile = {};
  gpxFile.DEFAULT_GPXNAME = "Smoothed Ride";
  gpxFile.DEFAULT_DESCRIPTION = "Created by running the ride through a smoothing algorithm.";

  // formatXML taken from https://gist.github.com/sente/1083506 (Stuart Powers)
  gpxFile.formatXML = function (xml) {
    var formatted = '';
    var reg = /(>)(<)(\/*)/g;
    xml = xml.replace(reg, '$1\r\n$2$3');
    xml = xml.replace(/ xmlns=""/g, '');
    var pad = 0;
    jQuery.each(xml.split('\r\n'), function(index, node) {
      node = $.trim(node);
      var indent = 0;
      if (node.match( /.+<\/\w[^>]*>$/ )) {
        indent = 0;
      } else if (node.match( /^<\/\w/ )) {
        if (pad != 0) {
          pad -= 1;
        }
      } else if (node.match( /^<\w[^>]*[^\/]>.*$/ )) {
        indent = 1;
      } else {
        indent = 0;
      }
      var padding = '';
      for (var i = 0; i < pad; i++) {
        padding += '  ';
      }
      formatted += padding + node + '\r\n';
      pad += indent;
    });
    return formatted;
  };

  gpxFile.generateNewHeader = function (xml, gpxName, gpxDescription) {
    var gpxDoc = $.parseXML(xml);
    if (gpxName || gpxDescription) {
      var metaData = $(gpxDoc).find('metadata');
      if (metaData.length > 0) {
        if (gpxName && gpxName.length > 0) {
          var eltName = metaData.find('name');
          if (eltName.length > 0) {
            eltName[0].textContent = gpxName;
          }
        }
        if (gpxDescription && gpxDescription.length > 0) {
          var eltDescription = metaData.find('desc');
          if (eltDescription.length > 0) {
            eltDescription[0].textContent = gpxDescription;
          }
        }
      }
    }
    return(new XMLSerializer()).serializeToString(gpxDoc);
  };

  gpxFile.generateNewGPX = function (xml, dataValues) {
    var gpxDoc = $.parseXML(xml);
    var eleTrkpt =  $(gpxDoc).find('trkpt');
    var numPoints = eleTrkpt.length;
    for (var iDataValue = 0; iDataValue < numPoints; iDataValue++) {
      var eleElevation = $(eleTrkpt[iDataValue]).find("ele");
      if (eleElevation.length > 0) {
        if (dataValues[iDataValue].ele !=  Number(eleElevation[0].textContent)) {
          eleElevation[0].textContent = dataValues[iDataValue].ele.toString();
        }
      } else {
        var newElevation = gpxDoc.createElement("ele");
        newElevation.appendChild(gpxDoc.createTextNode(dataValues[iDataValue].ele.toString()));
        eleTrkpt[iDataValue].appendChild(newElevation);
      }
    }
    return(new XMLSerializer()).serializeToString(gpxDoc);
  };

  gpxFile.parseHeader = function(doc) {
    var metaData = $(doc).find('metadata');
    var gpxName = gpxFile.DEFAULT_GPXNAME;
    var gpxDescription = gpxFile.DEFAULT_DESCRIPTION;
    if (metaData.length > 0) {
      var eltName = metaData.find('name');
      if (eltName.length > 0) {
        var docName = eltName[0].textContent;
        docName = $.trim(docName);
        if (docName.length > 0) {
          gpxName = docName;
        }
      }
      var eltDescription = metaData.find('desc');
      if (eltDescription.length > 0) {
        var docDescription = eltDescription[0].textContent;
        docDescription = $.trim(docDescription);
        if (docDescription.length > 0) {
          gpxDescription = docDescription;
        }
      }
    }
    return {gpxName: gpxName, gpxDescription: gpxDescription};
  };

  gpxFile.parseGPX = function (xml) {
    var rawValues = [];
    var previous =  null;
    var totalDistance = 0;
    var totalSlope = 0;
    var bElevationAdded = false;
    var doc = $.parseXML(xml);
    var fileInfo = gpxFile.parseHeader(doc);
    $(doc).find('trkpt').each(function(){
      var point =  {};
      point.lat = Number($(this).attr("lat"));
      point.long =  Number($(this).attr("lon"));
      var eleElevation = $(this).find("ele");
      if (eleElevation.length > 0) {
        point.ele =  Number(eleElevation[0].textContent);
      } else {
        // Add the elevation. TACX won't accept a track at zero elevation so
        // set it to the value of the previous point, or an arbitrary value of
        // 100 meters if there is no previous elevation.
        if (previous && previous.ele) {
          point.ele =  previous.ele;
        } else {
          point.ele =  100;
        }
        bElevationAdded = true;
      }
      point.distance = 0;
      point.totalDistance = 0;
      point.slope = 0;
      if (previous) {
        point.distance = distVincenty(previous.lat, previous.long, point.lat, point.long);
        if (point.distance) {
          point.slope = (point.ele - previous.ele) / point.distance;
        }
        totalDistance += point.distance;
        point.totalDistance = totalDistance;
      }
      totalSlope += point.slope;
      rawValues.push(point);
      previous = point;
    });
    fileInfo.rawValues = rawValues;
    fileInfo.bElevationAdded = bElevationAdded;
    fileInfo.totalSlope = totalSlope;
    fileInfo.totalDistance = totalDistance;
    return fileInfo;
  };

  return gpxFile;

};
