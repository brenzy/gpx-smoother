AreaGraph = function() {

  var areaGraph = {};

  areaGraph.graphType = function(value) {
    graphType = value;
  };

  areaGraph.yAxisText = function() {
    return (graphType == "slopeDistance") ? "Slope (%)" : "Elevation (m)";
  };

  areaGraph.draw = function() {
    focus.select(".x.axis").call(xAxis);
    focus.select(".y.axis").call(yAxis);
    if (graphType=="slopeDistance") {
      focus.selectAll("path.slope").attr("d", slopeLine);
      focus.selectAll("circle").attr("cx", function(d) { return xScale(d.totalDistance - d.distance/2); });
      focus.selectAll("circle").attr("cy", function(d) { return  yScale(parseInt(d.slope * 1000) / 10); });
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

  areaGraph.brushed = function() {
    var xDomain = miniXScale.domain();
    var brushExtent = brush.extent();
    xScale.domain(brush.empty() ?xDomain : [xDomain[1] * brushExtent[0], xDomain[1] * brushExtent[1]]);
    focus.select(".x.axis").call(xAxis);
    focus.selectAll("path.elevation").attr("d", elevationLine);
    focus.selectAll("path.slope").attr("d", slopeLine);
    if (graphType == "slopeDistance") {
      focus.selectAll("circle").attr("cx", function(d) {
        return xScale(d.totalDistance - d.distance/2);
      });
      focus.selectAll("circle").attr("cy", function(d) {
        return yScale(parseInt(d.slope * 1000) / 10);
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

  areaGraph.selected = function() {
    return(brush.extent());
  };

  areaGraph.defaultYExtent = function() {
    return (graphType == "slopeDistance") ? [-20, 20] : [0, 1400];
  };

  areaGraph.showOriginal = function(show) {
    showOriginal = show;
    var opacity = show ? 1 : 0;
    focus.selectAll("circle.original").style("opacity", opacity)
      .on("mouseover", opacity ? areaGraph.tooltipDisplay : null);
    focus.selectAll("path.original").style("opacity", opacity);
    focus.selectAll("polygon.original").style("opacity", opacity);
  };

  areaGraph.reset = function(maintainSelection) {
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
    if (!maintainSelection) {
      xScale.domain(miniXScale.domain());
      brush.extent([0,1]);
      brushg.call(brush);
    }
    areaGraph.draw();
  };

  areaGraph.slopeColor = function(point) {
    return (colorScale(point.slope * 100));
  };

  areaGraph.createProfileLine = function(linePoints, lineType) {
    if (lineType != "original") {
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
        return  yScale(parseInt(d.slope * 1000) / 10);
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
    var offsetLeft = graphElement.offsetLeft;
    var offsetTop = graphElement.offsetTop;
    tooltip.transition()
      .duration(200)
      .style("opacity", .9);
    tooltip.html(
      "<div>Slope: " + (parseInt(point.slope * 1000) / 10) +"%</div>" +
      "<div>Distance: " + (parseInt(point.totalDistance / 10) / 100) + "km</div>" +
      "<div>Elevation: " + (parseInt(point.ele * 100) / 100) + "m</div>");
    var eltTooltip = $(tooltip[0]);
    var width = eltTooltip.outerWidth();
    var xPos = offsetLeft - width/2 + margin.left;
    if (xPos + width > offsetLeft + dimensions.width) {
      xPos = offsetLeft + dimensions.width - width;
    }
    var yPos = offsetTop - eltTooltip.outerHeight() - 12 + margin.top;
    if (this.tagName== "polygon") {
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

  areaGraph.setLine = function(points, lineType) {
    lines.push(points);
    var allPoints = [];
    var length = lines.length;
    for (var line = 0; line < length; line++) {
      allPoints = allPoints.concat(lines[line]);
    }
    if (lineType == "original") {
      var xExtents = d3.extent(allPoints, function(d) {
        return d.totalDistance;
      });
      xScale.domain(xExtents);
      miniXScale.domain(xExtents);
      areaGraph.brushed();
    } else {
      focus.selectAll("circle." + lineType).remove();
      focus.selectAll("path." + lineType).remove();
      miniSvg.selectAll("path." + lineType).remove();
      focus.selectAll("polygon").remove();
    }
    var yExtent = d3.extent(allPoints, function(d) {
      if (graphType == "slopeDistance") {
        return (parseInt(d.slope * 1000) / 10);
      } else {
        return d.ele;
      }
    });
    if (yExtent[0] == yExtent[1]) {
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

    if (graphType == "eleProfile")
      areaGraph.createProfileLine(points, lineType);
    else if (graphType == "slopeDistance")
      areaGraph.createSlopeLine(points, lineType);
    else
      areaGraph.createElevationLine(points, lineType);

    if (lineType == "original" && !showOriginal) {
      areaGraph.showOriginal(false);
    }
    areaGraph.draw();

  };

  areaGraph.legend = function() {

    var width = 200;
    var height = 30;

    var x = d3.scale.linear()
      .domain([-25, 25])
      .range([0, width]);

    var xAxisLegend= d3.svg.axis()
      .scale(x)
      .orient("bottom")
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
        if (d[0] == null) d[0] = x.domain()[0];
        if (d[1] == null) d[1] = x.domain()[1];
        return d;
      }))
      .enter().append("rect")
      .attr("height", 8)
      .attr("x", function(d) { return x(d[0]); })
      .attr("width", function(d) { return x(d[1]) - x(d[0]); })
      .style("fill", function(d) { return colorScale(d[0]); });

    g.call(xAxisLegend);
  };

  // Sets of points for being able to reset the domain of the y scale
  var lines = [];

  var dimensions = {width: 960, height: 500};
  var margin = {top: 20, right: 50, bottom: 30, left: 50};
  var width = dimensions.width - margin.left - margin.right;
  var height = dimensions.height - margin.top - margin.bottom;

  var graphType = "elevationDistance";
  var showOriginal = true;

  var xScale = d3.scale.linear()
    .range([0, width])
    .domain([0, 100000]);
  var yScale = d3.scale.linear()
    .range([height, 0])
    .domain(areaGraph.defaultYExtent());

  var xAxis = d3.svg.axis()
    .scale(xScale)
    .tickFormat(function(d) {
      return parseInt(d / 100) / 10;
    })
    .orient("bottom");
  var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient("left");

  var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  var focus = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  focus.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .append("text")
    .attr("class", "x label")
    .style("text-anchor", "end")
    .attr("x", width)
    .attr("y", -6)
    .text("Distance (km)");

  var yAxisVis = focus.append("g");
  yAxisVis.attr("class", "y axis")
    .call(yAxis);
  var yAxisLabel = yAxisVis.append("text");
  yAxisLabel.attr("class", "y label")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text(areaGraph.yAxisText());

  var clip = svg.append("defs")
    .append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("y", -margin.top)
    .attr("height", height + margin.top + margin.bottom); // Leave some room at the top and bottom

  focus.append("g")
    .attr("clip-path", "url(#clip)");

  var colorScale = d3.scale.threshold()
    .domain([-20, -15, -10, -5, 0, 5, 10, 15, 20])
    .range(["#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"]);

  // Get the position of the graph so we can set the
  // the offset of the tooltip
  var graphElement = $("svg")[0];

  var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  var elevationLine = d3.svg.line()
    .x(function(d) {
      return xScale(d.totalDistance);
    })
    .y(function(d) {
      return yScale(d.ele);
    });
  var slopeLine = d3.svg.line()
    .x(function(d) {
      return xScale(d.totalDistance);
    })
    .y(function(d) {
      return yScale(parseInt(d.slope * 1000) / 10);
    })
    .interpolate("step-before");

  var miniDimensions = {width: dimensions.width, height: 200};
  var miniHeight = miniDimensions.height - margin.top - margin.bottom;

  var miniXScale = d3.scale.linear()
    .range([0, width])
    .domain([0, 100000]);
  var miniYScale = d3.scale.linear()
    .range([miniHeight, 0])
    .domain([0, 1400]);
  var miniXAxis = d3.svg.axis()
    .scale(miniXScale)
    .tickFormat(function(d) {
      return parseInt(d / 100) / 10
    })
    .orient("bottom");
  var miniYAxis = d3.svg.axis()
    .scale(miniYScale)
    .orient("left");

  var miniSvg = d3.select("#mini").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", miniHeight + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  miniSvg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + miniHeight + ")")
    .call(miniXAxis)
    .append("text")
    .attr("class", "x label")
    .style("text-anchor", "end")
    .attr("x", width)
    .attr("y", -6)
    .text("Distance (km)");
  var miniYAxisVis = miniSvg.append("g")
    .attr("class", "y axis")
    .call(miniYAxis);
  var miniYLabel = miniYAxisVis.append("text")
    .attr("class", "y label")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text(areaGraph.yAxisText());

  var miniElevationLine = d3.svg.line()
    .x(function(d) {
      return miniXScale(d.totalDistance);
    })
    .y(function(d) {
      return miniYScale(d.ele);
    });
  var miniSlopeLine = d3.svg.line()
    .x(function(d) {
      return miniXScale(d.totalDistance);
    })
    .y(function(d) {
        return miniYScale((parseInt(d.slope * 1000) / 10));
    })
    .interpolate("step-before");

   var xBrushScale = d3.scale.linear()
    .range([0, width]);

  var brush = d3.svg.brush()
    .x(xBrushScale)
    .on("brush", areaGraph.brushed)
    .extent([0, 1]);

  var handle = d3.svg.symbol()
    .type("triangle-up")
    .size(200);

  // Add a group to keep the lines under the brush
  var miniLines = miniSvg.append("g").attr("id", "lines");

  var brushg = miniSvg.append("g")
    .attr("class", "brush")
    .call(brush);

  brushg.selectAll(".resize").append("path")
    .attr("d", handle)
    .attr("transform", function(d) {
      var left = 10;
      var rotate = 90;
      if (d == "w") {
        left = left * -1;
        rotate = rotate * -1;
      }
      return "translate(" + left + "," + miniHeight / 2 + ") rotate(" + rotate + ")";
    });

  brushg.selectAll("rect")
    .attr("height", miniHeight);

  areaGraph.legend();

  return areaGraph;

};