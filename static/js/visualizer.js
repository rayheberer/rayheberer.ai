function dateRange(data, startDate, endDate) {
  startDate = new Date(startDate);
  endDate = new Date(endDate);

  data = data.filter(function(d) {
    return d['vib_event_date'] > startDate && d['vib_event_date'] < endDate;
  });

  return data;
}

// append an empty svg element to the specified element of the page with a single group of class chart and a certain id
function newChart(pageElement, width, height, id) {
  return d3.select(pageElement)
           .append("svg").attr("width", width).attr("height", height)
           .append("g").attr("class", "chart").attr("id", id);
}

// getting the key from an array object tends to be an accessor function that gets called a lot
function getKey(d) {
  return d['key'];
}

function nestByCategory(category, data) {
  return d3.nest().key(function(d) {return d[category]; })
                  .rollup(function(v) {
                    var ivibes = d3.set();
                    v.forEach(function(d) {
                      ivibes.add(d['rafiki_id']);
                    });

                    return {
                      vibes: v.length,
                      ivibes: ivibes.values().length
                    };
                  })
                  .entries(data);
}

function vibesPeriVibe(category, data) {
    var categoryNested = nestByCategory(category, data);

  var vibesByCategory = [];
  var ivibesByCategory = [];

  categoryNested.forEach(function(d){

    var vibe = {};
    var ivibe = {};

    vibe[category] = getKey(d);
    vibe['metric'] = "vibes";
    vibe['VIBes / iVIBes'] = d.values.vibes;
    vibe['VIBes per iVIBe'] = d.values.vibes / d.values.ivibes

    ivibe[category] = getKey(d);
    ivibe['metric'] = "ivibes";
    ivibe['VIBes / iVIBes'] = d.values.ivibes;

    vibesByCategory.push(vibe);
    ivibesByCategory.push(ivibe);
  });
  
  var byCategory = vibesByCategory.concat(ivibesByCategory);
  
  return byCategory
}


  function draw(data) {

      "use strict";
      var margin = 30,
          width = "100%",
          height = 300 - margin;

      // filter data by date
      data = dateRange(data, "2017-06-01", "2017-07-01");

      // BY COUNTRY BREAKDOWN START =========================================
      var svgDate = newChart("#chart", width, height, "date-breakdown");
      var byDate = vibesPeriVibe("vib_event_date", data);

      var vibCategoryChart = new dimple.chart(svgDate, byDate);

      // date axis (faceting by vibes / ivibes)
      var x = vibCategoryChart.addCategoryAxis("x", ["vib_event_date", "metric"]);

      // hidden date axis with no facet (for line series)
      var x2 = vibCategoryChart.addCategoryAxis("x", "vib_event_date");
      x2.hidden = true;

      // logarithmic left axis
      var y = vibCategoryChart.addLogAxis("y", "VIBes / iVIBes", 10);
      y.showGridlines = false;
      y.overrideMin = 1;
    
      // linear right axis
      var y2 = vibCategoryChart.addMeasureAxis("y", "VIBes per iVIBe");
      y2.showGridlines = false;

      // bar chart vibes|ivibes ~ date, line chart vibes/ivibes~date
      vibCategoryChart.addSeries("metric", dimple.plot.bar, [x, y]);
      vibCategoryChart.addSeries(null, dimple.plot.line, [x2, y2]); 

      vibCategoryChart.draw();

    }

function grouped_bar_line(data_src) {
  format = d3.time.format("%Y-%m-%d");

  d3.csv(data_src, function(d) {
    d['vib_event_date'] = format.parse(d['vib_event_date'])
    return d;
  },draw);
}

function geo_heatmap(data_src) {
var h = 450,
    w = 960;
// set-up unit projection and path
var projection = d3.geo.mercator()
    .scale(1)
    .translate([0, 0]);
var path = d3.geo.path()
    .projection(projection);
// set-up svg canvas
var svg = d3.select("#map").append("svg")
    .attr("height", h)
    .attr("width", w);

d3.json("https://github.com/johan/world.geo.json/blob/master/countries.geo.json", function(error, data) {
    d3.csv(data_src, function(error, csv) {
        var world = data.features;

        // color scale for data, starting from 0, ending at max
        var color = d3.scale.linear()
                      .range(["red", "blue"])
                      .domain([0, +d3.max(csv)['Total VIBe Products Sold']])


        // calculate bounds, scale and transform 
        // see http://stackoverflow.com/questions/14492284/center-a-map-in-d3-given-a-geojson-object
        var b = path.bounds(data),
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
        function getColor(data) {
          var value = 0;
          csv.forEach(function(d, i) {
            if(data.properties.name == d.Country) {
              value = +d['Total VIBe Products Sold'];
              return;
            };
          });
          return color(value);
        }

        function handleMouseOver(d, i) {
            d3.select(this).style("stroke-width", "1.8px");
        }

        function handleMouseOut(d, i) {
            d3.select(this).style("stroke-width", "1px");
        }
debugger;
    })

  })
}