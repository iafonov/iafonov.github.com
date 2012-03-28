function addLinkToSets(set) {
  var title = set.title._content;

  if (title.indexOf("Other") != 0) {
    var link = "http://www.flickr.com/photos/iafonov/sets/" + set.id + "/";

		var linkTitle = parseTitle(title);
		var linkDate = parseDate(title);

    var linkElement = $("<a></a>").attr("href", link).text(linkTitle);
		var dateElement = $("<span></span>").addClass("date").text(linkDate);

    $("#photo_sets").append($("<li></li>").append(linkElement).append(dateElement));
  }
}

function parseTitle(title) {
	return $.trim(title.split("(")[0]);
}

function parseDate(title) {
	return " [" + title.split("(")[1].replace(")","") + "]";
}

function buildFlickrFeed(data) {
  $("#photo_sets").empty()
  $(data.photosets.photoset).each(function() { addLinkToSets(this)} );
}

function getSetsList() {
  $.ajax({ url: "http://api.flickr.com/services/rest/?method=flickr.photosets.getList&api_key=f6eaf319ebfea38373927273fc9fab61&user_id=31344372%40N03&format=json&jsoncallback=buildFlickrFeed",
           dataType: 'jsonp' });
}
    
$(function () {
  getSetsList();
})