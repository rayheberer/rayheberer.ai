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
          width = "80%",
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

function bindData(data_src) {
  format = d3.time.format("%Y-%m-%d");

  d3.csv(data_src, function(d) {
    d['vib_event_date'] = format.parse(d['vib_event_date'])
    return d;
  },draw);
}