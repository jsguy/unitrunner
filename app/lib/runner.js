// Set event emitter limit (without using process): http://stackoverflow.com/a/26176922/6637365
require('events').EventEmitter.defaultMaxListeners = 100;

var fs = require('fs'),
	Webdriver = require('selenium-webdriver'),
	options,
	seleniumInstances = [],
	currentInstanceIndex = 0,
	def = function(obj1, obj2) {
		for(var i in obj2) {if(obj2.hasOwnProperty(i)){
			obj1[i] = obj2[i];
		}}
		return obj1;
	},
	getSeleniumInstance = function(){
		var ins;

		if(seleniumInstances.length < options.maxSeleniumInstances) {
		    var flow = new Webdriver.promise.ControlFlow()
					.on('uncaughtException', function(e) {
						//	TODO: Log this to the file?
						if(options.verbose) {
							console.log('Exception: %s', e);
						}
						if(ins.currentTestHandler && typeof ins.currentTestHandler == "function") {
							console.log('yes handler');
							ins.currentTestHandler(e);
						} else {
							console.log('no handler');
						}
					}),
		    	browser = new Webdriver.Builder().
			        forBrowser(options.browserTarget).
			        setControlFlow(flow).  // Comment out this line to see the difference.
			        build();

				ins = {
					browser: browser,
					flow: flow,
					webdriver: Webdriver
				};
				seleniumInstances.push(ins);
		} else {
			ins = seleniumInstances[currentInstanceIndex];
			currentInstanceIndex += 1;
			if(currentInstanceIndex >= seleniumInstances.length) {
				currentInstanceIndex = 0;
			}
		}

		return ins;
	},
	output = function(value){
		value = JSON.stringify(value);
		if(options.verbose) {
			console.log(value);
		}
		if(options.logFile) {
			fs.appendFile(options.logFile, value + "\n", (err) => {
				if (err) throw err;
			});
		}
	},
	results = [],
	currentRequestCount = 0,
	collateResult = function() {
		var collateResultArgs = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));
		return function(resultArgs) {
			results.push({
				args: collateResultArgs,
				resultArgs: resultArgs,
				date: (new Date()).toISOString()
			});
			output(results[results.length - 1]);
			processOnCompleteQueue();
			currentRequestCount -= 1;

			if(currentRequestCount <= 0) {
				clearTimeout(completeTimer);
				//	Use a timer in case an async call will trigger another request.
				completeTimer = setTimeout(function(){
					if(currentRequestCount <= 0) {
						complete();
					}
				}, 100);
			}
		};
	},

	startTime,
	completeTimer,
	onCompleteQueue = [],
	onAllCompleteQueue = [],

	queueOnComplete = function(func){
		onCompleteQueue.push(func);
	},

	queueOnAllComplete = function(func){
		onAllCompleteQueue.push(func);
	}

	processOnCompleteQueue = function(){
		for(var i = 0; i < onCompleteQueue.length; i += 1) {
			onCompleteQueue[i](results[results.length - 1]);
		}
	},

	processOnAllCompleteQueue = function(){
		for(var i = 0; i < onAllCompleteQueue.length; i += 1) {
			onAllCompleteQueue[i](results);
		}
	},

	runtest = function(testFunc) {
		var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments)),
			myArgs = args.slice(1),
			instance = getSeleniumInstance();

		startTime = startTime || (new Date()).getTime();

		myArgs.unshift(collateResult.apply(this, myArgs));
		myArgs.unshift(instance.webdriver);
		myArgs.unshift(instance.browser);

		currentRequestCount += 1;

		try {
			//	Use the flow to add task, so we can run in parallel
			instance.flow.execute(function(){
				instance.currentTestHandler = testFunc.apply(this, myArgs);
			});
		} catch(ex){
			if(options.verbose) {
				console.log('EXCEPTION', ex);
			}
		}
	},

	complete = function(){
		if(currentRequestCount <= 0) {
			//	Close all the browsers
			for(var i = 0; i < seleniumInstances.length; i += 1) {
				if(options.quitOnComplete) {
					seleniumInstances[i].browser.quit();
				}
			}
			if(options.verbose) {
				console.log("Time: " + (((new Date()).getTime() - startTime)/1000));
			}
			processOnAllCompleteQueue();
			//	Clear results, we're done for now.
			results = [];
		} else {
			if(options.verbose) {
				console.log("Outstanding requests:", currentRequestCount, "cannot complete yet.");
			}
		}
	};

module.exports = function(args){
	options = def({
		maxSeleniumInstances: 10,
		browserTarget: 'phantomjs',//'firefox', 'phantomjs'
		quitOnComplete: true,
		logFile: 'log.json',
		verbose: true
	}, args || {});

	//	Hard limit the number of instances.
	if(options.maxSeleniumInstances > 100) {
		options.maxSeleniumInstances = 100;
	}

	return {
		run: runtest,
		complete: complete,
		onComplete: queueOnComplete,
		onAllComplete: queueOnAllComplete
	};
};
