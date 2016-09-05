var data = [];

var barHeight = 20;

var margin = {top: 5, right: 5, bottom: 20, left: 100},
    width = 960 - margin.left - margin.right;

var height = barHeight * data.length; // update me

// define range
var x = d3.scaleTime()
    .domain([new Date("2016-06-14T10:49:02.000Z"), new Date("2016-09-05T08:30:09.839Z")])
//    .domain([
//      d3.min(data, function(d){ return d.start }),
//      d3.max(data, function(d){ return d.finish })])
    .range([0, width]);

var y = d3.scaleBand();

// set size and margins
var chart = d3.select(".chart")
    .attr("width", width + margin.left + margin.right)
//    .attr("height", barHeight * data.length + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var xAxis = d3.axisBottom(x);

chart.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + barHeight * data.length + ")")
    .call(xAxis);

function render(card, story) {
  data.push({
    card: card,
    story: story
  })

  height = barHeight * data.length; // update me

  y.domain(data.map(function(d) { console.log(d.card.name); return d.card.name; }));
  y.rangeRound([0, height]);

  var yAxis = d3.axisLeft(y);
  chart.append("g")
      .attr("class", "y axis")
      .call(yAxis);

  // add height to chart

  chart.attr("height", height + margin.top + margin.bottom);
  chart.select(".x").attr("transform", "translate(0," + barHeight * data.length + ")");

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
      .attr("width", function(d) { return x(d.finish) - x(d.start); })
      .attr("height", barHeight - 1);

  bar.append("text")
      .attr("x", function(d) { return x(d.finish) - 3; })
      .attr("y", barHeight / 2)
      .attr("dy", ".35em")
      .text(function(d) { return d.state; });
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

  render(card, scenes);

/*
  $(function(){
    $('#content').append(
      '<h5>' + card.name + '</h5>' +
      '<pre>' + JSON.stringify(scenes, null, 2) + '</pre>' +
      '<pre>' + JSON.stringify(story, null, 2) + '</pre>'
    );
  })
*/
}

document.addEventListener('trelloReady', function(event){
  var boardId = '572a003f47d04696986d1b24'; // Победители (доска)
  var excludeListIds = ['5770c623e27d38baccabb740']; // META (список)
  Trello.get('board/' + boardId + '/cards', function(cards) {
    cards = cards.filter(function(card){
      // убираем карточки в списке МЕТА и карточки с лейблами
      return (excludeListIds.indexOf(card.idList) < 0) && (card.idLabels.length == 0);
    })

    // 575fe11ee7cfb0b5b5bc7814
    //cards = cards.filter(function(card){
    //  return card.id == '575fe11ee7cfb0b5b5bc7814';
    //})

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
              listBefore: action.data.listBefore.name,
              listAfter: action.data.listAfter.name
            });
            lastListId = action.data.listBefore.name;
          }
        })

        var cardCreated = new Date(1000*parseInt(card.id.substring(0,8),16));
        story.push({
          date: cardCreated,
          listBefore: null,
          listAfter: lastListId
        });

        tellStory(card, story);

        /*
        $('#content').append(
          '<h5>' + card.name + '</h5>' +
          '<pre>' + JSON.stringify(story, null, 2) + '</pre>' +
          '<pre>' + JSON.stringify(card, null, 2) + '</pre>' +
          '<pre>' + JSON.stringify(actions, null, 2) + '</pre>'
        );
        */
      }.bind(null, card))
    })
  })
  Trello.get('board/' + boardId + '/lists', function(lists) {
    lists = lists.filter(function(list){
      return (excludeListIds.indexOf(list.idList) < 0);
    })
  })
})
