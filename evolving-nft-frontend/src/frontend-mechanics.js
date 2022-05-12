

$('.toggle-btn').on('click', function() {
  $(this).toggleClass('active');
  $(".send-slider").slideToggle();
});
