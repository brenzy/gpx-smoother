AreaGraph = function() {

  var areaGraph = {};

  areaGraph.graphType = function(value) {
    graphType = value;
  };

  areaGraph.yAxisText = function() {
    return (graphType === "slopeDistance") ? "Slope (%)" : "Elevation (m)";
  };

  areaGraph.setDimensions = function () {
    dimensions = {
      width: parseInt(d3.select("#chart").style("width")),
      height: parseInt(d3.select("#chart").style("height"))
    };
    miniDimensions = {width: dimensions.width, height: 200};

    width = dimensions.width - margin.left - margin.right;
    height = dimensions.height - margin.top - margin.bottom;
    svg.attr("width", dimensions.width);
    svg.attr("height", dimensions.height);

    miniHeight = miniDimensions.height - margin.top - margin.bottom;
    miniSvg.attr("width", dimensions.width);
    miniSvg.attr("height", miniDimensions.height);
  };

  // Define responsive behavior
  areaGraph.resize = function () {

    areaGraph.setDimensions();

    // Update the range of the scale with new width/height
    xScale.range([0, width]);
    yScale.range([height, 0]);
    miniXScale.range([0, width]);
    miniYScale.range([miniHeight, 0]);

    // Update the axis and text with the new scale
    svg.select('.x.axis')
      .attr("transform", "translate(0," + height + ")");
    svg.select('.x.label')
      .attr("x", width);

    // Update the tick marks
    xAxis.ticks(Math.max(width/75, 2));
    yAxis.ticks(Math.max(height/50, 2));

    // Update the mini graph
    miniSvg.select('.x.axis')
      .attr("transform", "translate(0," + miniHeight + ")");
    miniSvg.select(".x.axis").call(miniXAxis);
    miniSvg.select(".y.axis").call(miniYAxis);
    miniSvg.select('.x.label')
      .attr("x", width);
    miniSvg.selectAll("path.elevation").attr("d", miniElevationLine);
    miniSvg.selectAll("path.slope").attr("d", miniSlopeLine);

    // areaGraph.draw();

    // Resize the clipping rectangle
    svg.select("#clip rect")
      .attr("width", width)
      .attr("y", -margin.top)
      .attr("height", height + margin.top + margin.bottom); // Leave some room at the top and bottom

    // Update the brush (which will redraw the svg graph
    brush.extent([[0, 0], [width, miniHeight]]);
    gBrush.call(brush);
    gBrush.call(brush.move, selection.map(miniXScale));
  };

  areaGraph.draw = function() {
    focus.select(".x.axis").call(xAxis);
    focus.select(".y.axis").call(yAxis);
    if (graphType === "slopeDistance") {
      focus.selectAll("path.slope").attr("d", slopeLine);
      focus.selectAll("circle").attr("cx", function(d) { return xScale(d.totalDistance - d.distance/2); });
      focus.selectAll("circle").attr("cy", function(d) { return  yScale(Math.floor(d.slope * 1000) / 10); });
    } else {
      focus.selectAll("path.elevation").attr("d", elevationLine);
      focus.selectAll("circle").attr("cx", function(d) { return xScale(d.totalDistance); });
      focus.selectAll("circle").attr("cy", function(d) { return yScale(d.ele); });
    }
    focus.selectAll("polygon").attr("points", function(datum) {
      return xScale(datum.totalDistance).toString() + "," + yScale(yScale.domain()[0])
        + " " + xScale(datum.totalDistance) + "," + yScale(datum.ele)
        + " " + xScale(datum.previous.totalDistance) + "," + yScale(datum.previous.ele)
        + " " + xScale(datum.previous.totalDistance) + "," + yScale(yScale.domain()[0]);
    });
    miniSvg.select(".x.axis").call(miniXAxis);
    miniSvg.select(".y.axis").call(miniYAxis);
    miniSvg.selectAll("path.elevation").attr("d", miniElevationLine);
    miniSvg.selectAll("path.slope").attr("d", miniSlopeLine);
  };

  areaGraph.drawSelectionHandles = function (selection) {
    var handleRange = selection.map(miniXScale);
    handle
      .attr("display", null)
      .attr("transform", function (d, i) {
        var handleOffset = 5;
        var rotate = 90;
        var xOffset = handleRange[i] + handleOffset;
        if (i === 0) {
          xOffset = handleRange[i] - handleOffset;
          rotate = rotate * -1;
        }
        return "translate(" + xOffset + "," + miniHeight / 2 + ") rotate(" + rotate + ")";
      });
  };

  areaGraph.brushed = function() {
    if (d3.event && d3.event.selection) {
      selection = d3.event.selection.map(miniXScale.invert);
    }
    areaGraph.drawSelectionHandles(selection);
    xScale.domain(selection);
    focus.select(".x.axis").call(xAxis);
    focus.selectAll("path.elevation").attr("d", elevationLine);
    focus.selectAll("path.slope").attr("d", slopeLine);
    if (graphType === "slopeDistance") {
      focus.selectAll("circle").attr("cx", function(d) {
        return xScale(d.totalDistance - d.distance/2);
      });
      focus.selectAll("circle").attr("cy", function(d) {
        return yScale(parseInt((d.slope * 1000).toString()) / 10);
      });
    } else {
      focus.selectAll("circle").attr("cx", function(d) { return xScale(d.totalDistance); });
      focus.selectAll("circle").attr("cy", function(d) {
        return yScale(d.ele);
      });
    }
    focus.selectAll("polygon").attr("points", function(datum) {
        return xScale(datum.totalDistance).toString() + "," + yScale(yScale.domain()[0])
          + " " + xScale(datum.totalDistance) + "," + yScale(datum.ele)
          + " " + xScale(datum.previous.totalDistance) + "," + yScale(datum.previous.ele)
          + " " + xScale(datum.previous.totalDistance) + "," + yScale(yScale.domain()[0]);
    });
  };

  // Returns the selected data range
  areaGraph.selected = function() {
    return(selection);
  };

  areaGraph.defaultYExtent = function() {
    return (graphType === "slopeDistance") ? [-20, 20] : [0, 1400];
  };

  areaGraph.showOriginal = function(show) {
    showOriginal = show;
    var opacity = show ? 1 : 0;
    focus.selectAll("circle.original").style("opacity", opacity)
      .on("mouseover", opacity ? areaGraph.tooltipDisplay : null);
    focus.selectAll("path.original").style("opacity", opacity);
    focus.selectAll("polygon.original").style("opacity", opacity);
  };

  areaGraph.reset = function() {
    lines = [];
    yAxisLabel.text(areaGraph.yAxisText());
    miniYLabel.text(areaGraph.yAxisText());
    focus.selectAll("circle").remove();
    focus.selectAll("polygon").remove();
    focus.selectAll("path.elevation").remove();
    miniSvg.selectAll("path.elevation").remove();
    focus.selectAll("path.slope").remove();
    miniSvg.selectAll("path.slope").remove();
    var yExtent = areaGraph.defaultYExtent();
    yScale.domain(yExtent);
    miniYScale.domain(yExtent);
    areaGraph.draw();
  };

  areaGraph.slopeColor = function(point) {
    return (colorScale(point.slope * 100));
  };

  areaGraph.createProfileLine = function(linePoints, lineType) {
    if (lineType !== "original") {
      focus.selectAll("polygon.original").remove();
    }
    miniLines.append("path")
      .attr("class", "elevation " + lineType)
      .datum(linePoints)
      .attr("d", miniElevationLine);
    focus.selectAll("polyPath")
      .data(linePoints.slice(1))
      .enter().append("polygon")
      .attr("class", "polygon "+ lineType)
      .attr("clip-path", "url(#clip)")
      .style("fill", areaGraph.slopeColor)
      .style("stroke", areaGraph.slopeColor)
      .attr("points", function(datum, index) {
          datum.previous = linePoints[index];
          return xScale(datum.totalDistance).toString() + "," + yScale(yScale.domain()[0])
            + " " + xScale(datum.totalDistance) + "," + yScale(datum.ele)
            + " " + xScale(linePoints[index].totalDistance) + "," + yScale(linePoints[index].ele)
            + " " + xScale(linePoints[index].totalDistance) + "," + yScale(yScale.domain()[0]);
      })
      .on("mouseover", areaGraph.tooltipDisplay)
      .on("mouseout", function() {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });
  };

  areaGraph.createSlopeLine = function(linePoints, lineType) {
    var points = linePoints;
    focus.append("path")
      .attr("class", "slope " + lineType)
      .datum(points)
      .attr("d", slopeLine)
      .attr("clip-path", "url(#clip)");
    miniLines.append("path")
      .attr("class", "slope " + lineType)
      .datum(points)
      .attr("d", miniSlopeLine);
    focus.selectAll("dot")
      .data(points.slice(1))  // No tooltip for first point
      .enter().append("circle")
      .attr("class", lineType)
      .attr("clip-path", "url(#clip)")
      .attr("r", 2)
      .attr("cx", function(d) {
        return xScale(d.totalDistance - d.distance/2);
      })
      .attr("cy", function(d) {
        return  yScale(parseInt((d.slope * 1000).toString()) / 10);
      })
      .on("mouseover", areaGraph.tooltipDisplay)
      .on("mouseout", function() {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });
  };

  areaGraph.createElevationLine = function(linePoints, lineType) {
    var points = linePoints;
    focus.append("path")
      .attr("class", "elevation " + lineType)
      .datum(points)
      .attr("d", elevationLine)
      .attr("clip-path", "url(#clip)");
    miniLines.append("path")
      .attr("class", "elevation " + lineType)
      .datum(points)
      .attr("d", miniElevationLine);
    focus.selectAll("dot")
      .data(points)
      .enter().append("circle")
      .attr("class", lineType)
      .attr("clip-path", "url(#clip)")
      .attr("r", 2)
      .attr("cx", function(d) {
        return xScale(d.totalDistance);
      })
      .attr("cy", function(d) {
        return yScale(d.ele);
      })
      .on("mouseover", areaGraph.tooltipDisplay)
      .on("mouseout", function() {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });
  };

  areaGraph.tooltipDisplay = function(point) {
    // Populate the tooltip
    var slope = (Math.round(point.slope * 1000) / 10).toString();
    var distance =  (Math.round(point.totalDistance / 10) / 100).toString();
    var elevation = parseInt(((point.ele * 100) / 100).toString());
    tooltip.transition()
      .duration(200)
      .style("opacity", .9);
    tooltip.html(
      "<div>Slope: " + slope +"%</div>" +
      "<div>Distance: " + distance + "km</div>" +
      "<div>Elevation: " + elevation + "m</div>");

    // Position the tooltip in the svg
    var bbox = graphElement.getBoundingClientRect();
    var offsetLeft = bbox.x + window.pageXOffset;
    var offsetTop = bbox.y + window.pageYOffset;
    var eltTooltip = d3.select(".tooltip").node();
    var width = eltTooltip.clientWidth;
    var xPos = offsetLeft - width/2 + margin.left;
    if (xPos + width > offsetLeft + dimensions.width) {
      xPos = offsetLeft + dimensions.width - width;
    }
    var yPos = offsetTop - eltTooltip.clientHeight - 12 + margin.top;
    if (this.tagName === "polygon") {
      xPos += xScale(point.totalDistance - point.distance/2);
      var y1 = yScale(point.ele);
      var y0 = yScale(point.previous.ele);
      yPos += Math.min(y0, y1);
    } else {
      xPos += parseInt(d3.select(this).attr("cx"));
      yPos += parseInt(d3.select(this).attr("cy"));
    }

    tooltip.style("left", xPos.toString() + "px");
    tooltip.style("top",  yPos.toString() + "px");
  };

  areaGraph.setLine = function(points, lineType, maintainSelection) {
    lines.push(points);
    var allPoints = [];
    var length = lines.length;
    for (var line = 0; line < length; line++) {
      allPoints = allPoints.concat(lines[line]);
    }
    if (lineType === "original") {
      var xExtents = d3.extent(allPoints, function(d) {
        return d.totalDistance;
      });
      miniXScale.domain(xExtents);
    } else {
      focus.selectAll("circle." + lineType).remove();
      focus.selectAll("path." + lineType).remove();
      miniSvg.selectAll("path." + lineType).remove();
      focus.selectAll("polygon").remove();
    }

    var yExtent = d3.extent(allPoints, function(d) {
      if (graphType === "slopeDistance") {
        return (parseInt((d.slope * 1000).toString()) / 10);
      } else {
        return d.ele;
      }
    });
    if (yExtent[0] === yExtent[1]) {
      if (yExtent[0] > 0) {
        yExtent = [0, yExtent[1]];
      } else  if (yExtent[0] < 0){
        yExtent = [yExtent[0], 0];
      } else {
        yExtent = areaGraph.defaultYExtent();
      }
    }
    yScale.domain(yExtent);
    miniYScale.domain(yExtent);

    if (!maintainSelection) {
      xScale.domain(xExtents);
      gBrush.call(brush.move, xScale.range());
    }

    if (graphType === "eleProfile")
      areaGraph.createProfileLine(points, lineType);
    else if (graphType === "slopeDistance")
      areaGraph.createSlopeLine(points, lineType);
    else
      areaGraph.createElevationLine(points, lineType);

    if (lineType === "original" && !showOriginal) {
      areaGraph.showOriginal(false);
    }
    areaGraph.draw();
  };

  areaGraph.legend = function() {

    var legendContainer = d3.select(".slope-legend");

    var width = parseInt(legendContainer.style("width"));
    var height =  parseInt(legendContainer.style("height"));

    var xLegend = d3.scaleLinear()
      .domain([-25, 25])
      .range([0, width]);

    var xAxisLegend = d3.axisBottom()
      .scale(xLegend)
      .tickSize(13)
      .tickValues(colorScale.domain());

    var svgLegend = d3.select(".slope-legend").append("svg")
      .attr("width", width)
      .attr("height", height);

    var g = svgLegend.append("g")
      .attr("class", "key");

    g.selectAll("rect")
      .data(colorScale.range().map(function(color) {
        var d = colorScale.invertExtent(color);
        if (d[0] === null || d[0] === undefined) d[0] = xLegend.domain()[0];
        if (d[1] === null || d[1] === undefined) d[1] = xLegend.domain()[1];
        return d;
      }))
      .enter().append("rect")
      .attr("height", 8)
      .attr("x", function(d) { return xLegend(d[0]); })
      .attr("width", function(d) {
        return xLegend(d[1]) - xLegend(d[0]);
      })
      .style("fill", function(d) { return colorScale(d[0]); });

    g.call(xAxisLegend);

    var bBox = svgLegend.select(".key").node().getBBox();
    g.attr("transform", "translate(0," + (bBox.height / 2) + ")");

  };

  // Sets of points for being able to reset the domain of the y scale
  var lines = [];

  var svg = d3.select("#chart").append("svg");
  var miniSvg = d3.select("#mini").append("svg");

  var dimensions = {width: 0, height: 0};
  var width = dimensions.width;
  var height = dimensions.height;
  var margin = {top: 20, right: 50, bottom: 30, left: 50};
  var miniDimensions = {width: 0, height: 0};
  var miniHeight = miniDimensions.height;

  areaGraph.setDimensions();

  var focus = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var gMiniSvg = miniSvg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var graphType = "elevationDistance";
  var showOriginal = true;

  var xScale = d3.scaleLinear()
    .range([0, width])
    .domain([0, 100000])
    .nice();
  var yScale = d3.scaleLinear()
    .range([height, 0])
    .domain(areaGraph.defaultYExtent())
    .nice();

  var xAxis = d3.axisBottom(xScale)
    .tickFormat(function(d) {
      return parseInt((d / 100).toString()) / 10;
    });
  focus.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .append("text")
    .attr("class", "x label")
    .style("text-anchor", "end")
    .attr("x", width)
    .attr("y", -6)
    .text("Distance (km)")
    .attr("fill", "#000");


  var yAxis = d3.axisLeft(yScale);
  var yAxisVis = focus.append("g")
    .attr("class", "y axis")
    .call(yAxis);
  var yAxisLabel = yAxisVis.append("text");
  yAxisLabel.attr("class", "y label")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text(areaGraph.yAxisText())
    .attr("fill", "#000");

  svg.append("defs")
    .append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("y", -margin.top)
    .attr("height", height + margin.top + margin.bottom); // Leave some room at the top and bottom

  focus.append("g")
    .attr("clip-path", "url(#clip)");

  var colorScale = d3.scaleThreshold()
    .domain([-20, -15, -10, -5, 0, 5, 10, 15, 20])
    .range(["#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"]);

  // Get the position of the graph so we can set the
  // the offset of the tooltip
  var graphElement = svg.node();

  var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  var elevationLine = d3.line()
    .x(function(d) {
      return xScale(d.totalDistance);
    })
    .y(function(d) {
      return yScale(d.ele);
    });
  var slopeLine = d3.line()
    .x(function(d) {
      return xScale(d.totalDistance);
    })
    .y(function(d) {
      return yScale(parseInt((d.slope * 1000).toString()) / 10);
    })
    .curve(d3.curveStepBefore);

  var miniXScale = d3.scaleLinear()
    .range([0, width])
    .domain([0, 100000])
    .nice();
  var miniYScale = d3.scaleLinear()
    .range([miniHeight, 0])
    .domain([0, 1400])
    .nice();
  var miniXAxis = d3.axisBottom()
    .scale(miniXScale)
    .tickFormat(function(d) {
      return parseInt((d / 100).toString()) / 10
    });
  var miniYAxis = d3.axisLeft()
    .scale(miniYScale);

  gMiniSvg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + miniHeight + ")")
    .call(miniXAxis)
    .append("text")
    .attr("class", "x label")
    .style("text-anchor", "end")
    .attr("x", width)
    .attr("y", -6)
    .text("Distance (km)")
    .attr("fill", "#000");
  var miniYAxisVis = gMiniSvg.append("g")
    .attr("class", "y axis")
    .call(miniYAxis);
  var miniYLabel = miniYAxisVis.append("text")
    .attr("class", "y label")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text(areaGraph.yAxisText())
    .attr("fill", "#000");

  var miniElevationLine = d3.line()
    .x(function(d) {
      return miniXScale(d.totalDistance);
    })
    .y(function(d) {
      return miniYScale(d.ele);
    });
  var miniSlopeLine = d3.line()
    .x(function(d) {
      return miniXScale(d.totalDistance);
    })
    .y(function(d) {
        return miniYScale(parseInt((d.slope * 1000).toString()) / 10);
    })
    .curve(d3.curveStepBefore);

  var selection  = miniXScale.domain();
  var brush = d3.brushX()
    .extent([[0, 0], [width, miniHeight]])
    .on("brush", areaGraph.brushed);

  var triangleShape = d3.symbol()
    .type(d3.symbolTriangle)
    .size(200);

  // Add a group to keep the lines under the brush
  var miniLines = gMiniSvg.append("g").attr("id", "lines");

  var gBrush = gMiniSvg.append("g")
    .attr("class", "brush")
    .call(brush);

  var handle = gBrush.selectAll(".handle--custom")
    .data([{type: "w"}, {type: "e"}])
    .enter().append("path")
    .attr("class", "handle--custom")
    .attr("fill", "#666")
    .attr("fill-opacity", 0.8)
    .attr("stroke", "#000")
    .attr("stroke-width", 1.5)
    .attr("cursor", "ew-resize")
    .attr("d", triangleShape);

  gBrush.call(brush.move, xScale.range());

  areaGraph.legend();

  // Call the resize function whenever a resize event occurs
  d3.select(window).on('resize', function() {
    // If the chart is hidden, don't bother to redraw it
    if (d3.select("#chart").node().clientWidth !== 0) {
      areaGraph.resize();
    }
  });
  return areaGraph;

};