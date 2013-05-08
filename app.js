
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , fs = require('fs')
  , phash = require('../node-phash')
  , thumb = require('node-thumbnail').thumb
  , sys = require('sys')
  , uuid =require('node-uuid');

var app = express();
var catImages = new Array();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var couchbase = require('couchbase');

couchbase.connect({
    "debug" : false,
    "user" : "Administrator",
    "password" : "skr4mj3t",
    "hosts" : [ "localhost:8091" ],
    "bucket" : "cat-scratch"
}, function (err, bucket) {
	if(err) 
		throw err;
	else {
		app.set('bucket', bucket);
		init(bucket);

	}
});



function init(bucket) {
	console.log("init");
	app.get('/',showCats);
	app.get('/matches/:hash/:threashold', matchCats);
	app.post('/upload', uploadCat);
	http.createServer(app).listen(app.get('port'), function(){
  		console.log('Express server listening on port ' + app.get('port'));
	});
}


function showCats(req,res) {
	var bucket = app.get('bucket');
	console.log('showcats');
	bucket.get('catlist', function(err,doc,meta) {
		if (err) {
			console.log(err);
			fs.readdir('public/images/cats/', function(err,files) {
				if (!err) {
					var images = new Array();
					files.forEach(function(file,index,array) {
						var ext = file.match(/\w+$/);
						if (ext[0] == 'jpg' || ext[0] == 'jpeg' || ext[0] == 'png') {
							var imageObj = {
								file: file
								, hash: null
							};
							images.push(imageObj);
						}
					});
					
					console.log(images.length + " Images Found" );
					console.log('hashing images');
					console.time('hashing-images');
					images.forEach(function(imageObj,index,array) {
						console.time(imageObj.file + "-hash");
						images[index].hash = phash.getImageHash('public/images/cats/' + imageObj.file);
						console.timeEnd(imageObj.file + "-hash");
					});
					console.timeEnd('hashing-images');
					console.log('done hashing');
					bucket.set('catlist', images, function(err) {
						if (err)
							throw err;
						console.log("imageHashes set");
						thumb({
  							source: 'public/images/cats',
 							destination: 'public/images/thumbs',
 							suffix: ''
						}, function() {
  							res.render('index', { title: 'cat-scratch', cats: images });	
						});
					});


				} else 
					throw err;
			})
		} else {
			console.log('found doc');
			res.render('index', { title: 'cat-scratch', cats: doc });	
		}
	});
}

function matchCats(req,res) {
	var hash = req.params.hash;
	var threashold = req.params.threashold;
	var matches = new Array();
	console.log(hash, threashold)
	var bucket = app.get('bucket');

	bucket.get('catlist', function(err,doc,meta) {
		var images = doc;
		console.time('comparing-images');
		matches = compare(hash,threashold,images);
		console.timeEnd('comparing-images');
		console.log('matches found: ' + matches.length);
		res.send(matches);
	});
	
}

function compare(hash,threashold,list) {
	var matches = new Array();
	list.forEach(function(imageObj,index,array) {
			var otherHash = imageObj.hash;
			var hamming = phash.hammingDistance(hash,otherHash);
			if (hamming <= threashold) {
				matches.push(imageObj);
			}
	});
	return matches;
}

function uploadCat(req,res) {
	var ext = req.files.catpic.name.match(/\w+$/)[0];
	console.log('extension: ' + ext);
	var bucket = app.get('bucket');
	fs.readFile(req.files.catpic.path, function(err,data) {
		var filename = uuid.v1(); 
		var newPath = __dirname + "/public/images/uploads/" + filename + "." +  ext;
		fs.writeFile(newPath,data,function(err) {
			bucket.get('catlist', function( err,doc,meta) {
				var images = doc;
				var newCatObj = {
					file: filename+ "." + ext,
					hash: phash.getImageHash(newPath),
				};
				images.push(newCatObj);
				bucket.set('catlist',images,function(err) {
					if(err) 
						throw err;
					thumb({
							source: 'public/images/uploads/',
							destination: 'public/images/thumbs/',
							suffix: ''
					}, function() {
							fs.renameSync(__dirname + "/public/images/uploads/" + filename + "." +  ext, __dirname + "/public/images/cats/" + filename + "." +  ext)
							res.send(compare(newCatObj.hash,3,images))

					});
					
					
				});
			});
		})
	});

}
