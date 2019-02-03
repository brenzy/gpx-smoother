AreaGraph = function() {

  var areaGraph = {};

  areaGraph.graphType = function(value) {
    graphType = value;
  };

  areaGraph.yAxisText = function() {
    return (graphType == "slopeDistance") ? "Slope (%)" : "Elevation (m)";
  };

  areaGraph.draw = function() {
    focus.select(".x.axis").call(xAxis.scale(xTransformScale));
    focus.select(".y.axis").call(yAxis.scale(yTransformScale));
    if (graphType=="slopeDistance") {
      focus.selectAll("path.slope").attr("d", slopeLine);
      focus.selectAll("circle").attr("cx", function(d) { return xTransformScale(d.totalDistance - d.distance/2); });
      focus.selectAll("circle").attr("cy", function(d) { return  yTransformScale(parseInt(d.slope * 1000) / 10); });
    } else {
      focus.selectAll("path.elevation").attr("d", elevationLine);
      focus.selectAll("circle").attr("cx", function(d) { return xTransformScale(d.totalDistance); });
      focus.selectAll("circle").attr("cy", function(d) { return yTransformScale(d.ele); });
    }
    focus.selectAll("polygon").attr("points", function(datum) {
      return xTransformScale(datum.totalDistance).toString() + "," + yTransformScale(yTransformScale.domain()[0])
        + " " + xTransformScale(datum.totalDistance) + "," + yTransformScale(datum.ele)
        + " " + xTransformScale(datum.previous.totalDistance) + "," + yTransformScale(datum.previous.ele)
        + " " + xTransformScale(datum.previous.totalDistance) + "," + yTransformScale(yTransformScale.domain()[0]);
    });
  };

  areaGraph.zoomed = function() {
    xTransformScale = d3.event.transform.rescaleX(xScale);
    yTransformScale = d3.event.transform.rescaleY(yScale);
    areaGraph.draw();
  };

  areaGraph.resetZoom = function() {
    xTransformScale = xScale;
    yTransformScale = yScale;
    areaGraph.draw();
  };

  areaGraph.selected = function() {
    return([0, 1]);
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
    focus.selectAll("circle").remove();
    focus.selectAll("polygon").remove();
    focus.selectAll("path.elevation").remove();
    focus.selectAll("path.slope").remove();
    var yExtent = areaGraph.defaultYExtent();
    yScale.domain(yExtent);
    xTransformScale = xScale;
    yTransformScale = yScale;
    areaGraph.draw();
  };

  areaGraph.slopeColor = function(point) {
    return (colorScale(point.slope * 100));
  };

  areaGraph.createProfileLine = function(linePoints, lineType) {
    focus.select(".x.axis").call(xAxis);
    focus.select(".y.axis").call(yAxis);


    if (lineType != "original") {
      focus.selectAll("polygon.original").remove();
    }
    focus.selectAll("polyPath")
      .data(linePoints.slice(1))
      .enter().append("polygon")
      .attr("class", "polygon "+ lineType)
      .attr("clip-path", "url(#clip)")
      .style("fill", areaGraph.slopeColor)
      .style("stroke", areaGraph.slopeColor)
      .attr("points", function(datum, index) {
          datum.previous = linePoints[index];
          return xTransformScale(datum.totalDistance).toString() + "," + yTransformScale(yTransformScale.domain()[0])
            + " " + xTransformScale(datum.totalDistance) + "," + yTransformScale(datum.ele)
            + " " + xTransformScale(linePoints[index].totalDistance) + "," + yTransformScale(linePoints[index].ele)
            + " " + xTransformScale(linePoints[index].totalDistance) + "," + yTransformScale(yTransformScale.domain()[0]);
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
    focus.selectAll("dot")
      .data(points.slice(1))  // No tooltip for first point
      .enter().append("circle")
      .attr("class", lineType)
      .attr("clip-path", "url(#clip)")
      .attr("r", 2)
      .attr("cx", function(d) {
        return xTransformScale(d.totalDistance - d.distance/2);
      })
      .attr("cy", function(d) {
        return  yTransformScale(parseInt(d.slope * 1000) / 10);
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
    focus.selectAll("dot")
      .data(points)
      .enter().append("circle")
      .attr("class", lineType)
      .attr("clip-path", "url(#clip)")
      .attr("r", 2)
      .attr("cx", function(d) {
        return xTransformScale(d.totalDistance);
      })
      .attr("cy", function(d) {
        return yTransformScale(d.ele);
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
      xPos += xTransformScale(point.totalDistance - point.distance/2);
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
      xTransformScale.domain(xExtents);
    } else {
      focus.selectAll("circle." + lineType).remove();
      focus.selectAll("path." + lineType).remove();
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

    var xLegend = d3.scaleLinear()
      .domain([-25, 25])
      .range([0, width]);

    var xAxisLegend= d3.axisBottom()
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
        if (d[0] == null) d[0] = xLegend.domain()[0];
        if (d[1] == null) d[1] = xLegend.domain()[1];
        return d;
      }))
      .enter().append("rect")
      .attr("height", 8)
      .attr("x", function(d) { return xLegend(d[0]); })
      .attr("width", function(d) { return xLegend(d[1]) - xLegend(d[0]); })
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

  var xScale = d3.scaleLinear()
    .range([0, width])
    .domain([0, 100000]);
  var yScale = d3.scaleLinear()
    .range([height, 0])
    .domain(areaGraph.defaultYExtent());

  var xTransformScale = xScale;
  var yTransformScale = yScale;

  var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  var focus = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var xAxis = d3.axisBottom(xScale)
    .tickFormat(function(d) {
      return parseInt(d / 100) / 10;
    });

  var xAxisVis = focus.append('g')
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .append("text")
    .attr("class", "x label")
    .style("text-anchor", "end")
    .attr("x", width)
    .attr("y", -6)
    .text("Distance (km)");

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

  var colorScale = d3.scaleThreshold()
    .domain([-20, -15, -10, -5, 0, 5, 10, 15, 20])
    .range(["#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"]);

  // Get the position of the graph so we can set the
  // the offset of the tooltip
  var graphElement = $("svg")[0];

  var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  var elevationLine = d3.line()
    .x(function(d) {
      return xTransformScale(d.totalDistance);
    })
    .y(function(d) {
      return yTransformScale(d.ele);
    });

  var slopeLine = d3.line()
    .x(function(d) {
      return xTransformScale(d.totalDistance);
    })
    .y(function(d) {
      return yTransformScale(parseInt(d.slope * 1000) / 10);
    })
    .curve(d3.curveStepBefore);

  var zoom = d3.zoom()
    .scaleExtent([1, 100])
    .translateExtent([[-100, -100], [width + 90, height + 100]])
    .on("zoom", areaGraph.zoomed);

  svg.call(zoom);

  areaGraph.legend();

  return areaGraph;

};