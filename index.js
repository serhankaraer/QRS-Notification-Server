const http = require('http');
const https = require('https');
const fs=require('fs');
const url = require('url');
var yaml = require('js-yaml');

const email = require('./lib/email');
const task = require('./lib/task')

var config = yaml.safeLoad(fs.readFileSync('./config.yaml', 'utf8'));

var executionResultIdList = []; // task hatalarında birden çok değişiklik geldiği için executionId kontrolü için kullanılıyor.

const server = http.createServer(function(req, res) {	
	if (req.method == 'POST') {
		let pathname=url.parse(req.url).pathname;
		pathname=pathname.slice(-1) == '/' ? pathname.slice(0,pathname.length-1) : pathname;
		switch (pathname) {
			case '/notify/taskfailure':
				// let executionResultId=JSON.parse(req)[0].objectID;
				// if (!executionResultIdList.includes(executionResultId)) {
					// executionResultIdList.push(executionResultId)
					taskFailure(req,config)
				// a}
			break;
		}
	}
})

const port = config.server.port;
const host = config.server.host;
server.listen(port, host)
console.log(`Listening at http://${host}:${port}`)

function taskFailure(req,config) {
	let reqData = '';
	req.on('error', err => { console.error(err); })
		.on('data', chunk => { reqData += chunk })
		.on('end', () => {
			let reqDataJson=JSON.parse(reqData);
			let executionResultId=reqDataJson[0].objectID;
			if (executionResultIdList.includes(executionResultId)) { return; } else { executionResultIdList.push(executionResultId) };
			// if (reqDataJson.length !=1) { return; } // 2 defa Json istek geliyor sunucudan
			task.parse(reqData,config).then(taskData => {
				email.send({
					from: '$FromEmailAdress$',
					to: '$ToEmailAdress$',
					subject: 'Notification Service - ' + taskData.qAppName,
					html: '<b>Zaman:</b> ' + taskData.qErrorTime + '<br/>' +
						  '<b>Görev Adı:</b> ' + taskData.qTaskName + '<br/>' +
						  '<b>Uygulama Adı:</b> ' + taskData.qAppName + '<br/>' +
						  '<b>Script Adresi:</b> ' + taskData.qScriptPath + '<br/>' +
						  '<b>Hata Mesajı:</b> ' + '<br/>' + taskData.qErrorString,
					attachments: [{filename: taskData.qScriptPath.split("\\").slice(-1)[0], path: taskData.qScriptPath }]
				})
			})
		})	
}