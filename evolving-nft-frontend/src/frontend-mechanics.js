

function addGalleryItem (tokenId, uri, promptText) {
  $('#nftGallery').append(createGalleryItem(tokenIds[i].toString(),uri,prompt));

  $('.toggle-btn' + tokenId).on('click', function() {
    $(this).toggleClass('active');
    $('.send-slider' + tokenId).slideToggle();
  });
}


function createGalleryItem (tokenId, uri, promptText) {
  return '<div class="carousel-cell vertical-line">' +
    '<p class="token-id-title">tokenId: </p>' +
    '<h1 class="token-id">' + tokenId + '</h1>' +
    '<img src=' + uri + ' alt="">' +
    '<p class="cell-text">' + promptText + '</p>' +
    '<p class="toggle-btn' + tokenId + '">' +
    '  Send To A Friend' +
    '  <span class="arrow"></span>' +
    '</p>' +
    '<div class="send-slider' + tokenId + ' hidden">' +
    '  <p class="cell-text">Enter the wallet address to transfer and see what they get!</p>' +
    '  <input type="text" id="address">' +
    '  <button id="transferSubmit">Transfer</button>' +
    '</div>' +
    '<div class="clear">' +
    '</div>' +
    '</div>'
}
