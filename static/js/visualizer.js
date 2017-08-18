function dateRange(data, startDate, endDate) {
  startDate = new Date(startDate);
  endDate = new Date(endDate);

  data = data.filter(function(d) {
    return d['vib_event_date'] > startDate && d['vib_event_date'] < endDate;
  });

  return data;
}

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

function vibesByCategory(category, data) {
  var categoryNested = nestByCategory(category, data);

  var vibesByCategory = [];
  var ivibesByCategory = [];

  categoryNested.forEach(function(d){

    var vibe = {};
    var ivibe = {};

    vibe[category] = getKey(d);
    vibe['metric'] = "vibes";
    vibe['count'] = d.values.vibes;

    ivibe[category] = getKey(d);
    ivibe['metric'] = "ivibes";
    ivibe['count'] = d.values.ivibes;

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
      var svgCountry = newChart("#country", width, height, "country-breakdown");
      var byCountry = vibesByCategory("country", data);

      // bar chart with two y-axes, logarithmic scale on each, categorical x country
      var vibCategoryChart = new dimple.chart(svgCountry, byCountry);
      var x = vibCategoryChart.addCategoryAxis("x", ["country", "metric"]);
      var y = vibCategoryChart.addLogAxis("y", "count", 10);
      y.overrideMin = 1;
      vibCategoryChart.addSeries("metric", dimple.plot.bar);
      vibCategoryChart.addLegend(65, 10, 510, 20, "left");
      vibCategoryChart.draw();
      // BY COUNTRY BREAKDOWN END ===========================================

      // BY VIB_CATEGORY BREAKDOWN START ====================================
      var svgVibCategory = newChart("#vib-category", width, height, "vib-category-breakdown");
      var byVibCategory = vibesByCategory("vib_category", data);

      // bar chart with two y-axes, logarithmic scale on each, categorical x country
      var vibCategoryChart = new dimple.chart(svgVibCategory, byVibCategory);
      var x = vibCategoryChart.addCategoryAxis("x", ["vib_category", "metric"]);
      var y = vibCategoryChart.addLogAxis("y", "count", 10);
      y.overrideMin = 1;
      vibCategoryChart.addSeries("metric", dimple.plot.bar);
      vibCategoryChart.addLegend(65, 10, 510, 20, "left");
      vibCategoryChart.draw();
      // BY VIB_CATEGORY BREAKDOWN END ======================================

  }

function updatePage() {
   format = d3.time.format("%Y-%m-%d");

	  d3.csv("http://triggerise.org/wp-content/uploads/2017/08/vibes_extract.csv", function(d) {
      d['vib_event_date'] = format.parse(d['vib_event_date'])
      return d;
    },draw);
}