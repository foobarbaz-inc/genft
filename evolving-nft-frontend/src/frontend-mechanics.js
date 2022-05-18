

function addGalleryItem (tokenId, uri, promptText) {
  $('#nftGallery').append(createGalleryItem(tokenId.toString(),uri,promptText));

  $('.toggle-btn' + tokenId).on('click', function() {
    $(this).toggleClass('active');
    $('.send-slider' + tokenId).slideToggle();
  });
}


function createGalleryItem (tokenId, uri, promptText) {
  return '<div class="carousel-cell col-xl-3 col-lg-4 col-md-6">' +
    '<p class="token-id-title">tokenId: </p>' +
    '<h1 class="token-id">' + tokenId + '</h1>' +
    '<img src=' + uri + ' alt="">' +
    '<p class="cell-text">' + promptText + '</p>' +
    '<p class="toggle-btn toggle-btn' + tokenId + '">' +
    '  Send To A Friend' +
    '  <span class="arrow"></span>' +
    '</p>' +
    '<div class="send-slider send-slider' + tokenId + ' hidden">' +
    '  <p class="cell-text">Enter the wallet address to transfer and see what they get!</p>' +
    '  <input type="text" id="address" class="form-control transfer-form">' +
    '  <button id="transferSubmit" class="btn btn-dark">Transfer</button>' +
    '</div>' +
    '<div class="clear">' +
    '</div>' +
    '</div>'
}
