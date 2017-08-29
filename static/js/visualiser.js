function geo_heatmap(args) {
  var h = 450,
      w = 750;
  // set-up unit projection and path
  var projection = d3.geo.mercator()
      .scale(1)
      .translate([0, 0]);
  var path = d3.geo.path()
      .projection(projection);
  // set-up svg canvas
  var svg = d3.select(args.element).append("svg")
      .attr("height", h)
      .attr("width", w);

  d3.json("countries.geo.json", function(error, countrydata) {
    d3.json(args.data, function(error, data) {
      data = group_by_category(data, "country", ["vibes"]);

      var world = countrydata.features;
      // color scale for data, starting from 0, ending at max
      var color = d3.scale.linear()
                    .range(["white", "blue"])
                    .domain([0, +d3.max(data)['vibes']])

      // calculate bounds, scale and transform 
      // see http://stackoverflow.com/questions/14492284/center-a-map-in-d3-given-a-geojson-object
      var b = path.bounds(countrydata),
          s = .95 / Math.max((b[1][0] - b[0][0]) / w, (b[1][1] - b[0][1]) / h),
          t = [(w - s * (b[1][0] + b[0][0])) / 2.5, (h - s * (b[1][1] + b[0][1])) / 1.3];
      projection.scale(s+30)
          .translate(t);
      svg.selectAll("path")
          .data(world).enter()
          .append("path")
          .style("fill", getColor)
          .style("stroke", "grey")
          .style("stroke-width", "1px")
          .attr("d", path)
          .on("mouseover", handleMouseOver)
          .on("mouseout", handleMouseOut);

      // color in countries
      function getColor(countrydata) {
        var value = 0;
        data.forEach(function(d, i) {
          if(countrydata.properties.name == d.category) {
            value = +d.vibes;
            return;
          };
        });
        console.log(value);
        return color(value);
      }

      function handleMouseOver(d, i) {
          d3.select(this).style("stroke-width", "1.8px");
      }

      function handleMouseOut(d, i) {
          d3.select(this).style("stroke-width", "1px");
      }
    });
  });
}

function get_metric(data,  metric) {
  if (metric == "vibes") {
    return data.length;
  } else if (metric == "ivibes") {
    var ivibes = d3.set();
    data.forEach(function(d) {
      ivibes.add(d['ivib_id']);
    });
    return ivibes.values().length;
  };
}

function vibe_services_table(args) {
  d3.json(args.data, function(data) { // loading data from server
    var dates = default_date_bounds();
    data = date_range(data, dates.start, dates.end);
    data = group_by_category(data, "vib_category", ["vibes", "ivibes", "vibes_per_ivibe"]);
    // draw table body with rows
    var headers = ["VIBe Category", "VIBes", "iVIBes","Average VIBes per iVIBe"];
    var columns = ["category", "vibes", "ivibes", "vibes_per_ivibe"];
    
    var colors = {category: args.background,
                  vibes: "rgba(45, 80, 108,",
                  ivibes: "rgba(56, 113, 58,",
                  vibes_per_ivibe: "rgba(165, 119, 12,"}

    var table = tabulate(data, args.element, headers, columns);

    columns.forEach(function(c) {
      var column = table.selectAll("." + c);
      var values = [];
      column[0].forEach(function(d) {
        values.push(d.__data__.value);
      });
      
      var alpha = d3.scale.linear()
                    .range([0, 1])
                    .domain([0, d3.max(values)]);
      column.style("background-color", function(d) {
        return (colors[c] + alpha(d.value) + ")"); 
      });
    });
  });
} 

function scorecard(args) {
  return d3.json(args.data, function(data) {
    if (args.start_date == null | args.end_date) {
      var dates = default_date_bounds();
      var start_date = dates.start,
          end_date = dates.end;
    } else {
      var start_date = args.start_date,
          end_date = args.end_date;
    };
    
    var past_start_date = new Date(start_date - (end_date - start_date));
    var current_data = date_range(data, start_date, end_date),
        past_data = date_range(data, past_start_date, start_date);

    if (args.metric == "vibes_per_ivibe") {
      var metric = Math.round(get_metric(current_data, "vibes")/get_metric(current_data, "ivibes")*100)/100;
      var past_metric = Math.round(get_metric(past_data, "vibes")/get_metric(past_data, "ivibes")*100)/100;
      var title = "Average VIBes per iVIBe";
    } else {
      var metric = get_metric(current_data, args.metric);
      var past_metric = get_metric(past_data, args.metric);
      var title = "VIBes";
      if (args.metric == "ivibes") {title = "iVIBes"};
    }

    var diff = (metric - past_metric)/past_metric;
    var diff_class = "diff" + args.metric
    var return_string = "<span class='white-text'>" + title + "</span>" + "<h2 class='white-text'>" + d3.format(".2s")(metric)
                        + "</h2>" + "<span class='" + diff_class + "'>" + d3.format("+.1%")(diff) + "</span>";
      
    var scorecard = d3.select(args.element)
                      .append("div")
                      .attr("class", "scorecard");

    scorecard.html(return_string)
             .style("padding", "10px 30px 10px 10px")
             .style("display", "inline-block")
             .style("border-radius", "5px")
             .style("background-color", "rgba(70, 92, 110, 0.8)")
             .style("font-family", "sans-serif");

    if (scorecard.node().getBoundingClientRect().width < 90) {
      scorecard.style("width", "90px");
    };

    d3.selectAll(".white-text")
      .style("color", "white")
      .style("margin", "0")
      .style("padding", "0");


    if (diff > 0) {
      d3.select("." + diff_class)
        .style("color", "palegreen");
        
    } else {
      d3.select("." + diff_class)
        .style("color", "salmon");
    };

    });
}

function tabulate(data, element, headers, columns) {
    var table = d3.select(element).append("table")
            .style("border-collapse", "collapse") 
            .style("border", "2px black solid"),
        thead = table.append("thead"),
        tbody = table.append("tbody");

    // append the header row
    thead.append("tr")
        .selectAll("th")
        .data(headers)
        .enter()
        .append("th")
            .text(function(column) { return column; });

    // create a row for each object in the data
    var rows = tbody.selectAll("tr")
        .data(data)
        .enter()
        .append("tr");

    // create a cell in each row for each column
    var cells = rows.selectAll("td")
        .data(function(row) {
            return columns.map(function(column) {
                return {column: column, value: row[column]};
            });
        })
        .enter()
        .append("td")
            .text(function(d) { return d.value; })
            .attr("class", function(d) { return d.column });
    
    // add cell borders
    d3.selectAll("th")
      .style("padding", "1px 4px")
      .style("border", "1px black solid");

    d3.selectAll("td")
      .style("padding", "1px 4px")
      .style("border", "1px black solid");

    return table;
}

function default_date_bounds() {
  var end = new Date();

  var year = end.getFullYear();
  var month = end.getMonth();
  var day = end.getDate();

  if (month == 0) {
    month = 11;
    year = year - 1
  }

  var start = new Date(year + "-" + month + "-" + day)

  return {
    start: start,
    end: end
  };
}

function date_range(data, start, end) {
  start = new Date(start);
  end = new Date(end);

  data = data.filter(function(d) {
    d['vib_event_date'] = new Date(d['vib_event_date']);
    return d['vib_event_date'] > start && d['vib_event_date'] < end;
  });

  return data;
}

function group_by_category(data, category, metrics) {
  var nested =  d3.nest().key(function(d) {return d[category];})
                  .rollup(function(v) {
                    var return_dict = {};

                    if (metrics.indexOf("vibes") != -1) {
                      return_dict.vibes = v.length;
                    };

                    if (metrics.indexOf("ivibes") != -1) {
                      var ivibes = d3.set();
                      v.forEach(function(d) {
                        ivibes.add(d['ivib_id']);
                      });
                      return_dict.ivibes = ivibes.values().length;
                    };

                    return return_dict;
                  })
                  .entries(data)

  var grouped = [];
  nested.forEach(function(d) {
    if (metrics.indexOf("vibes_per_ivibe") != -1) {
      grouped.push({
        category: d.key,
        vibes: d.values.vibes,
        ivibes: d.values.ivibes,
        vibes_per_ivibe: Math.round((d.values.vibes/d.values.ivibes)*100)/100
      });
    } else {
      grouped.push({
        category: d.key,
        vibes: d.values.vibes,
        ivibes: d.values.ivibes
      });
    };
  });

  return grouped;
}

function grouped_bar(args) {

  var margin = {top: 30, right: 50, bottom: 30, left: 30}

  if (args.height == null) {
    var height = 350 - margin.top - margin.bottom;
  } else {
    var height = args.height - margin.top - margin.bottom;
  };

  if (args.width == null) {
    var width = 800 - margin.left - margin.right;
  } else {
    var width = args.width - margin.left - margin.right;
  }

  var x0 = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

  var x1 = d3.scale.ordinal();

  if (args.scale == "log") {
    var y = d3.scale.log()
              .range([height, 40]);
  } else {
    var y = d3.scale.linear()
              .range([height, 40]);
  }


  var colorRange = d3.scale.category20();
  var color = d3.scale.ordinal()
      .range(colorRange.range());

  var xAxis = d3.svg.axis()
      .scale(x0)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .tickValues([1, 10, 100, 1000])
      .tickFormat(d3.format(".1s"));

  var divTooltip = d3.select("body").append("div").attr("class", "toolTip");


  var svg = d3.select(args.element).append("svg")
      .attr("width", "100%")
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  
  return {

    margin: margin,
    height: height,
    width: width,


    f: d3.json(args.data, function(data) {
    
    if (args.start_date == null | args.end_date) {
      var dates = default_date_bounds();
      var start_date = dates.start,
          end_date = dates.end;
    } else {
      var start_date = args.start_date,
          end_date = args.end_date;
    };

    data = date_range(data, start_date, end_date);
    data = group_by_category(data, args.grouping, ["vibes", "ivibes"]);

    var options = d3.keys(data[0]).filter(function(key) { return key !== "category"; });

    data.forEach(function(d) {
        d.values = options.map(function(name) { return {name: name, value: +d[name]}; });
    });

    x0.domain(data.map(function(d) { return d.category; }));
    x1.domain(options).rangeRoundBands([0, x0.rangeBand()]);
    y.domain([1, d3.max(data, function(d) { return d3.max(d.values, function(d) { return d.value; }); })]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end");

    var bar = svg.selectAll(".bar")
        .data(data)
        .enter().append("g")
        .attr("class", "rect")
        .attr("transform", function(d) { return "translate(" + x0(d.category) + ",0)"; });


    var bars = bar.selectAll("rect")
                  .data(function(d) { return d.values; })
                  .enter().append("rect");

    bars.attr("width", x1.rangeBand())
        .attr("x", function(d) { return x1(d.name); })
        .attr("y", function(d) { return y(d.value); })
        .attr("value", function(d){return d.name;})
        .attr("height", function(d) { return height - y(d.value); })
        .attr("fill", function(d) { return color(d.name); })
        .on("mouseover", function() {
          d3.select(this)
            .attr("fill", "rgba(70, 70, 70, 0.8)");
        })
        .on("mouseout", function() {
          d3.select(this)
            .attr("fill", function(d) { return color(d.name); });
        });

    bar.on("mousemove", function(d){
            divTooltip.style("left", d3.event.pageX+10+"px");
            divTooltip.style("top", d3.event.pageY-25+"px");
            divTooltip.style("display", "inline-block");
            var x = d3.event.pageX, y = d3.event.pageY;
            var elements = document.querySelectorAll(':hover');
            l = elements.length;
            l = l-1;
            elementData = elements[l].__data__
            divTooltip.html((d.category)+"<br>"+elementData.name+"<br>"+elementData.value);
       })
       .on("mouseout", function(){
            divTooltip.style("display", "none");
       });

    var legend = svg.selectAll(".legend")
        .data(options.slice())
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; });
  })
  }
}

function grouped_bar_line(args) {

  var margin = {top: 30, right: 50, bottom: 30, left: 30},
      width = 800 - margin.left - margin.right,
      height = 350 - margin.top - margin.bottom;

  var x0 = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

  var x1 = d3.scale.ordinal();

  var y1 = d3.scale.log()
             .range([height, 40]);

  var y2 = d3.scale.linear()
                   .range([height, 40])

  var colorRange = d3.scale.category20();
  var color = d3.scale.ordinal()
      .range(colorRange.range());

  var xAxis = d3.svg.axis()
                    .scale(x0)
                    .orient("bottom")

  var yAxis = d3.svg.axis()
                    .scale(y1)
                    .orient("left")
                    .tickValues([1, 10, 100, 1000])
                    .tickFormat(d3.format(".1s"));

  var y2Axis = d3.svg.axis()
                     .scale(y2)
                     .orient("right");

  var divTooltip = d3.select("body").append("div").attr("class", "toolTip");

  var svg = d3.select(args.element).append("svg")
      .attr("width", "100%")
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  
  return {

    margin: margin,
    height: height,
    width: width,


    f: d3.json(args.data, function(data) {

      if (args.start_date == null | args.end_date) {
        var dates = default_date_bounds();
        var start_date = dates.start,
            end_date = dates.end;
      } else {
        var start_date = args.start_date,
            end_date = args.end_date;
      };

      data = date_range(data, start_date, end_date);
      data = group_by_category(data, "vib_event_date", ["vibes", "ivibes", "vibes_per_ivibe"]);
          
          var bardata = [],
              linedata = []
          data.forEach(function(d) {
            bardata.push({
              category: d.category,
              vibes: d.vibes,
              ivibes: d.ivibes
            })
            linedata.push({
              category: d.category,
              vibes_per_ivibe: d.vibes_per_ivibe
            })
          })

      var options = d3.keys(bardata[0]).filter(function(key) { return key !== "category"; });

      bardata.forEach(function(d) {
          d.values = options.map(function(name) { return {name: name, value: +d[name]}; });
      });
      linedata.forEach(function(d) {
          d.values = options.map(function(name) { return {name: name, value: +d[name]}; });
      });

      x0.domain(bardata.map(function(d) { return d.category; }));
      x1.domain(options).rangeRoundBands([0, x0.rangeBand()]);
      y1.domain([1, d3.max(bardata, function(d) { return d3.max(d.values, function(d) { return d.value; }); })]);
      y2.domain([0, d3.max(linedata, function(d) { return d.vibes_per_ivibe; })]);

      svg.append("g")
         .attr("class", "x axis")
         .attr("transform", "translate(0," + height + ")")
         .call(xAxis);

      svg.append("g")
         .attr("class", "y axis")
         .call(yAxis)
         .append("text")
         .attr("transform", "rotate(-90)")
         .attr("y", 6)
         .attr("dy", ".71em")
         .style("text-anchor", "end");

      svg.append("g")
         .attr("class", "y2 axis")
         .call(y2Axis)
         .attr("transform", "translate(" + width + " ,0)");

      var line = d3.svg.line()
                       .x(function(d) { return x0(d.category); })
                       .y(function(d) { return y2(d.vibes_per_ivibe); });


      var lines = svg.append("path")
                     .attr("class", "line")
                     .attr("d", line(linedata));

          d3.selectAll(".line").style("stroke", "steelblue")
                               .style("stroke-width", "2")
                               .style("fill", "none");

      var bar = svg.selectAll(".bar")
          .data(bardata)
          .enter().append("g")
          .attr("class", "rect")
          .attr("transform", function(d) { return "translate(" + x0(d.category) + ",0)"; });


      var bars = bar.selectAll("rect")
                    .data(function(d) { return d.values; })
                    .enter().append("rect");

      bars.attr("width", x1.rangeBand())
          .attr("x", function(d) { return x1(d.name); })
          .attr("y", function(d) { return y1(d.value); })
          .attr("value", function(d){return d.name;})
          .attr("height", function(d) { return height - y1(d.value); })
          .attr("fill", function(d) { return color(d.name); })
          .on("mouseover", function() {
            d3.select(this)
              .attr("fill", "rgba(70, 70, 70, 0.8)");
          })
          .on("mouseout", function() {
            d3.select(this)
              .attr("fill", function(d) { return color(d.name); });
          });

      bar.on("mousemove", function(d){
              divTooltip.style("left", d3.event.pageX+10+"px");
              divTooltip.style("top", d3.event.pageY-25+"px");
              divTooltip.style("display", "inline-block");
              var x = d3.event.pageX, y = d3.event.pageY;
              var elements = document.querySelectorAll(':hover');
              l = elements.length;
              l = l-1;
              elementData = elements[l].__data__
              divTooltip.html((d.category)+"<br>"+elementData.name+"<br>"+elementData.value);
         })
         .on("mouseout", function(){
              divTooltip.style("display", "none");
         });

      var legend = svg.selectAll(".legend")
          .data(options.slice())
          .enter().append("g")
          .attr("class", "legend")
          .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

      legend.append("rect")
          .attr("x", width - 18)
          .attr("width", 18)
          .attr("height", 18)
          .style("fill", color);

      legend.append("text")
          .attr("x", width - 24)
          .attr("y", 9)
          .attr("dy", ".35em")
          .style("text-anchor", "end")
          .text(function(d) { return d; });
    })
  }
}