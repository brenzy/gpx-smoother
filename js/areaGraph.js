AreaGraph = function() {

  var areaGraph = {};

  areaGraph.graphType = function(value) {
    graphType = value;
  };

  areaGraph.yTickFormat = function(d) {
    if (graphType == "slopeDistance") {
      return parseInt(d * 1000) / 10;
    } else {
      return parseInt(d);
    }
  };

  areaGraph.yAxisText = function() {
    return (graphType == "slopeDistance") ? "Slope (%)" : "Elevation (m)";
  };

  areaGraph.draw = function() {
    focus.select(".x.axis").call(xAxis);
    focus.select(".y.axis").call(yAxis);
    focus.selectAll("path.slope").attr("d", line);
    focus.selectAll("circle").attr("cx", function(d) { return xScale(d.totalDistance); });
    focus.selectAll("circle").attr("cy", function(d) {
      if (graphType == "slopeDistance") {
        return yScale(d.slope)
      } else {
        return yScale(d.ele);
      }
    });

    miniSvg.select(".x.axis").call(miniXAxis);
    miniSvg.select(".y.axis").call(miniYAxis);
    miniSvg.selectAll("path.slope").attr("d", miniLine);
  };

  areaGraph.brushed = function() {
    var xDomain = miniXScale.domain();
    var brushExtent = brush.extent();
    xScale.domain(brush.empty() ?xDomain : [xDomain[1] * brushExtent[0], xDomain[1] * brushExtent[1]]);
    focus.select(".x.axis").call(xAxis);
    focus.selectAll("path.slope").attr("d", line);
    focus.selectAll("circle").attr("cx", function(d) { return xScale(d.totalDistance); });
    focus.selectAll("circle").attr("cy", function(d) {
      if (graphType == "slopeDistance") {
        return yScale(d.slope);
      } else {
        return yScale(d.ele);
      }
    });
  };

  areaGraph.selected = function() {
    return(brush.extent());
  };

  areaGraph.defaultYExtent = function() {
    return (graphType == "slopeDistance") ? [-.1, .1] : [0, 1400];
  };

  areaGraph.showOriginal = function(show) {
    showOriginal = show;
    var opacity = show ? 1 : 0;
    focus.selectAll("circle.original").style("opacity", opacity)
      .on("mouseover", opacity ? areaGraph.tooltipDisplay : null);
    focus.selectAll("path.slope.original").style("opacity", opacity);
  };

  areaGraph.reset = function(maintainSelection) {
    lines = [];
    yAxisLabel.text(areaGraph.yAxisText());
    miniYLabel.text(areaGraph.yAxisText());
    focus.selectAll("circle").remove();
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

  areaGraph.createLine = function(linePoints, lineType) {
    var points = linePoints;
    if (graphType == "slopeDistance" && linePoints.length > 1) {
      // The first point will always be 0 for slope, and
      // this isn't significant
      points = linePoints.slice(1);
    }
    focus.append("path")
      .attr("class", "slope " + lineType)
      .datum(points)
      .attr("d", line)
      .attr("clip-path", "url(#clip)");

    miniLines.append("path")
      .attr("class", "slope " + lineType)
      .datum(points)
      .attr("d", line);

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
        if (graphType == "slopeDistance") {
          return yScale(d.slope);
        } else {
          return yScale(d.ele);
        }
      })
      .on("mouseover", areaGraph.tooltipDisplay)
      .on("mouseout", function() {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });

      if (lineType == "original" && !showOriginal) {
        areaGraph.showOriginal(false);
      }

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
      xpos = offsetLeft + dimensions.width - width;
    }
    var yPos = offsetTop - eltTooltip.outerHeight() - 5 + margin.top;
    tooltip.style("left", (parseInt(d3.select(this).attr("cx")) + xPos) + "px");
    tooltip.style("top", (parseInt(d3.select(this).attr("cy")) + yPos) + "px");
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
      //brush.extent([0, 1]);
    } else {
      focus.selectAll("circle." + lineType).remove();
      focus.selectAll("path." + lineType).remove();
      miniSvg.selectAll("path." + lineType).remove();
    }
    var yExtent = d3.extent(allPoints, function(d) {
      if (graphType == "slopeDistance") {
        return d.slope;
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
    areaGraph.createLine(points, lineType);
    areaGraph.draw();
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
      return parseInt(d / 100) / 10
    })
    .orient("bottom");
  var yAxis = d3.svg.axis()
    .scale(yScale)
    .tickFormat(areaGraph.yTickFormat)
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

  // Get the position of the graph so we can set the
  // the offset of the tooltip
  var graphElement = $("svg")[0];

  var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  var line = d3.svg.line()
    .x(function(d) {
      return xScale(d.totalDistance);
    })
    .y(function(d) {
      if (graphType == "slopeDistance") {
        return yScale(d.slope);
      } else {
        return yScale(d.ele);
      }
    });

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
    .tickFormat(areaGraph.yTickFormat)
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

  var miniLine = d3.svg.line()
    .x(function(d) {
      return miniXScale(d.totalDistance);
    })
    .y(function(d) {
      if (graphType == "slopeDistance") {
        return miniYScale(d.slope);
      } else {
        return miniYScale(d.ele);
      }
    });

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

  return areaGraph;

};