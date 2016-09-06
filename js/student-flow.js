var data = [];
var states = {
  'due': { name: 'due' },
  'no due': { name: 'no due' },
  'past due': { name: 'past due' },
};

var mindate = moment().subtract(90, 'days');
var maxdate = moment().add(14, 'days');

// z1 - state scale
var z1 = d3.scaleOrdinal();

// z2 - due state scale
var z2 = d3.scaleOrdinal();
z2.domain(['no due', 'due', 'past due']);
z2.range(['#f0ad4e', '#5cb85c', '#d9534f']);

// подбираем цвет для каждого состояния
function setStates(lists) {
  var color = d3.scaleSequential(d3.interpolatePlasma);

  var domain = lists.map(function(item){
    return item.id;
  })

  var range = lists.map(function(item, i, a){
    return color(i / a.length);
  })

  domain.push('due');
  range.push('#cccccc')

  z1.domain(domain);
  z1.range(range);

  lists.map(function(list){
    states[list.id] = list;
  })
}

var barHeight = 26;
var lineHeight = 8;

var margin = {top: 10, right: 170, bottom: 20, left: 10},
    width = 1120 - margin.left - margin.right
    height = (barHeight + lineHeight) * data.length;

// set size and margins
var svg = d3.select(".chart")
    .attr("width", "100%")
    .attr("height", "100%");

var chart = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// tip
var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
    var start = moment(d.start);
    var finish = moment(d.finish);

    var name = '(другой список)';
    if (states[d.state]) {
      name = states[d.state].name;
    }

/*
    if (d.state == 'due') {
      return name + ' ' + 
        finish.format('D MMM') +
        ' (in ' + finish.diff(start, 'days') + ' days)';
    } else {*/
      return name + ' ' + 
        start.format('D MMM') + ' – ' + finish.format('D MMM') +
        ' (' + finish.diff(start, 'days') + ' days)';
    //}
  })

chart.call(tip);

// x – time scale

var x = d3.scaleTime()
    .range([0, width]);

var xAxis = d3.axisBottom(x);

chart.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

// y - person scale
var y = d3.scaleBand();

var yAxis = d3.axisRight(y);

chart.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + width + ", 0)")
    .call(yAxis);

function render() {
  height = (barHeight + lineHeight) * data.length;

  x.domain([
    d3.max([mindate, d3.min(data, function(person){
      return d3.min(person.stateStory, function(d){ return d.start });
    })]),
    d3.min([maxdate, d3.max(data, function(person){
      return d3.max(person.stateStory, function(d){ return d.finish });
    })])
  ]);

  y.domain(data.map(function(d) { return d.card.name; }));
  y.rangeRound([0, height]);

  chart.selectAll("g.y.axis")
      .call(yAxis);

  chart.selectAll("g.x.axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  // (data) is an array/iterable thing, second argument is an ID generator function
  var people = chart.selectAll("g.person").data(data);

  people.exit().remove();

  // shift every next bar down
  var person = people.enter().append("g")
      .attr("class", "person")
      .attr("transform",
        function(d, i) { return "translate(0," + i * (barHeight + lineHeight) + ")"; });

  // telling state story

  var bars = chart.selectAll("g.person").selectAll(".bar")
      .data(function(d) { return d.stateStory; }, function(d) { return d.state; });

  bars.enter().append("rect")
      .attr("class", "bar")
      .attr("fill", function(d) { return z1(d.state); })
      .attr("height", barHeight - 1)
      .attr("url", function(d) { return d.url; })
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide)
      .on('click', function(){
        window.open(this.getAttribute('url'), '_blank');
      })

  chart.selectAll("g.person").selectAll(".bar")
      .attr("x", function(d) { return x(d3.max([mindate, d.start])); })
      .attr("width", function(d) {
          return d3.max([0, x(d3.min([maxdate, d.finish])) - x(d3.max([mindate, d.start]))]) })

  // telling due story

  var lines = chart.selectAll("g.person").selectAll(".line")
      .data(function(d) { return d.dueStory; }, function(d) { return d.state; });

  lines.enter().append("rect")
      .attr("class", "line")
      .attr("fill", function(d) { return z2(d.state); })
      .attr("height", lineHeight - 1)
      .attr("y", barHeight)
      .attr("url", function(d) { return d.url; })
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide)
      .on('click', function(){
        window.open(this.getAttribute('url'), '_blank');
      })

  chart.selectAll("g.person").selectAll(".line")
      .attr("x", function(d) { return x(d3.max([mindate, d.start])); })
      .attr("width", function(d) {
          return d3.max([0, x(d3.min([maxdate, d.finish])) - x(d3.max([mindate, d.start]))]) })

  svg.attr("viewBox", "0 0 1120 " + (height + margin.left + margin.right));
}

function tellStory(card, stateStory, dueStory){

  // переводим историю из списка состояний [дата, состояние до, состояние после]
  // в список отрезков [дата начала, дата окончания, состояние]

  var newStateStory = [];
  for (var i = stateStory.length - 1; i >= 1; i--) {
    newStateStory.push({
      start: new Date(stateStory[i].date),
      finish: new Date(stateStory[i-1].date),
      state: stateStory[i].listAfter,
      url: card.url
    });
  }

  // переводим dueStory в список состояний [ дата начала, дата окончания, состояние ]
  // где состояние — одно из (no due | due | past due)

  function decodeDates(obj) {
    var res = {};
    for (var key in obj) {
      if (obj[key]) {
        res[key] = new Date(obj[key])
      } else {
        res[key] = null;
      }
    }
    return res;
  }

  var newDueStory = [];
  for (var i = dueStory.length - 1; i >= 1; i--) {
    var my = decodeDates(dueStory[i]), next = decodeDates(dueStory[i-1]);
    if (my.dueAfter) {
      // срок будет либо до самого срока, либо до следующего изменения
      if (next.date < my.dueAfter) {
        // если мой срок перекрывает дату следующей карточки,
        // то интервал заканчиваем на дате следующей карточки

        if (i == 1) { // последнюю карточку заканчиваем в будущем, а не сегодня
          newDueStory.push({
            start: my.date,
            finish: my.dueAfter,
            state: 'due'
          })
        } else {
          newDueStory.push({
            start: my.date,
            finish: next.date,
            state: 'due'
          })
        }

      } else {
        // если мой срок не достаёт до даты следующей карточки,
        // то делаем две карточки — для текущего интервала и для просрочки

        newDueStory.push({
          start: my.date,
          finish: my.dueAfter,
          state: 'due'
        })

        newDueStory.push({
          start: my.dueAfter,
          finish: next.date,
          state: 'past due'
        })
      }
    } else {
      newDueStory.push({
        start: my.date,
        finish: next.date,
        state: 'no due'
      })
    }
  }

  data.push({
    card: card,
    stateStory: newStateStory,
    dueStory: newDueStory
  })

  render();
}

// историю карточки передаём в tellStory
function getStory(card, actions) {
  var stateStory = []; // card movements history [date, listBefore, listAfter]
  var dueStory = []; // card due_date history [date, dueBefore, dueAfter]
  var now = new Date();
  var due = new Date(card.due);

  if (due > now) {
    stateStory.push({
      date: due,
      listBefore: 'due',
      listAfter: null
    });
    stateStory.push({
      date: now,
      listBefore: card.idList,
      listAfter: 'due'
    });
  } else {
    stateStory.push({
      date: now,
      listBefore: card.idList,
      listAfter: null
    });
  }

  dueStory.push({
    date: now,
    dueBefore: card.due,
    dueAfter: null
  })

  var lastListId = card.idList;
  var lastDue = card.due;
  actions.map(function(action){
    if (action.type == 'updateCard' && action.data.listBefore) {
      stateStory.push({
        date: action.date,
        listBefore: action.data.listBefore.id,
        listAfter: action.data.listAfter.id
      });
      lastListId = action.data.listBefore.id;
    }
    if (action.type == 'updateCard' && ('old' in action.data) && ('due' in action.data.old)) {
      dueStory.push({
        date: action.date,
        dueBefore: action.data.old.due,
        dueAfter: action.data.card.due
      });
      lastDue = action.data.old.due;
    }
  })

  var cardCreated = new Date(1000*parseInt(card.id.substring(0,8),16));
  stateStory.push({
    date: cardCreated,
    listBefore: null,
    listAfter: lastListId
  });

  dueStory.push({
    date: cardCreated,
    dueBefore: null,
    dueAfter: lastDue
  })

  tellStory(card, stateStory, dueStory);
}

document.addEventListener('trelloReady', function(event){
  var boardId = '572a003f47d04696986d1b24'; // Победители (доска)
  var excludeListIds = ['5770c623e27d38baccabb740']; // META (список)
  Trello.get('board/' + boardId + '/cards', function(cards) {
    cards = cards.filter(function(card){
      // убираем карточки в списке МЕТА и карточки с лейблами
      return (excludeListIds.indexOf(card.idList) < 0) && (card.idLabels.length == 0);
    })

    cards.map(function(card, i){
      Trello.get(
        'card/' + card.id + '/actions',
        { filter: 'updateCard' },
        getStory.bind(null, card))
    })
  })
  Trello.get('board/' + boardId + '/lists', function(lists) {
    lists = lists.filter(function(list){
      return (excludeListIds.indexOf(list.id) < 0);
    })

    setStates(lists);
  })
})
