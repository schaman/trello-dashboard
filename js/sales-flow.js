var data = [];
var totalStudentCount;

var states = [
  {
    name: 'no due',
    ids: ['nodue']
  },
  {
    name: 'due',
    color: '#cccccc',
    ids: ['due']
  },
  {
    name: 'past due',
    ids: ['pastdue']
  },
  {
    name: 'Свежие лиды',     
    color: '#0d0887', 
    ids: ['569f823006dc53595355c866','57ab5914b419ce8b3eaa798c']
  },
  {
    name: 'Дозваниваюсь',    
    color: '#5c01a6', 
    ids: ['56a5dcb3c2058bcc8d36f312','57ab5918b6ce1ee87dad2e4f']
  },
  {
    name: 'Утепляю',         
    color: '#9c179e', 
    ids: ['573304f2ffb312d29a156193']
  },
  {
    name: 'В работе',        
    color: '#cc4778', 
    ids: ['56a5dcceb432ecf074681bca','57ab591c36e3767f77743e61']
  },
  {
    name: 'Горячие',         
    color: '#ed7953', 
    ids: ['56a5dce071e24b113b761a98']
  },
  {
    name: 'Внес предоплату',
    color: '#fdb42f', 
    ids: ['56fa7cce00d210716bde0476','57ab59251706c8148ebb31f6']
  },
];

var mindate = moment().subtract(90, 'days');
var maxdate = moment().add(14, 'days');

// z2 - due state scale
var z2 = d3.scaleOrdinal();
z2.domain(['no due', 'due', 'past due']);
z2.range(['#f0ad4e', '#5cb85c', '#d9534f']);

// z1 - state scale
var z1 = d3.scaleOrdinal();

z1.domain(states.map(function(item, idx){
  return idx;
}))

z1.range(states.map(function(item, idx, arr){
  return item.color;
}))

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
    if (states[d.stateIndex]) {
      name = states[d.stateIndex].name;
    }

    return name + ' ' + 
      start.format('D MMM') + ' – ' + finish.format('D MMM') +
      ' (' + finish.diff(start, 'days') + ' days)';
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
      .attr("fill", function(d) { return z1(d.stateIndex); })
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
    var state = stateStory[i].listAfter;
    var stateIndex = -1;

    // находим это состояние в справочнике состояний и сохраняем индекс
    states.map(function(item, idx){
      if (item.ids.indexOf(state) >= 0) {
        stateIndex = idx;
      }
    })

    newStateStory.push({
      start: new Date(stateStory[i].date),
      finish: new Date(stateStory[i-1].date),
      state: stateStory[i].listAfter,
      stateIndex: stateIndex,
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

  var stateIndexes = ['no due', 'due', 'past due'];

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
            state: 'due',
            stateIndex: stateIndexes.indexOf('due')
          })
        } else {
          newDueStory.push({
            start: my.date,
            finish: next.date,
            state: 'due',
            stateIndex: stateIndexes.indexOf('due')
          })
        }

      } else {
        // если мой срок не достаёт до даты следующей карточки,
        // то делаем две карточки — для текущего интервала и для просрочки

        newDueStory.push({
          start: my.date,
          finish: my.dueAfter,
          state: 'due',
          stateIndex: stateIndexes.indexOf('due')
        })

        newDueStory.push({
          start: my.dueAfter,
          finish: next.date,
          state: 'past due',
          stateIndex: stateIndexes.indexOf('past due')
        })
      }
    } else {
      newDueStory.push({
        start: my.date,
        finish: next.date,
        state: 'no due',
        stateIndex: stateIndexes.indexOf('no due')
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
  var boardId = '569f82270e721e71ac52311c'; // Продажи (доска)
  var excludeListIds = [
    // '569f823006dc53595355c866', // Свежие лиды
    // '56a5dcb3c2058bcc8d36f312', // Дозваниваюсь
    // '573304f2ffb312d29a156193', // Утепляю
    // '56a5dcceb432ecf074681bca', // В работе (созданы договорённости)
    // '56a5dce071e24b113b761a98', // Горячие
    // '56fa7cce00d210716bde0476', // Внес предоплату
    '56b48986c8bbe91b11d7651d', // Оплатил основной
    '572b69ae1de6c67b8794b8f3', // Оплатил за 450 р.
    '56a5dcf27acf91bbd14b2149', // Закрыт
    '5718b6da72d078f32002daf9', // Закрыт. Другая страна
    '5731c82042070bd1c3014555', // Звонить через пол года
    '573395bd4cacc7328ce7ff7b', // Потребности
    '573395c2ef63a077a40b3140', // Возражения
    '56a5dcc5636be20ab7d427f7', // Вторая очередь
  ];
  Trello.get('board/' + boardId + '/cards', function(exclusions, cards) {
    cards = cards.filter(function(card){
      return (exclusions.indexOf(card.idList) < 0);
    })

    // запоминаем, сколько всего студентов
    totalStudentCount = cards.length;

    cards.map(function(card){
      Trello.get('card/' + card.id + '/actions', getStory.bind(null, card));
    })
  }.bind(null, excludeListIds))

  var boardId = '57ab590ca071b05c3500cf53'; // Продажи по трафику Лего (доска)
  var excludeListIds = [
    // '57ab5914b419ce8b3eaa798c' // Свежие лиды
    // '57ab5918b6ce1ee87dad2e4f' // Дозваниваюсь
    // '57ab591c36e3767f77743e61' // В работе
    // '57ab59251706c8148ebb31f6' // Внес предоплату
    '57ab592d75e92d2cddaedad3', // Оплатил полностью
    '57ab5932fa2bd983186b0d73', // Закрыт
    '57cbfdaeb2e54bedc6966956' // Контроль
  ];
  Trello.get('board/' + boardId + '/cards', function(exclusions, cards) {
    cards = cards.filter(function(card){
      return (exclusions.indexOf(card.idList) < 0);
    })

    // запоминаем, сколько всего студентов
    totalStudentCount = cards.length;

    cards.map(function(card){
      Trello.get('card/' + card.id + '/actions', getStory.bind(null, card));      
    })
  }.bind(null, excludeListIds))
})
