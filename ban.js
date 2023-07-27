const log = require('./log.js').log;
const fs = require('fs-extra');
const settings = require(`${__dirname}/json/settings.json`);
const io = require('./server.js').io;
const sanitize = require('sanitize-html');

const { EmbedBuilder, WebhookClient } = require('discord.js');
const reports_hook = new WebhookClient({url: "https://discord.com/api/webhooks/1085690050383187980/P4Pc1EqZzYUK1-t3AI7eU9bZRm8Q9ownQeZAPIVf9yPDDFj5veSu3yXqtnJiofT8OiNl"});
const admx_hook = new WebhookClient({url: "https://discord.com/api/webhooks/1085690409004572763/VVVjdn9DdXd7QT6twBDckARL3KwPnF8-8ZTTkoZ7M6Y8BlRyK9mnbV0t3-HJ84SSwky6"});


let bans;
let mutes;
let logins;
let accounts;
let rooms;
var rooms_table = [];

process.on("uncaughtException", (err) => {
	console.log(err.stack);
	throw err;
});

function replace_crap(string) {
return string
    .replaceAll("@", "%")
    .replaceAll("`", "\u200B ")
    .replaceAll(" ", "\u200B ")
    .replaceAll("http://", "hgrunt/ass.wav ")
    .replaceAll("https://", "hgrunt/ass.wav ")
    .replaceAll("discord.gg/", "hgrunt/ass.wav ")
    .replaceAll("discord.com/", "hgrunt/ass.wav ")
    .replaceAll("bonzi.lol", "bwe ")
    .replaceAll("bonzi.ga", "bwe ")
    .replaceAll("*", " ")
    .replaceAll("|", " ")
    .replaceAll("~", " ");
}


exports.rooms = rooms;
exports.rooms_table = rooms_table;
exports.init = () => {
	fs.writeFile(`${__dirname}/json/bans.json`, "{}", { flag: 'wx' }, (err) => {
		if (!err)
			console.log("Created empty bans list.");
		try {
			bans = require(`${__dirname}/json/bans.json`);
		} catch (e) {
			throw "Could not load bans.json. Check syntax and permissions.";
		}
	});
	fs.writeFile(`${__dirname}/json/mutes.json`, "{}", { flag: 'wx' }, (err) => {
		if (!err)
			console.log("Created empty mutes list.");
		try {
			mutes = require(`${__dirname}/json/mutes.json`);
		} catch (e) {
			throw "Could not load mutes.json. Check syntax and permissions.";
		}
	});
};

exports.saveBans = () => {
	fs.writeFile(
		`${__dirname}/json/bans.json`,
		JSON.stringify(bans),
		{ flag: 'w' },
		function (error) {
			log.info.log('info', 'banSave', {
				error: error
			});
		}
	);
};

exports.saveReport = () => {
	fs.writeFile(
		`${__dirname}/json/reports.json`,
		JSON.stringify(reports)
	);
};

exports.saveMutes = () => {
	fs.writeFile(
		`${__dirname}/json/mutes.json`,
		JSON.stringify(mutes),
		{ flag: 'w' },
		function (error) {
			log.info.log('info', 'banSave', {
				error: error
			});
		}
	);
}; 


// Ban length is in minutes
exports.addBan = (ip, length, reason) => {
	length = parseFloat(length) || settings.banLength;
	reason = reason || "N/A";
	bans[ip] = {
		name: reason,
		end: new Date().getTime() + (length * 60000)
	};

	var sockets = io.sockets.sockets;
	var socketList = Object.keys(sockets);

	for (var i = 0; i < socketList.length; i++) {
		var socket = sockets[socketList[i]];
		if (socket.handshake.headers['cf-connecting-ip'] == ip)
			exports.handleBan(socket);
	}
	exports.saveBans();
};


exports.removeBan = (ip) => {
	delete bans[ip];
	exports.saveBans();
};

exports.removeSocket = (ip) => {
	delete ips[ip];
	exports.saveIps();
};
exports.removeMute = (ip) => {
	delete mutes[ip];
	exports.saveMutes();
};
exports.removeLogin = (ip) => {
	delete logins[ip];
	exports.saveLogins();
};

exports.handleReport = (name) => {
	var ip = name;
	return true;
};

exports.handleBan = (socket) => {
	var ip = socket.handshake.headers['cf-connecting-ip'] || socket.request.connection.remoteAddress;
	var agent = socket.handshake.headers['user-agent'];
	if (bans[ip].end <= new Date().getTime()) {
		exports.removeBan(ip);
		return false;
	}

	log.access.log('info', 'ban', {
		ip: ip
	});
	socket.emit('ban', {
		reason: bans[ip].reason,
		end: bans[ip].end
	});
	socket.disconnect();
	return true;
};
exports.handleReport = (name) => {
	var ip = name;
	var username = replace_crap(reports[ip].username);
	var reason = replace_crap(reports[ip].reason);
	var reporter = replace_crap(reports[ip].reporter);
	var rid = replace_crap(reports[ip].rid);

	const IMAGE_URL = "https://raw.githubusercontent.com/CosmicStar98/BonziWORLD-Enhanced/main/BWE%20Icon.png";
	const reportEmbed = {
		color: 0xCF14B0,
		author: {
			name: `BonziWORLD: Enhanced | Ver ${settings.version}`,
			icon_url: IMAGE_URL,
			url: 'https://github.com/CosmicStar98/BonziWORLD-Enhanced',
		},
		fields: [
			{
				name: 'Who:',
				value: username,
				inline: true,
			},
			{
				name: 'Room ID:',
				value: rid,
				inline: true,
			},
			{
				name: 'Reason:',
				value: reason,
				inline: true,
			},
			{
				name: 'Reporter:',
				value: reporter,
				inline: true,
			},
		],
		timestamp: new Date().toISOString(),
		footer: {
			text: 'Sent from the BWE website',
			icon_url: IMAGE_URL,
		},
	};

	try {
		if (settings.show_embeds == true) {
			reports_hook.send({username: `${reporter}  -  New Report!`, avatarURL: IMAGE_URL, embeds: [reportEmbed]});
		} else {
			reports_hook.send({username: `${reporter}  -  New Report!`, avatarURL: IMAGE_URL, content: `> \u0060\n**Who: **${username}\n**Room ID: **${rid}\n**Reason: **${reason}.\n**Reporter: **${reporter}\u0060`});
		}
	} catch (err) {
		console.log(`WTF?: ${err.stack}`);
	}
	console.log(`!!REPORT!!\nWho: ${username}\nRoom ID: ${rid}\nReason: ${reason}.\nReporter: ${reporter}`);
	return true;
};
exports.handleMute = (socket) => {
	var ip = socket.request.connection.remoteAddress;
	if (mutes[ip].end <= new Date().getTime()) {
		exports.removeMute(ip);
		return false;
	}

	log.access.log('info', 'mute', {
		ip: ip
	});
	socket.emit('mute', {
		reason: `${mutes[ip].reason} <button onclick='hidemute()'>Close</button>`,
		end: mutes[ip].end
	});
	return true;
};
exports.kick = (ip, reason) => {
	var sockets = io.sockets.sockets;
	var socketList = Object.keys(sockets);

	for (var i = 0; i < socketList.length; i++) {
		var socket = sockets[socketList[i]];
		if (socket.request.connection.remoteAddress == ip) {
			socket.emit('kick', {
				reason: reason || "N/A"
			});
			socket.disconnect();
		}
	}
};

exports.warning = function(ip, reason) {
	var sockets = io.sockets.sockets;
	var socketList = Object.keys(sockets);
	reason = reason || "N/A";
	for (var i = 0; i < socketList.length; i++) {
		var socket = sockets[socketList[i]];
		if (socket.request.connection.remoteAddress == ip) {
			socket.emit('warning', {
				reason: `${reason} <button onclick='hidewarning()'>Close</button>`
			});
		}
	}
};

exports.mute = (ip, length, reason) => {
	var sockets = io.sockets.sockets;
	var socketList = Object.keys(sockets);
	length = parseFloat(length) || settings.banLength;
	mutes[ip] = {
		reason: reason,
		end: new Date().getTime() + (length * 600)
	};
	reason = reason || "N/A";
	for (var i = 0; i < socketList.length; i++) {
		var socket = sockets[socketList[i]];
		if (socket.request.connection.remoteAddress == ip) {
			exports.handleMute(socket);
		}
	}

	exports.saveMutes();
};
exports.addReport = (name, username, reason, reporter, rid) => {
	var sockets = io.sockets.sockets;
	var socketList = Object.keys(sockets);
	reports[name] = {
		username: username,
		reporter: reporter,
		rid: rid,
		reason: reason
	};
	reason = reason || "N/A";
	username = username || "missingno";
	reporter = reporter || "FAK SAN WAT ARE YOU DOING, NO!";
	rid = rid || "ERROR! Can't get room id";
	exports.handleReport(name);
	exports.saveReport();
};

exports.isBanned = (ip) => Object.keys(bans).indexOf(ip) != -1;
exports.isSocketIn = (ip) => Object.keys(ips).indexOf(ip) != -1;
exports.isMuted = (ip) => Object.keys(mutes).indexOf(ip) != -1;