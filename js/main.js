var authenticationFailure = function() { console.log('Failed authentication'); };
var authenticationSuccess = function() {
  console.log('Successful authentication');
  getMyMemberId();
};

Trello.authorize({
  type: 'popup',
  name: 'Prorealnost Trello Dashboard',
  scope: {
    read: 'true',
    write: 'true' },
  expiration: 'never',
  success: authenticationSuccess,
  error: authenticationFailure
});

var myMemberId, myMemberInfo, myBoards;

function getMyMemberId() {
  Trello.get('tokens/' + Trello.token(), function(param){
    myMemberId = param.idMember;
    console.log(myMemberId);
    getMyMemberInfo();
  })
}

function getMyMemberInfo() {
  Trello.get('members/' + myMemberId, function(param){
    myMemberInfo = param;
    $('#memberFullName').text(myMemberInfo.fullName);
    listMyBoards();
  })
}

function listMyBoards() {
  Trello.get('members/' + myMemberId + '/boards', function(argument) {
    myBoards = argument.filter(function(item){
      return !item.closed
    });
    displayMyBoards();
  })
}

function displayMyBoards() {
  var elements = myBoards.map(function(board) {
    console.log(board);
    return '<a href="' + board.url + '">' + board.name + '</a>';
  })
  $('#boards').html(elements.join(''));
}