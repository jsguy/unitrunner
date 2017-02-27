var unitRunner = require('../lib/runner.js')({ logFile: null });

unitRunner.onAllComplete(function(results){
	console.log('COMPLETE', JSON.stringify(results, null, 2));
});

unitRunner.run(function(b, web, resultCallback){
	b.get("https://www.google.com/search?q=seleniumhq").then(function(){
		b.findElement(web.By.tagName("body")).getText().then(function(bText){
			resultCallback({
				success: !!(bText.indexOf("Selenium - Web Browser Automation") !== -1)
			});
		});
	});
});
