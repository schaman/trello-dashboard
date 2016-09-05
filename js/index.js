function startChecking(title, checker) {
  function failCheck(card, msg) {
    check.errors.push({ card: card, msg: msg });
  }

  function endChecking() {
    $(function(){
      if (check.errors.length == 0) {
        $('#content').append(
          '<li><h4><span class="label label-success">PASS</span> ' + check.title + '</h4></li>');
      } else {
        $('#content').append(
          '<li><h4><span class="label label-danger">FAIL</span> ' + check.title + '</h4></li>');
        for (var i = check.errors.length - 1; i >= 0; i--) {
          var error = check.errors[i];
          $('#content').append(
            '<li><span class="label label-default">' + error.msg + '</span>' +
            ' <a target="_blank" href="' + error.card.url + '">' + error.card.name + '</a></li>');
        }
      }
    })
  }

  var check;

  check = {
    title: title,
    errors: []
  }

  checker(failCheck, endChecking);
}

function getCards(listIds, cb) {
  var lists = [];
  var cards = [];

  for (var l = listIds.length - 1; l >= 0; l--) {
    Trello.get('lists/' + listIds[l], {cards: 'open'}, function(list) {
      lists.push(list);

      // start this when all lists fetched
      if (lists.length == listIds.length) {
        for (var i = lists.length - 1; i >= 0; i--) {
          for (var k = lists[i].cards.length - 1; k >= 0; k--) {
            var card = lists[i].cards[k];
            cards.push(card);
          }
        }

        // callback when all cards are in
        cb(cards);
      }
    })
  }
}

function getBoardCards(boardId, excludeListIds, cb) {
  var cards = [];

  // get all lists on board
  Trello.get('boards/' + boardId + '/lists', {cards: 'open'}, function(lists) {

    // exclude lists
    lists = lists.filter(function(list){
      return excludeListIds.indexOf(list.id) < 0;
    })

    // find all cards, exclude labelled
    for (var i = lists.length - 1; i >= 0; i--) {
      lists[i].cards = lists[i].cards.filter(function(card){
        return card.labels.length == 0;
      })

      for (var k = lists[i].cards.length - 1; k >= 0; k--) {
        var card = lists[i].cards[k];

        cards.push(card);
      }
    }

    cb(cards);
  });
}

document.addEventListener('trelloReady', function(event){
  startChecking(
    'С каждым участником тренинга созданы договорённости о сроках',
    function(failCheck, endChecking) {
      var boardId = '572a003f47d04696986d1b24'; // Победитель (доска)
      var excludeListId = '5770c623e27d38baccabb740'; // МЕТА (список)

      getBoardCards(boardId, excludeListId, function(cards) {
        for (var i = cards.length - 1; i >= 0; i--) {
          var card = cards[i];

          // check if due date exists
          if (!card.due) {
            failCheck(card, 'Отсутствует срок');
          } if (card.due < (new Date()).toISOString()) {
            failCheck(card, 'Просрочена');
          }
        }

        endChecking();
      })
    }
  );

  startChecking(
    'Просроченные задачи отсутствуют',
    function(failCheck, endChecking) {
      var boardId = '569f25465720569236ec321d'; // Инновации (доска)
      var includeListIds = [
        '569f304077dc5ef9e8fcf21a',
        '569f493ae7b4f7cc97e4b969',
        '569f5e9ba115d18c5ea8e89a',
        '56a9b7c85bc05d486bf13d22',
        '56b2ef481d2a8eadb5cd5d26'
      ];

      getCards(includeListIds, function(cards){
        for (var i = cards.length - 1; i >= 0; i--) {
          var card = cards[i];

          // check if due date exists
          if (card.due && card.due < (new Date()).toISOString()) {
            failCheck(card, 'Просрочена');
          }
        }

        endChecking();
      });
    }
  );

  startChecking(
    'Все новые лиды прозвонены',
    function(failCheck, endChecking) {
      var includeListIds = [
        '569f823006dc53595355c866', // Продажи — Свежие лиды
        '57ab5914b419ce8b3eaa798c'  // Продажи по трафику Лего — Свежие лиды
      ];

      getCards(includeListIds, function(cards){
        for (var i = cards.length - 1; i >= 0; i--) {
          var card = cards[i];

          failCheck(card, 'Лид не прозвонен');
        }

        endChecking();
      });
    }
  );

  startChecking(
    'Все договоренности о созвоне выполнены',
    function(failCheck, endChecking) {
      var includeListIds = [
        // Продажи (доска)
        '56a5dcb3c2058bcc8d36f312', // Дозваниваюсь
        '573304f2ffb312d29a156193', // Утепляю
        '56a5dcceb432ecf074681bca', // В работе (созданы договорённости)
        '56a5dce071e24b113b761a98', // Горячие
        '56fa7cce00d210716bde0476', // Внес предоплату
        // Продажи по трафику Лего (доска)
        '57ab5918b6ce1ee87dad2e4f', // Дозваниваюсь
        '57ab591c36e3767f77743e61', // В работе
        '57ab59251706c8148ebb31f6', // Внес предоплату
      ]

      getCards(includeListIds, function(cards){
        for (var i = cards.length - 1; i >= 0; i--) {
          var card = cards[i];

          // check if due date exists
          if (!card.due) {
            failCheck(card, 'Отсутствует срок');
          } if (card.due < (new Date()).toISOString()) {
            failCheck(card, 'Просрочена');
          }
        }

        endChecking();
      });
    }
  );
})
