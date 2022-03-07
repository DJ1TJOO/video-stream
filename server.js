const fs = require('fs');
const pathFs = require('path');
const util = require('util');
const fsPromise = require('fs-promise');

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

const globPromise = require('glob-promise');
const glob = require('glob');

const FileStore = require('session-file-store')(session);
const LocalStrategy = require('passport-local').Strategy;
const passport = require('passport');
const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');

const mysql = require('mysql');
const axios = require('axios');

// own constants
const host = 'localhost:3000';

// init app
const app = express();

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
	next();
});

// MySql setup
var con = null;
var handleDisconnect = () => {
	con = mysql.createConnection({
		host: 'localhost',
		user: 'root',
		password: '',
		database: 'watch',
	});

	con.connect(function (err) {
		if (err) setTimeout(handleDisconnect, 2000);
		console.log('Connected!');
	});

	con.on('error', function (err) {
		if (err.code === 'PROTOCOL_CONNECTION_LOST') {
			handleDisconnect();
		} else {
			throw err;
		}
	});
};

handleDisconnect();

// Passport setup
const users = [
	{
		id: '2f24vvg',
		email: 't.ferb1@gmail.com',
		password: '$2y$12$6dzeZlfCQauwJ5..cUN4.eXo3Q21cNgd90jo9SEU2q854k2MdtzR6',
	},
];

passport.use(
	new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
		const user = users[0];
		if (email === user.email) {
			if (bcrypt.compareSync(password, user.password)) {
				return done(null, user);
			}
		}
	}),
);

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	const user = users[0].id === id ? users[0] : false;
	done(null, user);
});

// const location = 'P:/assets/';
const location = './assets/';

// app static
app.use(express.static(pathFs.join(__dirname, 'public')));
app.use(express.static(location + 'thumbnail'));

// add & configure middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
	session({
		genid: (req) => {
			return uuid(); // use UUIDs for session IDs
		},
		store: new FileStore({
			logFn: (args) => console.log(args),
		}),
		secret: 'lol1234',
		resave: false,
		saveUninitialized: true,
	}),
);
app.use(passport.initialize());
app.use(passport.session());

// routes
app.get('/', function (req, res) {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}

	res.sendFile(pathFs.join(__dirname + '/pages/index.html'));
});

app.get('/error/:error', function (req, res) {
	res.sendFile(pathFs.join(__dirname + '/error/' + req.params.error + '.html'));
});

app.get('/movies', function (req, res) {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}
	res.sendFile(pathFs.join(__dirname + '/pages/movies.html'));
});

app.get('/series', function (req, res) {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}
	res.sendFile(pathFs.join(__dirname + '/pages/series.html'));
});

app.get('/collections', function (req, res) {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}
	res.sendFile(pathFs.join(__dirname + '/pages/collections.html'));
});

// login and logout routes
app.get('/login', (req, res) => {
	res.sendFile(pathFs.join(__dirname + '/pages/login.html'));
});

app.post('/login', (req, res, next) => {
	passport.authenticate('local', (err, user, info) => {
		req.login(user, (err) => {
			req.session.save(function () {
				res.redirect('/');
				return;
			});
		});
	})(req, res, next);
});

app.get('/logout', function (req, res) {
	req.logout();
	res.cookie('connect.sid', '', { expires: Date.now(), maxAge: 0 });
	req.session.destroy(function (err) {
		if (err) {
			return next(err);
		}
		res.redirect('/login');
		return;
	});
});

// info routes
app.get('/info/:id', (req, res) => {
	globPromise(location + '**/*.json').then((files) => {
		var json = null;
		for (file of files) {
			var raw = fs.readFileSync(file);
			json = JSON.parse(raw);
			if (json.id === req.params.id) {
				break;
			}
			json = null;
		}
		res.json(JSON.stringify(json));
	});
});

app.get('/info/collection/:id', function (req, res) {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}
	res.sendFile(pathFs.join(__dirname + '/pages/infocollection.html'));
});

app.get('/info/video/:id', function (req, res) {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}
	res.sendFile(pathFs.join(__dirname + '/pages/infovideo.html'));
});

app.get('/info/series/:id', function (req, res) {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}
	res.sendFile(pathFs.join(__dirname + '/pages/infoseries.html'));
});

// videos routes
app.get('/videos/all', async (req, res) => {
	var files = await globPromise(location + 'movies/**/*.json');
	var json = null;
	var videos = [];
	for (file of files) {
		var raw = fs.readFileSync(file);
		json = JSON.parse(raw);
		if (json.type === 'video') {
			videos.push(json);
		}
	}

	var userId = null;
	if (req.user == null) {
		userId = req.query.userid;
	} else {
		userId = req.user.id;
	}
	var fullVideos = [];
	for (const video of videos) {
		try {
			const response = await axios.get('http://' + host + '/videos/info/' + video.id + '?userid=' + userId);
			fullVideos.push(JSON.parse(response.data));
		} catch (error) {
			console.log(error);
		}
	}
	res.json(JSON.stringify(fullVideos));
});

app.get('/videos/info/:id', async (req, res) => {
	var userId = null;
	if (req.user == null) {
		userId = req.query.userid;
	} else {
		userId = req.user.id;
	}
	var files = await globPromise(location + '**/*.json');
	var json = null;
	for (file of files) {
		var raw = fs.readFileSync(file);
		json = JSON.parse(raw);
		if (json.type === 'video' && json.id === req.params.id) {
			break;
		}
		json = null;
	}
	try {
		const response = await axios.get('http://' + host + '/watched/' + json.id + '?userid=' + userId);
		json.time = JSON.parse(response.data).time;
		json.duration = JSON.parse(response.data).duration;
		json.latestWatchedTime = JSON.parse(response.data).updated;
	} catch (error) {
		console.log(error);
	}
	res.json(JSON.stringify(json));
});

// series routes
app.get('/series/all', async (req, res) => {
	var files = await globPromise(location + 'series/**/*.json');
	var json = null;
	var series = [];
	for (file of files) {
		var raw = fs.readFileSync(file);
		json = JSON.parse(raw);
		if (json.type === 'series') {
			series.push(json);
		}
	}

	var userId = null;
	if (req.user == null) {
		userId = req.query.userid;
	} else {
		userId = req.user.id;
	}
	var fullSeries = [];
	for (const serie of series) {
		try {
			const response = await axios.get('http://' + host + '/series/info/' + serie.id + '?userid=' + userId);
			fullSeries.push(JSON.parse(response.data));
		} catch (error) {
			console.log(error);
		}
	}

	res.json(JSON.stringify(fullSeries));
});

app.get('/series/info/:id', async (req, res) => {
	var files = await globPromise(location + 'series/**/*.json');
	var json = null;
	var file = null;
	for (file2 of files) {
		file = file2;
		var raw = fs.readFileSync(file2);
		json = JSON.parse(raw);
		if (json.type === 'series' && json.id === req.params.id) {
			break;
		}
		json = null;
	}

	let path = pathFs.dirname(file) + '/';
	try {
		var seriesFiles = await fsPromise.readdir(path);
		var latestWatchedVideo = null;
		var latestWatchedTime = null;
		var latestWatchTime = null;
		var latestWatchDuration = null;
		var seasonCount = 0;
		var seasons = [];
		for (i = 0; i < seriesFiles.length; i++) {
			// no for or its to fast
			var seriesFile = seriesFiles[i];
			if (fs.lstatSync(path + seriesFile).isDirectory()) {
				if (!seriesFile.startsWith('s')) {
					continue;
				}
				seasonCount++;
				try {
					var videoFiles = await fsPromise.readdir(path + seriesFile + '/');
					var videos = [];
					for (const video of videoFiles) {
						if (video.endsWith('.json')) {
							var rawVideo = fs.readFileSync(path + seriesFile + '/' + video);
							videoJson = JSON.parse(rawVideo);
							var userId = null;
							if (req.user == null) {
								userId = req.query.userid;
							} else {
								userId = req.user.id;
							}
							var response = await axios.get('http://' + host + '/videos/info/' + videoJson.id + '?userid=' + userId);
							response = JSON.parse(response.data);
							if (latestWatchedVideo == null) {
								latestWatchedVideo = response.id;
								latestWatchedTime = response.latestWatchedTime;
								latestWatchTime = response.time;
								latestWatchDuration = response.duration;
							} else {
								if (latestWatchedTime < response.latestWatchedTime) {
									latestWatchedVideo = response.id;
									latestWatchedTime = response.latestWatchedTime;
									latestWatchTime = response.time;
									latestWatchDuration = response.duration;
								}
							}
							videos.push(response);
						}
					}

					function compare(a, b) {
						if (a.episode < b.episode) {
							return -1;
						}
						if (a.episode > b.episode) {
							return 1;
						}
						return 0;
					}

					videos.sort(compare);
					seasons.push({
						season: seasonCount,
						title: seriesFile.replace('s' + seasonCount, ''),
						videos: videos,
					});
				} catch (error) {
					console.log(error);
				}
			}
		}
		json.seasonCount = seasonCount;
		json.seasons = seasons;
		json.latestWatchDuration = latestWatchDuration;
		json.latestWatchTime = latestWatchTime;
		json.latestWatchedVideo = latestWatchedVideo;
		json.latestWatchedTime = latestWatchedTime;
		res.json(JSON.stringify(json));
	} catch (error) {
		console.log(error);
	}
});

// collections routes
app.get('/collections/all', async (req, res) => {
	var files = await globPromise(location + 'collections/**/*.json');
	var json = null;
	var collections = [];
	for (file of files) {
		var raw = fs.readFileSync(file);
		json = JSON.parse(raw);
		if (json.type === 'collection') {
			collections.push(json);
		}
	}

	var userId = null;
	if (req.user == null) {
		userId = req.query.userid;
	} else {
		userId = req.user.id;
	}
	var fullCollections = [];
	for (const collection of collections) {
		try {
			const response = await axios.get('http://' + host + '/collections/info/' + collection.id + '?userid=' + userId);
			fullCollections.push(JSON.parse(response.data));
		} catch (error) {
			console.log(error);
		}
	}

	res.json(JSON.stringify(fullCollections));
});

app.get('/collections/info/:id', async (req, res) => {
	var files = await globPromise(location + 'collections/**/*.json');
	var json = null;
	var latestWatchedVideo = null;
	var latestWatchedTime = null;
	var latestWatchDuration = null;
	var latestWatchTime = null;
	for (file of files) {
		var raw = fs.readFileSync(file);
		json = JSON.parse(raw);
		if (json.type === 'collection' && json.id === req.params.id) {
			for (id of json.ids) {
				var filesId = glob.sync(location + '**/*.json');
				var jsonId = null;
				for (fileId of filesId) {
					var rawId = fs.readFileSync(fileId);
					jsonId = JSON.parse(rawId);
					if (jsonId.id === id) {
						break;
					}
					jsonId = null;
				}
				var userId = null;
				if (req.user == null) {
					userId = req.query.userid;
				} else {
					userId = req.user.id;
				}
				if (jsonId.type === 'video') {
					var response = await axios.get('http://' + host + '/videos/info/' + jsonId.id + '?userid=' + userId);
					response = JSON.parse(response.data);
					if (latestWatchedVideo == null) {
						latestWatchedVideo = response.id;
						latestWatchedTime = response.latestWatchedTime;
						latestWatchTime = response.time;
						latestWatchDuration = response.duration;
					} else {
						if (latestWatchedTime < response.latestWatchedTime) {
							latestWatchedVideo = response.id;
							latestWatchedTime = response.latestWatchedTime;
							latestWatchTime = response.time;
							latestWatchDuration = response.duration;
						}
					}
				} else if (jsonId.type === 'series') {
					try {
						const response = await axios.get('http://' + host + '/series/info/' + jsonId.id + '?userid=' + userId);
						var jsonSeries = JSON.parse(response.data);
						if (latestWatchedVideo == null) {
							latestWatchedVideo = jsonSeries.latestWatchedVideo;
							latestWatchedTime = jsonSeries.latestWatchedTime;
							latestWatchTime = jsonSeries.latestWatchTime;
							latestWatchDuration = jsonSeries.latestWatchDuration;
						} else {
							if (latestWatchedTime < jsonSeries.latestWatchedTime) {
								latestWatchedVideo = jsonSeries.latestWatchedVideo;
								latestWatchedTime = jsonSeries.latestWatchedTime;
								latestWatchTime = jsonSeries.latestWatchTime;
								latestWatchDuration = jsonSeries.latestWatchDuration;
							}
						}
					} catch (error) {
						console.log(error);
					}
				} else if (jsonId.type === 'collection') {
					try {
						const response = await axios.get('http://' + host + '/collections/info/' + jsonId.id + '?userid=' + userId);
						var jsonCollection = JSON.parse(response.data);
						if (latestWatchedVideo == null) {
							latestWatchedVideo = jsonCollection.latestWatchedVideo;
							latestWatchedTime = jsonCollection.latestWatchedTime;
							latestWatchTime = jsonCollection.latestWatchTime;
							latestWatchDuration = jsonCollection.latestWatchDuration;
						} else {
							if (latestWatchedTime < jsonCollection.latestWatchedTime) {
								latestWatchedVideo = jsonCollection.latestWatchedVideo;
								latestWatchedTime = jsonCollection.latestWatchedTime;
								latestWatchTime = jsonCollection.latestWatchTime;
								latestWatchDuration = jsonCollection.latestWatchDuration;
							}
						}
					} catch (error) {
						console.log(error);
					}
				}
			}
			break;
		}
		json = null;
	}

	json.latestWatchDuration = latestWatchDuration;
	json.latestWatchTime = latestWatchTime;
	json.latestWatchedTime = latestWatchedTime;
	json.latestWatchedVideo = latestWatchedVideo;

	res.json(JSON.stringify(json));
});

app.get('/watched/:videoid/', (req, res) => {
	var userId = null;
	if (req.user == null) {
		userId = req.query.userid;
	} else {
		userId = req.user.id;
	}
	var videoUuid = req.params.videoid;
	con.query(`SELECT * FROM watched WHERE video_id = "${videoUuid}" AND user_id = "${userId}"`, (error, results, fields) => {
		if (results.length > 0) {
			res.json(
				JSON.stringify({
					time: results[0].time,
					updated: results[0].updated,
					duration: results[0].duration,
				}),
			);
		} else {
			res.json(
				JSON.stringify({
					time: 0,
					updated: '0000-00-00T00:00:00.000Z',
					duration: 0,
				}),
			);
		}
	});
});

app.post('/watched/:videoid/:time/:duration', (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect('/login');
		return;
	}
	var userId = null;
	if (req.user == null) {
		userId = req.query.userid;
	} else {
		userId = req.user.id;
	}
	var videoUuid = req.params.videoid;
	var time = req.params.time;
	var duration = req.params.duration;
	//console.log("watched" + time + " " + duration);
	con.query(`SELECT * FROM watched WHERE video_id = "${videoUuid}" AND user_id = "${userId}"`, (error, results, fields) => {
		if (results.length > 0) {
			//update
			con.query(`UPDATE watched SET time = "${time}", duration = "${duration}" WHERE video_id = "${videoUuid}" AND user_id = "${userId}"`, (error, results, fields) => {
				if (error) console.log(error);
			});
		} else {
			//add
			con.query(`INSERT INTO watched (video_id, user_id, time, duration) VALUES ("${videoUuid}", "${userId}", "${time}", "${duration}")`, (error, results, fields) => {
				if (error) console.log(error);
			});
		}
	});
});

app.get('/watch/:id', function (req, res) {
	if (!req.isAuthenticated()) res.redirect('/login');
	var id = req.params.id;
	globPromise(location + '**/*.json').then((files) => {
		//console.log(files);
		//if(err)
		//  console.log("cannot read the folder", err);

		var json = null;
		var file = null;
		for (i = 0; i < files.length; i++) {
			file = files[i];
			var raw = fs.readFileSync(file);
			json = JSON.parse(raw);
			//console.log(json);
			if (json.type === 'video' && json.id === id) {
				//console.log("correct");
				break;
			}
			json = null;
		}

		//console.log(json);
		if (json === null) {
			res.redirect('/error/notfound');
			return;
		}
		res.sendFile(__dirname + '/pages/watch.html');
	});
});

app.get('/video/:id', function (req, res) {
	var id = req.params.id;
	var files = glob.sync(location + '**/*.json');
	var json = null;
	var file = null;
	for (i = 0; i < files.length; i++) {
		file = files[i];
		var raw = fs.readFileSync(file);
		json = JSON.parse(raw);
		//console.log(json);
		if (json.type === 'video' && json.id === id) {
			//console.log("correct");
			break;
		}
	}

	//console.log(json);
	if (json === null) {
		return null;
	}

	var video = {
		id: id,
		title: json.title,
		description: json.description,
		year: json.year,
		added: json.added,
		file: file,
	};

	//console.log(video);
	let path = pathFs.dirname(video.file) + '/' + video.title + '.mp4';

	const stat = fs.statSync(path);
	const fileSize = stat.size;
	const range = req.headers.range;

	if (range) {
		const parts = range.replace(/bytes=/, '').split('-');
		const start = parseInt(parts[0], 10);
		const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

		if (start >= fileSize) {
			res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
			return;
		}

		const chunksize = end - start + 1;
		const file = fs.createReadStream(path, { start, end });
		const head = {
			'Content-Range': `bytes ${start}-${end}/${fileSize}`,
			'Accept-Ranges': 'bytes',
			'Content-Length': chunksize,
			'Content-Type': 'video/mp4',
		};

		res.writeHead(206, head);
		file.pipe(res);
	} else {
		const head = {
			'Content-Length': fileSize,
			'Content-Type': 'video/mp4',
		};
		res.writeHead(200, head);
		fs.createReadStream(path).pipe(res);
	}
});

app.listen(3000, function () {
	console.log('Listening on port 3000!');
});
