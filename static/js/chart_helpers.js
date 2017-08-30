function tabulate(data, element, headers, columns) {
    var table = d3.select(element).append("table")
            .style("border-collapse", "collapse");
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
      .style("border-bottom", "1px silver solid");

    d3.selectAll("td")
      .style("padding", "1px 4px")
      .style("border-bottom", "1px silver solid");

    return table;
}

