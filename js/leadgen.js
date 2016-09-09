/************************************************************/
/************************** GET DATA ************************/
/************************************************************/

var historySince = moment().subtract(7, 'days');
var actionsLimit = 1000;
var boardIds = [
  '569f82270e721e71ac52311c', // Продажи
  '56c58a310ed51dd49e59e40a', // Участники КЛР
  '56dfc3f0ed1769356279815a', // Подписчики
];

var data = {
  sources: {},
  cards: [],
};

var loaded = {
  dom: $.Deferred(),
  boards: []
}

$(function(){
  loaded.dom.resolve();
})

document.addEventListener('trelloReady', function(event){
  // load deferred
  boardIds.map(function(boardId){
    var dfd = $.Deferred(function(dfd){
      Trello.get(
        'boards/' + boardId + '/cards',
        {
          actions: 'createCard',
          since: historySince.toISOString(),
          limit: actionsLimit,
          filter: 'all'
        },
        function(cards){
          data.cards = data.cards.concat(preprocess(cards));
          dfd.resolve(cards);
        })
    })
    loaded.boards.push(dfd.promise());
  })

  // when all boards are loaded
  $.when.apply(null, loaded.boards).done(function(){
    render();
  });
});

function preprocess(cards) {
  var res = [];
  cards.map(function(card){
    card.date = new Date(1000*parseInt(card.id.substring(0,8),16));
    card.values = {};
    var lines = card.desc.split("\n");
    lines.map(function(line){
      var m = line.match(/^\*\*([a-zA-Z0-9\-_]+)\*\* (.*)/);
      if (m) {
        card.values[m[1]] = m[2];
      }
    })

    if ("referer" in card.values) {
      var uri = parseUri(card.values.referer);
      if (uri.host == 'club.nickvorobiov.com') {
        uri.host = 'club';
      }
      card.landingPage = uri.host + uri.path;
      card.source = (uri.queryKey.utm_source ? uri.queryKey.utm_source : '');
    } else {
      if ("Trello-list-id" in card.values
      && card.values["Trello-list-id"] == '569f823006dc53595355c866') {
        card.landingPage = 'club-anketa';
        card.source = '';
      }
    }

    if (!uri || uri.host !== 'localhost') {
      res.push(card);
    }
  })

  return res;
}

/************************************************************/
/************************** RENDER **************************/
/************************************************************/

function render() {
  renderTable(data.cards);
  renderChart(data.cards);
}

function renderTable(data) {
  var rows = d3.select("#content tbody")
    .selectAll("tr")
    .data(data.sort(function(a,b){
      return b.date - a.date;
    }));
  
  rows.exit().remove();

  tr = rows.enter().append("tr");
  tr.append('td').text(function(d) { return d.date; });
  tr.append('td').text(function(d) { return d.source; });
  tr.append('td').text(function(d) { return d.landingPage; });
  tr.append('td')
    .append('a')
      .attr('href', function(d) { return d.url; })
      .attr('target', '_blank')
      .text(function(d) { return (d.name ? d.name : '...'); });

}

function renderChart(data) {
  data = data.sort(function(a, b) {
    return d3.ascending((a.landingPage + ' ' + a.source), (b.landingPage + ' ' + b.source));
  });

  var rowHeight = 36;
  var margin = {top: 10, right: 10, bottom: 20, left: 265},
      width = 1120 - margin.left - margin.right;

  // set size and margins
  var svg = d3.select(".chart")
      .attr("width", "100%")
      .attr("height", "100%");

  var chart = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // x – time scale

  var x = d3.scaleTime()
      .range([0, width]);

  var xAxis = d3.axisBottom(x);

  chart.append("g")
      .attr("class", "x axis")

  // y - person scale

  var y = d3.scaleBand();

  var yAxis = d3.axisLeft(y);

  chart.append("g")
      .attr("class", "y axis");

  // render

    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain(data.map(function(d) { return d.source + ' ' + d.landingPage; }));

    height = rowHeight * y.domain().length;
    svg.attr("viewBox", "0 0 1120 " + (height + margin.top + margin.bottom));

    y.rangeRound([0, height]);

    chart.selectAll("g.y.axis")
        .call(yAxis);

    chart.selectAll("g.x.axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    var circles = chart
      .append('g')
        .attr('class', 'circles')
        .selectAll("circle").data(data);

    circles.exit().remove();

    var circle = circles.enter().append("circle")
        .attr("r", 5)
        .attr("class", function(d) { return (d.night ? 'night' : ''); })
        .attr("cx", function(d) { return x(d.date); })
        .attr("cy", function(d) { return y(d.source + ' ' + d.landingPage) + rowHeight / 2; })

  // gridlines
  //debugger;

  chart.selectAll("line.verticalGrid").data(x.ticks(d3.timeDay.every(1))).enter()
      .append("line")
          .attr("class", "verticalGrid")
          .attr("y1", margin.top)
          .attr("y2", height)
          .attr("x1", function(d){ return x(d)+0.5; })
          .attr("x2", function(d){ return x(d)+0.5; })
}