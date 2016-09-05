var data = [];
var totalStudentCount;
var states = {};

// z - state scale
var z = d3.scaleOrdinal();

// подбираем цвет для каждого состояния
function setStates(lists) {
  var color = d3.scaleSequential(d3.interpolatePlasma);

  z.domain(lists.map(function(item){
    return item.id;
  }))

  z.range(lists.map(function(item, i, a){
    return color(i / a.length);
  }))

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
    return states[d.state].name + ' ' + 
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
  height = barHeight * data.length;

  x.domain([
    d3.min(data, function(person){
      return d3.min(person.story, function(d){ return d.start })
    }),
    d3.max(data, function(person){
      return d3.max(person.story, function(d){ return d.finish })
    })
  ]);

  y.domain(data.map(function(d) { return d.card.name; }));
  y.rangeRound([0, height]);

  chart.selectAll("g.y.axis")
      .call(yAxis);

  chart.selectAll("g.x.axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  // shift every next bar down
  var person = chart.selectAll("g.person")
      .data(data)
    .enter().append("g")
      .attr("class", "person")
      .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; });

  var bar = person.selectAll("g")
      .data(function(d) { return d.story; })
    .enter().append("g")
      .attr("class", "stage");

  // add bars
  bar.append("rect")
      .attr("x", function(d) { return x(d.start); })
      .attr("fill", function(d) { return z(d.state); })
      .attr("width", function(d) { return x(d.finish) - x(d.start); })
      .attr("height", barHeight - 1)
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide)

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

  if (data.length == totalStudentCount) {
    render();
  }
}

// '57ab590ca071b05c3500cf53' // Продажи по трафику Лего (доска)
// '57ab5914b419ce8b3eaa798c' // Свежие лиды
// '57ab5918b6ce1ee87dad2e4f' // Дозваниваюсь
// '57ab591c36e3767f77743e61' // В работе
// '57ab59251706c8148ebb31f6' // Внес предоплату
// '57ab592d75e92d2cddaedad3' // Оплатил полностью
// '57ab5932fa2bd983186b0d73' // Закрыт
// '57cbfdaeb2e54bedc6966956' // Контроль

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
  Trello.get('board/' + boardId + '/cards', function(cards) {
    cards = cards.filter(function(card){
      // убираем карточки в списке МЕТА и карточки с лейблами
      return (excludeListIds.indexOf(card.idList) < 0) && (card.idLabels.length == 0);
    })

    // запоминаем, сколько всего студентов
    totalStudentCount = cards.length;

    cards.map(function(card){
      Trello.get('card/' + card.id + '/actions', function(card, actions){
        var story = []; // card movements history [date, listBefore, listAfter]
        var now = new Date();
        story.push({
          date: now,
          listBefore: card.idList,
          listAfter: null
        });

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
      }.bind(null, card))
    })
  })
  Trello.get('board/' + boardId + '/lists', function(lists) {
    lists = lists.filter(function(list){
      return (excludeListIds.indexOf(list.id) < 0);
    })

    setStates(lists);
  })
})
