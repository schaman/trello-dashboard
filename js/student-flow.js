var data = [];
var states = {
  'due': { name: 'due' }
};

var mindate = moment().subtract(90, 'days');
var maxdate = moment().add(14, 'days');

// z - state scale
var z = d3.scaleOrdinal();

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

  z.domain(domain);
  z.range(range);

  lists.map(function(list){
    states[list.id] = list;
  })
}

var barHeight = 26;

var margin = {top: 10, right: 170, bottom: 20, left: 10},
    width = 1120 - margin.left - margin.right
    height = barHeight * data.length;

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

    if (d.state == 'due') {
      return name + ' ' + 
        finish.format('D MMM') +
        ' (in ' + finish.diff(start, 'days') + ' days)';
    } else {
      return name + ' ' + 
        start.format('D MMM') + ' – ' + finish.format('D MMM') +
        ' (' + finish.diff(start, 'days') + ' days)';
    }
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
  height = barHeight * data.length;

  x.domain([
    d3.max([mindate, d3.min(data, function(person){
      return d3.min(person.story, function(d){ return d.start });
    })]),
    d3.min([maxdate, d3.max(data, function(person){
      return d3.max(person.story, function(d){ return d.finish });
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
      .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; });

  var bars = chart.selectAll("g.person").selectAll(".bar")
      .data(function(d) { return d.story; }, function(d) { return d.state; });

  bars.enter().append("rect")
      .attr("class", "bar")
      .attr("fill", function(d) { return z(d.state); })
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

  svg.attr("viewBox", "0 0 1120 " + (height + margin.left + margin.right));
}

function tellStory(card, story){
  // переводим историю из списка состояний [дата, состояние до, состояние после]
  // в список отрезков [дата начала, дата окончания, состояние]

  var scenes = [];
  for (var i = story.length - 1; i >= 1; i--) {
    scenes.push({
      start: new Date(story[i].date),
      finish: new Date(story[i-1].date),
      state: story[i].listAfter
    });
  }

  data.push({
    card: card,
    story: scenes
  })

  render();
}

// историю карточки передаём в tellStory
function getStory(card, actions) {
  var story = []; // card movements history [date, listBefore, listAfter]  
  var now = new Date();
  var due = new Date(card.due);

  if (due > now) {
    story.push({
      date: due,
      listBefore: 'due',
      listAfter: null
    });
    story.push({
      date: now,
      listBefore: card.idList,
      listAfter: 'due'
    });
  } else {
    story.push({
      date: now,
      listBefore: card.idList,
      listAfter: null
    });
  }

  var lastListId = card.idList;
  actions.map(function(action){
    if (action.type == 'updateCard' && action.data.listBefore) {
      if (story.length == 1) {
        // hack – get last item name from action record
        //story[0][1] = action.data.listAfter.name;
      }
      story.push({
        date: action.date,
        listBefore: action.data.listBefore.id,
        listAfter: action.data.listAfter.id
      });
      lastListId = action.data.listBefore.id;
    }
  })

  var cardCreated = new Date(1000*parseInt(card.id.substring(0,8),16));
  story.push({
    date: cardCreated,
    listBefore: null,
    listAfter: lastListId
  });

  tellStory(card, story);
}

document.addEventListener('trelloReady', function(event){
  var boardId = '572a003f47d04696986d1b24'; // Победители (доска)
  var excludeListIds = ['5770c623e27d38baccabb740']; // META (список)
  Trello.get('board/' + boardId + '/cards', function(cards) {
    cards = cards.filter(function(card){
      // убираем карточки в списке МЕТА и карточки с лейблами
      return (excludeListIds.indexOf(card.idList) < 0) && (card.idLabels.length == 0);
    })

    cards.map(function(card){
      Trello.get('card/' + card.id + '/actions', getStory.bind(null, card))
    })
  })
  Trello.get('board/' + boardId + '/lists', function(lists) {
    lists = lists.filter(function(list){
      return (excludeListIds.indexOf(list.id) < 0);
    })

    setStates(lists);
  })
})
