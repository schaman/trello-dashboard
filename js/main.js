var authenticationFailure = function() { console.log('Failed authentication'); };
var authenticationSuccess = function() {
  console.log('Successful authentication');
  trelloReady();
  getMyMemberInfo();
};

Trello.authorize({
  type: 'redirect',//'popup',
  //persist: false,
  name: 'Prorealnost Trello Dashboard',
  scope: {
    read: 'true',
    write: 'true' },
  expiration: 'never',
  success: authenticationSuccess,
  error: authenticationFailure
});

function getMyMemberInfo() {
  Trello.get('member/me', function(param){
    $(function(){
      $('#memberFullName').text(param.fullName);
    })
  })
}

function trelloReady() {
  document.dispatchEvent(new Event('trelloReady'));
}
