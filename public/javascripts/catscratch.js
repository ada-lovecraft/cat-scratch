$(document).ready(function() {
	$('.cat-thumb').click(function(e) {
		$('#relevance').val(3);
		$('#relevanceLabel').html("Mostly the Same");
		$('#controls').show();
		var catHash = $(this).data('hash');
		var catFile = $(this).data('file');
		$('#portrait').attr('src','/images/cats/' + catFile);
		$('#portrait').data('hash',catHash);
		$('.cat-thumb').hide();
		$.ajax('/matches/' + catHash + "/" + 3)
			.done(function(data) {
				$('.cat-thumb').removeClass('featured');
				if (data.length > 0) {
					data.forEach(function(cat,index,array) {
						$('.cat-thumb[data-hash=' + cat.hash + ']').addClass('featured');
					});
					$('.featured').fadeIn(); 
					$('#message').html(data.length + ' Matches Found');
				} else {
					$('#message').html('No Matches Found');
				}
			});
	});

	$('#relevance').mouseup(function(e) {
		var catHash = $('#portrait').data('hash');
		var relevance = $(this).val();
		$.ajax('/matches/' + catHash + "/" + relevance)
			.done(function(data) {
				$('.cat-thumb').removeClass('featured');
				if (data.length > 0) {
					data.forEach(function(cat,index,array) {
						$('.cat-thumb[data-hash=' + cat.hash + ']').addClass('featured');
					});
					$('.cat-thumb').hide();
					$('.featured').fadeIn(); 
					$('#message').html(data.length + ' Matches Found');
				} else {
					$('.cat-thumb').fadeOut();
					$('#message').html('No Matches Found');
				}
			});
	});
	$('#relevance').change(function(e) {
		var relevance = $(this).val();
		console.log(relevance);
		var message = "";
		switch(relevance) {
			case '0':
				message = "Exactly The Same"
				break;
			case '3':
				message = "Mostly The Same"
				break;
			case '6': 
				message = "Sort of the Same"
				break;
			case '9':
				message = "Only a bit the same"
				break;
			case '12': 
				message = "Not really the same at all"
				break;
		}
		console.log(message);
		$('#relevanceLabel').html(message);
	});

	$("#upload-target").filedrop({
		paramnam: 'catpic',
		maxfiles: 1,
		maxfilesize: 3,
		url: '/upload',
		uploadFinished: function(i,file,response) {
			console.log(i);
			console.log(file);
			console.log(response);
		},
		error: function(err) {
			console.error(err);
		},
		beforeEach: function(file) {
			if(!file.type.match(/^image\//)) {
				alert('only images are allowed');
				return false;
			}
		},
		uploadStarted: function(i,file,len) {
			console.log('upload started');
		},
		progressUpdated: function(i,file,progress) {
			console.log(progress);
		}
	});
});