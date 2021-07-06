const https = require('https');
const fs=require('fs');

var config;

module.exports = {
	parse: function(reqData,YamlConfig) {	
		config=YamlConfig;
		return new Promise(function(resolve, reject) {
			let executionResultId=JSON.parse(reqData)[0].objectID;
			getEndpointData('/$VirtualProxyPrefix$/qrs/executionresult/'+executionResultId+'?xrfkey=12345678qwertyui').then(executionResult => { 
				let qErrorTime=formatDateTime(new Date(Date.parse(executionResult.modifiedDate)));
				let qAppName="", qTaskName="";
				let appId=executionResult.appID;
				let taskId=executionResult.taskID;
				let qAppNamePromise=getEndpointData('/$VirtualProxyPrefix$/qrs/app/'+appId+'?xrfkey=12345678qwertyui').then(app => { qAppName=app.name });
				let qTaskNamePromise=getEndpointData('/$VirtualProxyPrefix$/qrs/task?filter=id%20eq%20'+taskId+'&xrfkey=12345678qwertyui').then(task => { qTaskName=task[0].name })
				let qErrorString="";
				let qScriptPath="";
				console.log("scriptLogLocation:" + executionResult.scriptLogLocation);
				console.log("scriptLogAvailable:" + executionResult.scriptLogLocation);
				if (executionResult.scriptLogAvailable) {
					qScriptPath=config.log.archivePath + executionResult.scriptLogLocation
					qErrorString=extractErrorString(qScriptPath);
					Promise.all([qAppNamePromise,qTaskNamePromise]).then(() => {
						resolve({qErrorTime: qErrorTime, qTaskName: qTaskName, qScriptPath: qScriptPath, qAppName: qAppName, qErrorString: qErrorString})
					})
				} else {
					let qEngineScriptLogFilePromise=getEngineScriptLogFile(executionResult).then(file => { 
						qScriptPath='\\'+executionResult.executingNodeName+'\\C$\\ProgramData\\Qlik\\Sense\\Log\\Script\\' + file;
						qErrorString=extractErrorString(qScriptPath)
					});
					Promise.all([qAppNamePromise,qTaskNamePromise,qEngineScriptLogFilePromise]).then(() => {
						resolve({qErrorTime: qErrorTime, qTaskName: qTaskName, qAppName: qAppName, qScriptPath: qScriptPath, qErrorString: qErrorString, qAppId:appId})
					})
				};

			})
		})
	}
}

function extractErrorString(qScriptPath) {
	let logDataArray=fs.readFileSync(qScriptPath, {encoding:'utf8', flag:'r'}).split('\n');
	let errorStartString = logDataArray.find(l => {return l.includes("Error:")});
	let errorStart= logDataArray.indexOf(errorStartString)
	return logDataArray.slice(errorStart).join("<br/>");
}

function getEndpointData(path) {
	return new Promise(function(resolve, reject) {
		let options = {
			hostname: config.server.host,
			path: path,
			headers: {
				"$VirtualProxyHeaderPrefix$": '$UserName$',
				"x-qlik-xrfkey": '12345678qwertyui'
			}
		}
		let reqData = '';
		https.get(options, req => {
			req.on('error', err => { console.error(err); })
				.on('data', chunk => { reqData += chunk })
				.on('end', () => { resolve(JSON.parse(reqData))})
		})
	})
}

function formatDateTime(UTCTimeStamp) {

	function appendLeadingZeroes(n){
		if(n <= 9){ return "0" + n; } else { return n }
	}

	let formatted_date = UTCTimeStamp.getFullYear() + "-" +
						 appendLeadingZeroes(UTCTimeStamp.getMonth() + 1) + "-" +
						 appendLeadingZeroes(UTCTimeStamp.getDate()) + " " +
						 appendLeadingZeroes(UTCTimeStamp.getHours()) + ":" +
						 appendLeadingZeroes(UTCTimeStamp.getMinutes()) + ":" +
						 appendLeadingZeroes(UTCTimeStamp.getSeconds())

	return formatted_date;
}

function getEngineScriptLogFile(executionResult) {
	return new Promise(function(resolve, reject) {
		let qNodeName=executionResult.executingNodeName;
		let engineScriptLogPath='\\\\'+qNodeName+'\\C$\\ProgramData\\Qlik\\Sense\\Log\\Script';
		fs.readdir(engineScriptLogPath, (err, files) => {
			files.forEach(fName => {
				if (fName.startsWith(executionResult.appID)) { 
					fs.stat(engineScriptLogPath + '\\' + fName, (err, stats) => {
						if (Date.parse(executionResult.modifiedDate)+30*1000 >= Date.parse(stats.mtime) &&
							Date.parse(executionResult.modifiedDate)-30*1000 <= Date.parse(stats.mtime)) {
								resolve(fName);
							}
					})
				}
			})
		})
	})
}


