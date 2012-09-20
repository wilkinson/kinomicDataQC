/*global KINOMICS: false, console: false */
//TODO: error reporting for user very important here, make a failed save a ! or a yeild sign.
//TODO: change error so it only occurs on a barcode by barcode basis.


KINOMICS.fileManager = (function () {
	'use strict';

	//variable declarations
	var lib, parseFile, run, reportError;

	//variable definitions
	lib  = {};

	//Define global functions
	lib.parseFile = function (input_obj) {
		/*////////////////////////////////////////////////////////////////////////////////
		This function uses workers to parse xtab export from bionavigator and adds the
			data to the global data object: KINOMICS.barcodes
		ARGV: input_obj has seven required parts, and one optional:
			file -  (string) the file to be parsed.
			workerfile - the file that defines the worker's tasks
			workers - (object) the object that is attached to workersPackage.js
			barcodes - (object) the object where barcode information is to be added
			barcodeCreator - (function) function to be called to convert barcode data
				into complete object, originally: KINOMICS.expandBarcodeWell.
			database - (object) the database information for future formatting, requires
				following parameters:
				{ dbType: (string) <fusionTables or S3DB>,

				//For fusion tables:
				originFile: (string) <fusion table file ID>,
				originLine: (string/number) <line number of full file contents>,
				?BarcodeFileToWriteTo:?

				//For S3DB - ?Shukai will determine, and rewrite.
				collectionID:
				ruleID:
				itemID:
				}
			callback - (function) called once file is parsed, no default and is
				necessary since this function uses web workers, no parameters.
			onError - (function) [optional] called if a web worker reports an error,
				default is to call reportError().
		*/////////////////////////////////////////////////////////////////////////////////
		run(parseFile)(input_obj);
	};

	//Define Local functions TODO: finish checking user input...
	parseFile = function (input_obj) {
		//variable declarations
		var barcodes, callback, dbObj, file, onerror, expandBarcodeWell, workers, workerObj, workersFile;

		//variable definitions
		barcodes = input_obj.barcodes;
		callback = input_obj.callback;
		dbObj = input_obj.database || undefined;
		expandBarcodeWell = input_obj.barcodeCreator || undefined;
		file = input_obj.file;
		onerror = input_obj.onError || function (err) {reportError(err); };
		workerObj = input_obj.workers;
		workersFile = input_obj.workersfile;

		//check user input
		if (typeof callback !== 'function') {
			throw "ParseFile error: Callback must be defined and a function.";
		}

		if (typeof dbObj !== 'object' || dbObj === null) {
			throw "ParseFile error:  Must pass in a database object, please pass in.";
		}
		//TODO: Finish checking user input....

		workers = workerObj.startWorkers({num_workers: 1, filename: workersFile});

		workers.submitJob(file, function (evt) {
			//variable declarations
			var prop;

			//what to do with results
			for (prop in evt.data) {
				if (evt.data.hasOwnProperty(prop)) {
					barcodes[prop] = expandBarcodeWell(evt.data[prop]);
					barcodes[prop].db =  JSON.parse(JSON.stringify(dbObj));
				}
			}
		});

		workers.onComplete(function () {
			workers.clearWorkers();
			callback();
		});
	};

	reportError = function (err) {
		return console.log("File Manager Error: " + err + "\nTo display more information for any" +
			" function type <func_name> instead of <func_name>(...)");
	};

	run = function (func) {
		return function () {
			var y;
			try {
				y = func.apply(null, arguments);
			} catch (err) {
				reportError(err);
			}
			return y;
		};
	};

	return lib;
}());