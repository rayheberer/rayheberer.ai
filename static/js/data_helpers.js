function load_progress(data_src, element, total) {
  var width = 50,
    height = 50,
    twoPi = 2 * Math.PI,
    progress = 0,
    formatPercent = d3.format(".0%");
  var arc = d3.svg.arc()
      .startAngle(0)
      .innerRadius(15)
      .outerRadius(20);
  var svg = d3.select(element).append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "loading")
    .append("g")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
  var meter = svg.append("g")
      .attr("class", "progress-meter");
  meter.append("path")
      .attr("class", "background")
      .attr("d", arc.endAngle(twoPi))
      .style("fill", "#ccc");
  var foreground = meter.append("path")
      .attr("class", "foreground")
      .style("fill", "#000");

  return function() {
          var i = d3.interpolate(progress, d3.event.loaded / total);
                d3.transition().tween("progress", function() {
                  return function(t) {
                    progress = i(t);
                    foreground.attr("d", arc.endAngle(twoPi * progress));
                  };
                });
      };
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

function default_date_range(data) {
  dates = default_date_bounds();
  return date_range(data, dates.start,  dates.end);
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