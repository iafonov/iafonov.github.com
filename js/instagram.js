function addThumbnail(photo, index, length) {
  var thumbnailUrl = photo.images.thumbnail.url;

  var linkElement  = $("<a></a>").attr("href", photo.link);
  var imageElement = $("<img></img>").attr("src", thumbnailUrl).addClass("instagram-preview")

  linkElement.append(imageElement);
  $("#instagram_photos").append(linkElement);
}

function renderTimeline(response) {
  $("#instagram_photos").empty();

  var length = response.data.length;

  $(response.data).each(function(index) { addThumbnail(this, index, length)} );

  $("#instagram").show();
}

function loadRecent() {
  $.ajax({ url: "https://api.instagram.com/v1/users/708217/media/recent/?access_token=708217.f59def8.d818c3dcb3a1416ea54f1822cdd19ee4&callback=renderTimeline",
           dataType: 'script' });
}

$(function () {
  loadRecent();
})