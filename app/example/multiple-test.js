var unitRunner = require('../lib/runner.js')({
		verbose: false,
		logFile: null
	}),
	fs = require('fs'),
	parseString = require('xml2js').parseString,
	data = fs.readFileSync('./example/data.xml'),
	//	Parses out a URL path
	getUrlPath = function(comment){
		//	Ensure it has the expected format
		if(comment.indexOf('[') !== 0) {
			return null;
		}
		return comment.substr(1, comment.lastIndexOf("]") - 1);
	},
	//	Our test, the arguments are:
	//		browser, webdriver, callback
	//	and then whatever other parameters you might want to use - they'll simply be passed through.
	//	You can optionally return a function to capture errors.
	mytest = function(b, web, resultCallback, url, value, index){
		b.get(url).then(function(){
			b.findElement(web.By.tagName("body")).getText().then(function(bText){
				resultCallback({
					success: !!(bText.indexOf(value) !== -1),
					index: index
				});
			});
		});
		//	return a handler function for errors - we want to capture the error name and stack
		return function(error){
			resultCallback({
				success: false,
				index: index,
				error: error.name,
				stackTrace: error.toString()
			});
		};
	};

unitRunner.onComplete(function(results){
	console.log('COMPLETE', JSON.stringify(results, null, 2));
});

//	Read the XML
parseString(data, function (err, result) {
	var start = 0,
		end = result.root.data.length;

	//	Selenium will automatically queue the tests, so just run them.
	for(var i = start; i < end; i += 1) {
		var entry = result.root.data[i],
			url = getUrlPath(entry.comment[0]);

		if(url) {
			unitRunner.run(mytest, url, entry.value[0], i);
		}
	}
});
