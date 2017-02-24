var unitRunner = require('../lib/runner.js')({
		//browserTarget: 'firefox',
		verbose: false,
		logFile: null
	}),
	fs = require('fs'),
	parseString = require('xml2js').parseString,
	data = fs.readFileSync('./example/data.xml'),
	getUrlPath = function(comment){
		//	Ensure it has the expected format
		if(comment.indexOf('[') !== 0) {
			return null;
		}
		return comment.substr(1, comment.lastIndexOf("]") - 1);
	},
	testForKeyword = function(b, web, keyword, cb, index, addedPropertyId){
		b.findElement(web.By.tagName("body")).getText().then(function(bText){
			cb({
				index: index,
				success: bText.indexOf("{" + keyword + "}") !== -1,
				addedPropertyId: addedPropertyId
			});
		});
	},
	//	The test - the arguments are:
	//
	//		browser, webdriver, callback
	//
	//	Then whatever other parameters you might want to use - they'll simply be passed through
	mytest = function(b, web, resultCallback, url, keyword, index){

		console.log(url, keyword, index);

		//	Grab our URL
		b.get(url);
		b.getCurrentUrl().then(function(newUrl){
			console.log('Got to', newUrl);
		});
	};

unitRunner.onComplete(function(results){
	console.log('COMPLETE', JSON.stringify(results, null, 2));
});

//	Read the XML
parseString(data, function (err, result) {
	var start = 0,
		end = 1;//result.root.data.length;

	//	Selenium will automatically queue the tests, so just run them.
	for(var i = start; i < end; i += 1) {
		(function(i){
			var entry = result.root.data[i],
				key = entry.$.name,
				comment = entry.comment[0],
				url = getUrlPath(comment);

			if(url) {
				unitRunner.run(mytest, url, key, i);
			}

		}(i));
	}
});
