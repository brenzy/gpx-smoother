SlopeGraph = function() {

  var slopeGraph = {};

  slopeGraph.draw = function() {
    focus.select(".x.axis").call(xAxis);
    focus.select(".y.axis").call(yAxis);
    focus.selectAll("path.slope").attr("d", line);
    focus.selectAll("circle").attr("cx", function(d) { return xScale(d.totalDistance); });
    focus.selectAll("circle").attr("cy", function(d) { return yScale(d.ele); });
  };

  slopeGraph.brushed = function() {
    var xDomain = miniXScale.domain();
    var brushExtent = brush.extent();
    xScale.domain(brush.empty() ?xDomain : [xDomain[1] * brushExtent[0], xDomain[1] * brushExtent[1]]);
    focus.select(".x.axis").call(xAxis);
    focus.selectAll("path.slope").attr("d", line);
    focus.selectAll("circle").attr("cx", function(d) { return xScale(d.totalDistance); });
    focus.selectAll("circle").attr("cy", function(d) { return yScale(d.ele); });
  };

  slopeGraph.selected = function() {
    return(brush.extent());
  };

  slopeGraph.reset = function() {
    lines = [];
    focus.selectAll("circle").remove();
    focus.selectAll("path.slope").remove();
    xScale.domain(miniXScale.domain());
    brush.extent([0,1]);
    brushg.call(brush);
    slopeGraph.draw();
  };

  slopeGraph.createLine = function(points, lineType) {
    focus.append("path")
      .attr("class", "slope " + lineType)
      .datum(points)
      .attr("d", line)
      .attr("clip-path", "url(#clip)");

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
      .on("mouseover", slopeGraph.tooltipDisplay)
      .on("mouseout", function() {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });
  };

  slopeGraph.tooltipDisplay = function(point) {
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

  slopeGraph.setLine = function(points, lineType) {
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
      brush.extent([0, 1]);
    } else {
      focus.selectAll("circle." + lineType).remove();
      focus.selectAll("path." + lineType).remove();
    }
    var yExtent = d3.extent(allPoints, function(d) {
      return d.ele;
    });
    if (yExtent[0] == yExtent[1]) {
      if (yExtent[0] > 0) {
        yExtent = [0, yExtent[1]];
      } else  if (yExtent[0] < 0){
        yExtent = [yExtent[0], 0];
      } else {
        yExtent = [0, 1400];
      }
    }
    yScale.domain(yExtent);
    slopeGraph.createLine(points, lineType);
    slopeGraph.draw();
  };

  // Sets of points for being able to reset the domain of the y scale
  var lines = [];

  var dimensions = {width: 960, height: 500};
  var margin = {top: 20, right: 50, bottom: 30, left: 50};
  var width = dimensions.width - margin.left - margin.right;
  var height = dimensions.height - margin.top - margin.bottom;

  var xScale = d3.scale.linear()
    .range([0, width])
    .domain([0, 100000]);
  var yScale = d3.scale.linear()
    .range([height, 0])
    .domain([0, 1400]);
  var xAxis = d3.svg.axis()
    .scale(xScale)
    .tickFormat(function(d) {
      return parseInt(d / 100) / 10
    })
    .orient("bottom");
  var yAxis = d3.svg.axis()
    .scale(yScale)
    .tickFormat(function(d) {
      return parseInt(d)
    })
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

  focus.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("class", "y label")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Elevation (m)");

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
      return yScale(d.ele);
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
    .tickFormat(function(d) {
      return parseInt(d)
    })
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
  miniSvg.append("g")
    .attr("class", "y axis")
    .call(miniYAxis)
    .append("text")
    .attr("class", "y label")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Elevation (m)");

  var miniLine = d3.svg.line()
    .x(function(d) {
      return miniXScale(d.totalDistance);
    })
    .y(function(d) {
      return miniYScale(d.ele);
    });

  var xBrushScale = d3.scale.linear()
    .range([0, width]);

  var brush = d3.svg.brush()
    .x(xBrushScale)
    .on("brush", slopeGraph.brushed)
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

  //slopeGraph.draw();

  return slopeGraph;

};