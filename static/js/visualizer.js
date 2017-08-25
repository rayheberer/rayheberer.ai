function tabulate(data, headers, columns) {
    var table = d3.select("body").append("table")
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

    // sort rows
    d3.selectAll("thead").data(data).on("click", function(k) {
      rows.sort(function(a, b) { return b[k] - a[k]; });
    });

    // create a cell in each row for each column
    var cells = rows.selectAll("td")
        .data(function(row) {
            return columns.map(function(column) {
                return {column: column, value: row[column]};
            });
        })
        .enter()
        .append("td")
            .text(function(d) { return d.value; });
    
    // add cell borders
    d3.selectAll("th")
      .style("padding", "1px 4px")
      .style("border", "1px black solid");

    d3.selectAll("td")
      .style("padding", "1px 4px")
      .style("border", "1px black solid");

    return table;
}


// ============================================
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

// =======================================================

function grouped_bar(args) {

  var margin = {top: 30, right: 50, bottom: 30, left: 30},
      width = 800 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;

  var x0 = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

  var x1 = d3.scale.ordinal();

  if (args.scale == "log") {
    var y = d3.scale.log()
              .range([height, 0]);
  } else {
    var y = d3.scale.linear()
              .range([height, 0]);
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
      .tickValues([1, 10, 100, 1000, 10000])
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

    data = date_range(data, "2017-07-01", "2017-08-01");
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
            .attr("fill", "rgba(0, 0, 0, 0.8)");
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