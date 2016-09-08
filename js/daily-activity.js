/************************************************************/
/************************** GET DATA ************************/
/************************************************************/

var historySince = moment().subtract(72, 'hours');
var actionsLimit = 200;
var boardIds = ['569f25465720569236ec321d']; // Инновации

var data = {
  members: {},
  boards: {},
};

var loaded = {
  dom: $.Deferred(),
  boardList: $.Deferred(),
  boards: []
}

$(function(){
  loaded.dom.resolve();
})

// load board list
document.addEventListener('trelloReady', function(event){
  boardIds.map(function(boardId){
    data.boards[boardId] = true;
    loaded.boardList.resolve();
  })
/*
  Trello.get(
    'member/me/boards',
    {
      filter: 'open',
      fields: 'name,url,dateLastActivity'
    },
    function(boards) {
      boards.map(function(board){
        if (moment(board.dateLastActivity) > historySince) {
          data.boards[board.id] = board;
        }
      })

      // console.log('boardList ready');
      loaded.boardList.resolve(boards);
    })
*/
});

// load every board
loaded.boardList.done(function(){
  for (var id in data.boards) {
    var dfd = $.Deferred(function(dfd){
      Trello.get(
        'boards/' + id,
        {
          fields: 'id,name,url,dateLastActivity',
          actions: 'all',
          actions_since: historySince.toISOString(),
          actions_limit: actionsLimit
        },
        function(board){
          data.boards[board.id] = board;
          processBoard(board);
          dfd.resolve(board);
        })

      loaded.boards.push(dfd);
      // console.log('board deferred object added');
    })
  }
})

// process board
function processBoard(board){
  // { memberId: { memberData, actions: { hour: actionCount } } }
  var members = board.members = {};

  board.actions.map(function(action){
    var member = members[action.memberCreator.id];
    if (!member) {
      member = action.memberCreator;
      member.actions = {};
      members[action.memberCreator.id] = member;
    }

    var hour = moment(action.date).startOf('hour').toISOString();
    if (hour in member.actions) {
      member.actions[hour] = member.actions[hour] + 1;
    } else {
      member.actions[hour] = 1;
    }
  })

  if (board.actions.length == actionsLimit) {
    console.warn('Board "' + board.name + '" reached ' + actionsLimit + ' actions limit');
  }
}

/*
// echo board contents
function boardToConsole(board){
  $(function(){
    $('#content').append('<pre>' + JSON.stringify(board, null, 2) + '</pre>');
  })
}
*/

/************************************************************/
/************************** RENDER **************************/
/************************************************************/
/**

  Делаем как на гитхабе https://github.com/schaman/club.nickvorobiov.com/graphs/punch-card

  Клетка для каждого часа (или 15 минут) за крайние 72 часа (можно попробовать 24 часа или 7 дней)
  Для каждого участника график, и для каждой доски (то есть, для пар участник+доска)

  Или можно сделать несколько вариантов с переключателем
  Участники, внутри доски (чтобы смотреть, кто пинает хуи)
  Доски, внутри участники (чтобы смотреть, на какой доске пичалька)

  Или сначала все доски, потом все участники
**/

loaded.boardList.done(function(){
  $.when.apply(null, loaded.boards).done(function(){

    // translate to [{date,hour,value}]
    var newData = [];
    for (var boardId in data.boards) {
      var board = data.boards[boardId];
      for (var memberId in board.members) {
        var actions = board.members[memberId].actions;
        for (var hour in actions) {
          var m = moment(hour);
          newData.push({
            date: hour,
            day: +m.day(),
            hour: +m.hour(),
            value: +actions[hour]
          })
        }
      }
    }

    render(newData);
  })
});

function render(data) {
  console.log(JSON.stringify(data,null,2));
  var margin = { top: 50, right: 0, bottom: 100, left: 30 },
      width = 960 - margin.left - margin.right,
      height = 430 - margin.top - margin.bottom,
      gridSize = Math.floor(width / 24),
      legendElementWidth = gridSize*2,
      buckets = 9,
      colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4",
      "#1d91c0","#225ea8","#253494","#081d58"], // alternatively colorbrewer.YlGnBu[9]
      days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
      times = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", 
      "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"];
      datasets = ["data.tsv", "data2.tsv"];

  var svg = d3.select("#chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var dayLabels = svg.selectAll(".dayLabel")
      .data(days)
      .enter().append("text")
        .text(function (d) { return d; })
        .attr("x", 0)
        .attr("y", function (d, i) { return i * gridSize; })
        .style("text-anchor", "end")
        .attr("transform", "translate(-6," + gridSize / 1.5 + ")")
        .attr("class", function (d, i) { return ((i >= 0 && i <= 4) ? 
          "dayLabel mono axis axis-workweek" : "dayLabel mono axis"); });

  var timeLabels = svg.selectAll(".timeLabel")
      .data(times)
      .enter().append("text")
        .text(function(d) { return d; })
        .attr("x", function(d, i) { return i * gridSize; })
        .attr("y", 0)
        .style("text-anchor", "middle")
        .attr("transform", "translate(" + gridSize / 2 + ", -6)")
        .attr("class", function(d, i) { return ((i >= 7 && i <= 16) ? 
          "timeLabel mono axis axis-worktime" : "timeLabel mono axis"); });

  /// render

      var colorScale = d3.scaleQuantile()
          .domain([0, buckets - 1, d3.max(data, function (d) { return d.value; })])
          .range(colors);

      var cards = svg.selectAll(".hour")
          .data(data, function(d) {return d.day+':'+d.hour;});

      cards.append("title");

      cards.enter().append("rect")
          .attr("x", function(d) { return d.hour * gridSize; })
          .attr("y", function(d) { return (d.day == 0 ? 6 : d.day - 1) * gridSize; })
          .attr("rx", 4)
          .attr("ry", 4)
          .attr("class", "hour bordered")
          .attr("width", gridSize)
          .attr("height", gridSize)
          .style("fill", function(d){ return colorScale(d.value); });

      cards.transition().duration(1000)
          .style("fill", function(d) { return colorScale(d.value); });

      cards.select("title").text(function(d) { return d.value; });
      
      cards.exit().remove();


      var timeLabels = svg.selectAll(".timeLabel")
          .data(times)
          .enter().append("text")
            .text(function(d) { return d; })


      var legend = svg.selectAll(".legend")
          .data([0].concat(colorScale.quantiles()), function(d) { return d; })
          .enter().append("g")
            .attr("class", "legend");

      legend.append("rect")
        .attr("x", function(d, i) { return legendElementWidth * i; })
        .attr("y", height)
        .attr("width", legendElementWidth)
        .attr("height", gridSize / 2)
        .style("fill", function(d, i) { return colors[i]; });

      legend.append("text")
        .attr("class", "mono")
        .text(function(d) { return "≥ " + Math.round(d); })
        .attr("x", function(d, i) { return legendElementWidth * i; })
        .attr("y", height + gridSize);

      legend.exit().remove();
}
