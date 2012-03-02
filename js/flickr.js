function addLinkToSets(set) {
  var title = set.title._content

  if (title.indexOf("Other") != 0) {
    var link = "http://www.flickr.com/photos/iafonov/sets/" + set.id + "/";
    var linkElement = $("<a></a>").attr("href", link).text(title);

    $("#photo_sets").append($("<li></li>").append(linkElement));
  }
}

function buildFlickrFeed(data) {
  $("#photo_sets").empty()
  $(data.photosets.photoset).each(function() { addLinkToSets(this)} );
}

function getSetsList() {
  $.ajax({ url: "http://api.flickr.com/services/rest/?method=flickr.photosets.getList&api_key=c9b91c121a6afea72da6ff022bed1277&user_id=31344372%40N03&format=json&jsoncallback=buildFlickrFeed",
           dataType: 'jsonp' });
}
    
$(function () {
  getSetsList();
})