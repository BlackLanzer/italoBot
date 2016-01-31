var request = require('request');
var async = require('async');
var fs = require('fs');

var TOKEN = process.argv[2];

// call callback with the page (or an error) after getting the page
var getSubredditJson = function(subreddit, callback) {
	var reqOption = {	uri : "http://reddit.com/r/"+subreddit+".json", 
						json : true
					};
	request(reqOption, function(err, res, body) {
		if (!err && res.statusCode == 200) {
			console.log("json scaricato");
			callback(body,callback);
		}
		else {
			callback(err, callback);
		}
	});
};

// call callback with an array containing all the image urls
var getImageUrls = function(jsonPage,callback) {
	var imageUrls = [];
	// json format: {data: {children: [{data: {url: url} } ] } }
	var children = jsonPage.data.children; // jsonArray
	for (var i=0; i<children.length; i++) {
		// TODO qualcosa per gli album e altri tipi di link (imgur gallery?
		if (/(jpg|png)$/.test(children[i].data.url))
			imageUrls.push(children[i].data.url);
	}
	console.log("immagine scelta")
	callback(imageUrls, callback);

	// return imageUrls;
};

// download image and call callback with the path after saving it
var getImage = function(imageUrls, callback) {
	var index = Math.floor(Math.random() * (imageUrls.length));
	var chosenUrl = imageUrls[index];
	console.log("url: "+chosenUrl);
	var fileName = /([^\/]*\.(jpg|png))$/.exec(chosenUrl)[1]; // return $filename in link/$filename
	console.log("filename: "+fileName);
	var imgPath = "tmp/" + fileName; 
	// var imgPath = "tmp/image.jpg";

	// try cath because nodejs is great, so there isn't a way to check if a file exists
	try 
	{ 	// try to check if we already downloaded the image
		if (fs.statSync(imgPath).isFile())
		{
			console.log("Image already downloaded");
			callback(imgPath);
		}
	}
	catch (e)
	{ // if the image doesn't exist download it
		var file = fs.createWriteStream(imgPath);
		
			request.get(chosenUrl, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					callback(imgPath);
				}
				else {
					// TODO gestire l'errore
				}
			})
			.on('response', function() {
				console.log("Downloading " + imageUrls[index]);
			})
			.on('end', function() {
				console.log("Download complete");
			})
			.pipe(file);
			// NOTE se c'è un errore nella richiesta scarica comunque un file vuoto
	}

};

var sendImage = function(chat_id, imgPath, callback) {
	var photo = fs.createReadStream(imgPath).on('open', function() {
		// this is needed by request, because the encoding must be multipart/form-data to send images
		var options = {
				url : "https://api.telegram.org/bot"+ TOKEN + "/sendPhoto",
				method : "POST",
				json : true,
				formData : { // the form uploaded to Telegram
					chat_id : chat_id,
					photo : photo
				}
		};
		request.post(options, function(err, res, body) {
			if (callback != undefined) callback();
		});
	});
};

var downloadAndSend = function(chat_id,subreddit) {
	getSubredditJson(subreddit, function(jsonPage) {
		getImageUrls(jsonPage, function(imageUrls) {
			getImage(imageUrls,function(imgPath) {
				sendImage(chat_id, imgPath);
			});
		})
	});
};

var offset = 0;
setInterval(function() {
	request.post("https://api.telegram.org/bot" + TOKEN + "/getUpdates",
		{form:
			{
				offset : offset
			}
		}, 
		function(err, res, body) {
			var result = JSON.parse(body).result;
			async.forEachOf(result, function (value,i,callback) {
				offset = JSON.stringify(value.update_id)*1 + 1;
				var chatId = value.message.chat.id;
				var text = value.message.text;

				if (text != undefined) // sometimes there's no text
				{
					if (text.indexOf("figa") > -1) {downloadAndSend(chatId, "realGirls");};
					if (text.indexOf("tette") > -1) {downloadAndSend(chatId, "tits");};
					if (text.indexOf("culo") > -1) {downloadAndSend(chatId, "ass");};
				}
			})
		});	
}, 1500);