function loader(config) {
  return function() {
    var radius = Math.min(config.width, config.height) / 2;
    var tau = 2 * Math.PI;

    var arc = d3.svg.arc()
            .innerRadius(radius*0.5)
            .outerRadius(radius*0.9)
            .startAngle(0);

    var svg = d3.select(config.container).append("svg")
        .attr("id", config.id)
        .attr("width", config.width)
        .attr("height", config.height)
      .append("g")
        .attr("transform", "translate(" + config.width / 2 + "," + config.height / 2 + ")")

    var background = svg.append("path")
            .datum({endAngle: 0.33*tau})
            .style("fill", "#4D4D4D")
            .attr("d", arc)
            .call(spin, 500)

    function spin(selection, duration) {
        selection.transition()
            .ease("linear")
            .duration(duration)
            .attrTween("transform", function() {
                return d3.interpolateString("rotate(0)", "rotate(360)");
            });

        setTimeout(function() { spin(selection, duration); }, duration);
    }

    function transitionFunction(path) {
        path.transition()
            .duration(7500)
            .attrTween("stroke-dasharray", tweenDash)
            .each("end", function() { d3.select(this).call(transition); });
    }

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