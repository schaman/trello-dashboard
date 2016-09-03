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

var myMemberId, myMemberInfo;

function getMyMemberId() {
  Trello.get('tokens/' + Trello.token(), function(param){
    myMemberId = param.idMember;
    console.log(myMemberId);
    trelloReady();
    getMyMemberInfo();
  })
}

function getMyMemberInfo() {
  Trello.get('members/' + myMemberId, function(param){
    myMemberInfo = param;
    $('#memberFullName').text(myMemberInfo.fullName);
  })
}

function trelloReady() {
  $(document).trigger('trelloReady', [ myMemberId ]);
}
