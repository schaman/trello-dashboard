/************************************************************/
/************************** GET DATA ************************/
/************************************************************/

var historySince = moment().subtract(5, 'days');
var actionsLimit = 1000;
var detailedHistorySince = moment().subtract(1, 'days');
//var boardIds = ['569f25465720569236ec321d']; // Инновации

var data = {
  members: {},
  membersArray: [],
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
    var memberId = action.memberCreator.id;
    var member = members[memberId];
    if (!member) {
      member = action.memberCreator;
      member.actions = {};
      members[memberId] = member;

      if (!(memberId in data.members)) {
        data.members[memberId] = action.memberCreator;
      }
    }

    var hour = moment(action.date).startOf('hour').toISOString();
    if (hour in member.actions) {
      member.actions[hour] = member.actions[hour] + 1;
    } else {
      member.actions[hour] = 1;
    }

    if (moment(action.date) > detailedHistorySince) {
      var newAction = {
        id: action.id,
        date: moment(action.date),
        member: action.memberCreator,
        types: [action.type],
        board: action.data.board,
        list: action.data.list,
        card: action.data.card
      }

      function similarActions(a1, a2) {
        if (a1.member.id !== a2.member.id) { return false; }
        if (typeof a1.board !== typeof a2.board) { return false; }
        if (typeof a1.list !== typeof a2.list) { return false; }
        if (typeof a1.card !== typeof a2.card) { return false; }
        if (a1.board && a1.board.id !== a2.board.id) { return false; }
        if (a1.list && a1.list.id !== a2.list.id) { return false; }
        if (a1.card && a1.card.id !== a2.card.id) { return false; }

        // 5 minutes
        if (Math.abs(moment(a2.date).diff(a1.date)) > 5 * 60 * 1000) { return false; }

        return true;
      }

      // join series of common actions together
      for (var i = data.detailedHistory.length - 1; i >= 0; i--) {
        var action = data.detailedHistory[i];

        if (similarActions(action, newAction)) {
          action.types = action.types
            .concat(newAction.types)
            .filter(function(item, pos, arr){
              // unique
              return pos === 0 || item !== arr[pos-1];
            });
          newAction = null;
          break;
        }
      }

      if (newAction) {
        data.detailedHistory.push(newAction);
      }
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

    data.membersArray = [];
    for (var member in data.members) { data.membersArray.push(data.members[member]); }

    renderTable(data.detailedHistory, data.membersArray);
  })
});

function ellipsis(str, len) {
  if (str.length == 0) return '...';
  if (str.length <= len) return str;
  return str.substring(0, len-3) + '...';
}

function renderTable(data, members, activeId) {
  if (activeId) {
    data = data.filter(function(action){
      return action.member.id == activeId;
    })
  }

  var sorted = data.sort(function(a,b){
    return b.date - a.date;
  });

  var rows = d3.select("#content tbody")
    .selectAll("tr")
    .data(sorted, function(d) { return d.id });
  
  rows.exit().remove();

  tr = rows.enter().append("tr");
  tr.append('td').text(function(d) { return moment(d.date).format('lll'); });
  tr.append('td').text(function(d) { return d.member.fullName; });
  tr.append('td').text(function(d) { return d.types.join(', '); });
  tr.append('td').text(function(d) { return d.board.name + (d.list ? ' ' + d.list.name : ''); });
  tr.append('td')
    .append('a')
      .attr('href', function(d) {
        return d.card ? 'http://trello.com/c/' + d.card.shortLink : '';
      })
      .attr('target', '_blank')
      .text(function(d) { return d.card ? ellipsis(d.card.name, 40) : ''; });

  var tabs = d3.select("#filter")
    .selectAll("li.member")
    .data(members);

  tabs.exit().remove();

  tab = tabs.enter()
    .append("li")
      .attr('class', 'member')
      .append('a')
        .attr('href', function(d) { return d.id })
        .text(function(d) { return d.fullName })
}

$(function(){
  $('#filter').on('click', 'a', function(e) {
    e.preventDefault();
    $('#filter li').removeClass('active');
    $(this).parent().addClass('active');
    renderTable(data.detailedHistory, data.membersArray, $(this).attr('href'));
  });
})

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
