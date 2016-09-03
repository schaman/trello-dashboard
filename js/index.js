function startChecking(title, checker) {
  function failCheck(card, msg) {
    check.errors.push({ card: card, msg: msg });
  }

  function endChecking() {
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
  }

  var check;

  check = {
    title: title,
    errors: []
  }

  checker(failCheck, endChecking);
}

$(function(){
  $(document).on('trelloReady', function(event, myMemberId){

    startChecking(
      'С каждым участником тренинга созданы договорённости о сроках',
      function(failCheck, endChecking) {
        var boardId = '572a003f47d04696986d1b24'; // Победитель (доска)
        var excludeListId = '5770c623e27d38baccabb740'; // МЕТА (список)

        // get all lists on board
        Trello.get('boards/' + boardId + '/lists', {cards: 'open'}, function(lists) {

          // exclude "meta" list
          lists = lists.filter(function(list){
            return list.id !== excludeListId;
          })

          // find all cards, exclude labelled
          for (var i = lists.length - 1; i >= 0; i--) {
            lists[i].cards = lists[i].cards.filter(function(card){
              return card.labels.length == 0;
            })

            for (var k = lists[i].cards.length - 1; k >= 0; k--) {
              var card = lists[i].cards[k];

              // check if due date exists
              if (!card.due) {
                failCheck(card, 'Отсутствует срок');
              } if (card.due < (new Date()).toISOString()) {
                failCheck(card, 'Просрочена');
              }
            }
          }

          endChecking();
        }
      );
    });

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

        // get all lists on board
        Trello.get('boards/' + boardId + '/lists', {cards: 'open'}, function(lists) {

          // all included lists
          lists = lists.filter(function(list){
            return includeListIds.indexOf(list.id) >= 0;
          })

          // find all cards
          for (var i = lists.length - 1; i >= 0; i--) {
            for (var k = lists[i].cards.length - 1; k >= 0; k--) {
              var card = lists[i].cards[k];

              // check if due date exists
              if (card.due && card.due < (new Date()).toISOString()) {
                failCheck(card, 'Просрочена');
              }
            }
          }

          endChecking();
        }
      );
    });

    startChecking(
      'Все новые лиды прозвонены',
      function(failCheck, endChecking) {
        var includeListIds = [
          '569f823006dc53595355c866', // Продажи — Свежие лиды
          '57ab5914b419ce8b3eaa798c'  // Продажи по трафику Лего — Свежие лиды
        ];

        var lists = [];

        for (var l = includeListIds.length - 1; l >= 0; l--) {
          Trello.get('lists/' + includeListIds[l], {cards: 'open'}, function(list) {
            lists.push(list);

            // start this when all lists fetched
            if (lists.length == includeListIds.length) {
              // any card us an error
              for (var i = lists.length - 1; i >= 0; i--) {
                for (var k = lists[i].cards.length - 1; k >= 0; k--) {
                  var card = lists[i].cards[k];

                  failCheck(card, 'Лид не прозвонен');

                  // пропускаем оранжевую метку "META"
                  // if (!(card.labels.length > 0
                  // && card.labels[0].name !== "57ab590c84e677fd36e08dc8")) {
                  //  failCheck(card, 'Лид не прозвонен');
                  // }
                }
              }

              endChecking();
            }
          })
        }
      }
    );

    startChecking(
      'Все договоренности о созвоне выполнены',
      function(failCheck, endChecking) {
        var boardIds = [
          '569f82270e721e71ac52311c', // Продажи (доска)
          '57ab590ca071b05c3500cf53'  // Продажи по трафику Лего (доска)
        ]

        var boardsChecked = 0;

        for (var nBoard = boardIds.length - 1; nBoard >= 0; nBoard--) {
          boardId = boardIds[nBoard];

          // get all lists on board
          Trello.get('boards/' + boardId + '/lists', {cards: 'open'}, function(lists) {
            for (var i = lists.length - 1; i >= 0; i--) {
              for (var k = lists[i].cards.length - 1; k >= 0; k--) {
                var card = lists[i].cards[k];

                // check if due date exists
                if (!card.due) {
                  failCheck(card, 'Отсутствует срок');
                } if (card.due < (new Date()).toISOString()) {
                  failCheck(card, 'Просрочена');
                }
              }
            }

            boardsChecked++;
            if (boardsChecked == boardIds.length) {
              endChecking();
            }
          })
        }
      }
    );

  })
})
