const nodemailer = require('nodemailer');

module.exports = {
	send: function(mailOptions) {
		
		var transporter = nodemailer.createTransport({
			host: '$MailServerAddress$',
			port: 25,
			secure: false,
			tls: {
				rejectUnauthorized: false
			}
		});

		transporter.sendMail(mailOptions, function(error, info) {
		if (error) {
			console.log(error);
		} else {
			console.log('Email sent: ' + info.response);
		}
		})
	}
}



