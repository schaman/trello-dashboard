/************************************************************/
/************************** GET DATA ************************/
/************************************************************/

var historySince = moment().subtract(5, 'days');
var actionsLimit = 1000;
var detailedHistorySince = moment().subtract(1, 'days');
//var boardIds = ['569f25465720569236ec321d']; // Инновации

var data = {
  members: {},
  boards: {},
  detailedHistory: []
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
/*
  boardIds.map(function(boardId){
    data.boards[boardId] = true;
    loaded.boardList.resolve();
  })
*/
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

    if (moment(action.date) > detailedHistorySince) {
      data.detailedHistory.push({
        date: new Date(action.date),
        member: action.memberCreator,
        type: action.type,
        board: action.data.board,
        list: action.data.list,
        card: action.data.card
      })
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
        var member = board.members[memberId];
        var actions = member.actions;
        for (var hour in actions) {
          var m = moment(hour);
          newData.push({
            date: m,
            name: member.fullName
          })
        }
      }
    }

    render(newData);
    renderTable(data.detailedHistory);
  })
});

function ellipsis(str, len) {
  if (str.length <= len) return str;
  return str.substring(0, len-3) + '...';
}

function renderTable(data) {
  var rows = d3.select("#content tbody")
    .selectAll("tr")
    .data(data.sort(function(a,b){
      return b.date - a.date;
    }));
  
  rows.exit().remove();

  tr = rows.enter().append("tr");
  tr.append('td').text(function(d) { return moment(d.date).format('lll'); });
  tr.append('td').text(function(d) { return d.member.fullName; });
  tr.append('td').text(function(d) { return d.action; });
  tr.append('td').text(function(d) { return d.board.name + (d.list ? ' ' + d.list.name : ''); });
  tr.append('td')
    .append('a')
      .attr('href', function(d) {
        return d.card ? 'http://trello.com/c/' + d.card.shortLink : '';
      })
      .attr('target', '_blank')
      .text(function(d) { return d.card ? ellipsis(d.card.name, 40) : ''; });
}

function render(data) {

var rowHeight = 36;
var margin = {top: 10, right: 10, bottom: 20, left: 120},
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

var yAxis = d3.axisLeft(y).ticks(d3.timeMinute.every(15));

chart.append("g")
    .attr("class", "y axis");

// tip
var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
    return moment(d.date).format('HH:00')
  })

chart.call(tip);

// render

  x.domain(d3.extent(data, function(d) { return d.date; }));
  y.domain(data.map(function(d) { return d.name; }));

  height = rowHeight * y.domain().length;
  svg.attr("viewBox", "0 0 1120 " + (height + margin.left + margin.right));

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
      .attr("r", 6)
      .attr("cx", function(d) { return x(d.date); })
      .attr("cy", function(d) { return y(d.name) + rowHeight / 2; })
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide)
      .on('click', function(){
        window.open(this.getAttribute('url'), '_blank');
      })

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
