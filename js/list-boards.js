$(function(){
  $(document).on('trelloReady', function(event, myMemberId){
    Trello.get('members/' + myMemberId + '/boards', function(boards) {
      var myBoards = boards.filter(function(item){
        return !item.closed
      });

      var elements = myBoards.map(function(board) {
        return '<tr class="board" data-board-id="' + board.id + '">'+
        '<td class="text-muted">' + board.id + '</td><td>' + board.name + '</td>'+
        '<td></td><td></td></tr>';
      })

      $('#boards').html(elements.join(''));

      for (var i = myBoards.length - 1; i >= 0; i--) {
        Trello.get('boards/' + myBoards[i].id + '/lists', function(boardId, lists) {

          var elements = lists.map(function(list) {
            return '<tr class="list" data-list-id="' + list.id + '">'+
            '<td></td><td></td><td class="text-muted">' + list.id + '</td>'+
            '<td>' + list.name + '</td></tr>';
          })

          $('.board[data-board-id="' + boardId + '"]')
            .after(elements.join(''));

        }.bind(null, myBoards[i].id));
      }
    })
  })
})
