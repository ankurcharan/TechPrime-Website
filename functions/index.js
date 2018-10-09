const functions = require('firebase-functions');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const isAuthenticated = require('./middlewares/auth');
const isAuthenticatedAdmin = require('./middlewares/admin');
const config = require('./config');

const os = require('os');
const path = require('path');
const fs=require('fs');

admin.initializeApp();
const database = admin.database();
const db = database.ref();


// Hard-Coded String
const events = "events";
const eventDescription = "eventDescription";
const userRegistrations = "userRegistrations";
const users = "users";
const registeredEvents = "registeredEvents";
const queries = "queries";
const googleUrl = 'https://www.googleapis.com/plus/v1/people/me?access_token=';

// express
const app = express();
app.use(bodyParser.urlencoded({extended:false}));










// routes
app.post('/login', googleLogin);
app.put('/user', isAuthenticated, signUp);

app.get('/events', getEventNames);
app.get('/events/categories', getCategories);
app.get('/events/description', getEventDescription);
app.get('/events/timeline', getEventTimeline);
app.post('/events', isAuthenticated, addEvent);
app.get('/user/event', isAuthenticated, getRegisteredEvents);
app.put('/user/event', isAuthenticated, eventRegister);

app.get('/facts',randomFact);
app.get('/videos',video);
app.post('/query',isAuthenticated,addQuery)

app.get('/timestamp', getTimestamp);

app.get('/admin/event', isAuthenticated, getEventUsers);
app.get('/admin/query', isAuthenticated, getQuery);










const cors = require('cors')({
	origin: true
});

const Busboy = require('busboy');

const gcconfig={
	projectId: 'techspardha-87928',
	keyFilename: 'techspardha-87928-firebase-adminsdk-90uao-4ba2ed363c.json'
};

const gcs = require('@google-cloud/storage')(gcconfig);

exports.uploadFile = functions.https.onRequest((req, res) => {

	cors(req, res, () => {
		if(req.method !== 'POST')
		{
			res.status(500).json({
				message: "Use POST request.",
				success: false
			});
		}
		const busboy = new Busboy({headers: req.headers});

		let uploadData = null;
		busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

			const filepath = path.join(os.tmpdir(), filename);
			uploadData = {
				file: filepath,
				type: mimetype
			};
			file.pipe(fs.createWriteStream(filepath));
		});

		busboy.on('finish', () => {

			if(uploadData === null) {

				return res.status(400).json({
					success: false,
					message: "file not sent."
				})
			}

			const bucket = gcs.bucket('techspardha-87928.appspot.com');
			bucket.upload(uploadData.file, {
				uploadType: 'media' ,
				metadata: {
					metadata: {
						contentType: uploadData.type
					}
				}
			})
			.then((data) => {

				// let file = data[0];
				// file.getSignedUrl({
				// 	action: 'read',
				// 	expires: '03-17-2025'
				// }, function(err, url) {
				// 	if (err) {
				// 		console.error(err);
				// 		return;
				// 	}

				// 	console.log(url);
				// })

				return res.status(200).json({
					message: "File uploaded successfully!",
				});
			})
			.catch(() => {

				res.status(500).json({
					error: "crashed",
					success: false
				});
			});
		});
		
		busboy.end(req.rawBody);
	});
});














// exports.generateThumbnail = storage.onFinalize((object) => {


// 	const fileBucket = object.bucket; // The Storage bucket that contains the file.
// 	const filePath = object.name; // File path in the bucket.
// 	const contentType = object.contentType; // File content type.
// 	const metageneration = object.metageneration; // Number of times metadata has been generated. New objects have a value of 1.

// 	console.log(fileBucket);
// 	console.log(filePath);
// 	console.log(contentType);
// 	console.log(metageneration);

// })

// exports.uploadFile = functions.https.onRequest((req, res) => {
// 	const busboy = new Busboy({headers: req.headers});
// 	let uploadData = null;


// 	busboy.on('file',(fieldname,file,filename,encoding,mimetype) => {

// 		const filepath = path.join(os.tmpdir(), filename);
// 		uploadData={
// 			file: filepath,
// 			type: mimetype
// 		};
// 		file.pipe(fs.createWriteStream(filepath));
// 	});

// 	busboy.on('finish',() => {
// 		const bucket=gcs.bucket('techspardha-87928.appspot.com');
// 		bucket.upload(uploadData.file, {
// 			uploadType: 'media' ,
// 			metadata: {
// 				metadata: {
// 					contentType: uploadData.type
// 				}
// 			}
// 		}).then(() =>{
// 			return res.status(200).json({
// 				message: "It worked!",
//             // file: filename,
//             // type: mimetype
//         });
// 		}).catch(err => {
// 			res.status(500).json({
// 				error: err
// 			});
// 		});
// 	});
// 	busboy.end(req.rawBody);
// });





























app.use('/', (req, res) => {

	let data = {};
	let success = false;
	let message = "connected to server";
	let anotherMessage = "C'mon we created so many routes, use them!!";

	res.status(404).json({success:success,message:message,anotherMessage:anotherMessage});
})

// return users registered in one single event
function getEventUsers(req, res) {

	let eventName = req.query.eventName;
	let eventCategory = req.query.eventCategory;

	if(eventName === undefined || eventCategory === undefined) {

		return res.status(400).json({
			success: false,
			message: `Usage: eventName=name&eventCategory=category`
		})
	}

	db.child(events + "/" + eventCategory + "/" + eventName).once('value')
	.then((snapshot) => {

		if(snapshot.val() === null) {
			return res.status(400).json({
				success: false,
				message: `${eventName} in ${eventCategory} doesn't exist`
			})
		}

		db.child(users).once('value')
		.then((snapshot) => {

			let allUsers = snapshot.val();

			let data = {};
			data["users"] = new Array();

			for(user in allUsers) {

				if(allUsers[user][registeredEvents] === undefined) {
					continue;
				}

				if(allUsers[user][registeredEvents][eventCategory] === undefined) {
					continue;
				}
				if(allUsers[user][registeredEvents][eventCategory].indexOf(eventName) !== -1) {
					data["users"].push(allUsers[user]);
				}

			}

			return res.status(200).json({
				data: data,
				success: true
			})
		})
		.catch(() => {

			res.status(500).json({
				success: false,
				message: `error fetching users node`
			})
		})

		return true;
	})
	.catch(() => {
		res.status(500).json({
			success: false,
			message: "could not see events. internal error"
		})
	})


}





function matchEventDescription(database, data) {


	return new Promise(function(resolve, reject) {

		db.child(eventDescription).once('value')
		.then((snap) => {

			let eventsDes = snap.val();

			for(let category in database)
			{
				let arrLen = database[category].length;
				data[category] = new Array();

				for(let event = 0 ; event < arrLen ; event++)
				{
					// event is single events registered by user in category = category
					let userEvent = database[category][event];
					let eventDetails = eventsDes[category][userEvent];

					data[category].push(eventDetails);
				}
			}
			return resolve(data);

		})
		.catch((err) => {

			console.log("error: ", err);		// have to add
												// deploy shows error - error needs to be handled
												data = {
													success: false,
													message: `coould not fetch event description`
												};

												return reject(data);
											})

	})
}


function getRegisteredEvents(req, res)
{
	let email = req.body.email;

	db.child(users + "/" + email + "/" + registeredEvents).once('value')
	.then((snapshot) => {

		let database = snapshot.val();
		let data = {};

		return matchEventDescription(database, data)
		.then((data) => {
			return res.status(200).json({
				success: true,
				data: data
			});
		})
		.catch((errData) => {
			return res.json(errData);
		})
	})
	.catch(() => {

		res.status(400).json({
			success: false,
			message: `Error while fetching user registered events`
		})
	})
}


















//send time stamp of the server
function getTimestamp(req, res) {

	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify({
		timestamp: Date.now()
	}));
}











// registeredEvents
// {
// 	managerial: ["a", "b"],
// 	programming: ["a", "b"]
// }
// register user for a events
function eventRegister(request, response)
{

	let eventName = request.query.eventName;
	let eventCategory = request.query.eventCategory;
	let email = request.body.email;

	let value;
	if(eventName === undefined || eventCategory === undefined) {

		let value = true;

		return response.status(400).json({
			success: false,
			message: `Invalid Parameters.\n Usage: eventName=event&eventCategory=category`
		})
	}
	else
	{
		value = false;
	}

	if(value === false)
	{
		// get previsouly registered events
		db.child(users + "/" + email + "/" + registeredEvents).once('value')
		.then((snapshot) => {

			let registeredEvent = snapshot.val();
			if(registeredEvent === undefined || registeredEvent === null)
			{
				registeredEvent = {};
			}

			// if not registred any events in that category
			if(registeredEvent[eventCategory] === undefined)
			{
				// create array fro category
				registeredEvent[eventCategory] = new Array();
				// push event into that category
				registeredEvent[eventCategory].push(eventName);
			}
			else
			{
				// if category already exists
				// push event to that category

				// if event already registered
				if(registeredEvent[eventCategory].indexOf(eventName) === -1)
				{
					registeredEvent[eventCategory].push(eventName);
				}
				else
				{
					return response.send({
						success: false,
						message: `already registered for ${eventName}`
					})
				}
			}

			// update user registered events
			return db.child(users + "/" + email).update({
				"registeredEvents": registeredEvent
			})
			.then(() => {
				return response.json({
					success:true,
					status: `Successfully registered for ${eventName}`
				});
			})
			.catch(() => {
				return response.json({
					success:false,
					message: "could not register!",
					error: err
				});
			})
		})
		.catch(() => {

			return response.json({
				success:false,
				message: "could not fetch user registered events",
				error: err
			});
		})
	}



}




//return eventName
// {
// 	"managerial": ["a", "b"],
// 	"programming" : ["a","b"]
// }

function getEventNames(req, res)
{

	//optional - eventCategory

	if(req.query.eventCategory === undefined) {

		return db.child(events).once('value')
		.then((snapshot) => {

			var database = snapshot.val();

			var data = {};
			for(var category in database)
			{
				data[category] = new Array();
				for(let event in database[category])
				{

					let eventName = database[category][event].eventName;
					data[category].push(eventName);
				}
			}
			var success = true;
			// res.set('Cache-Control', 'public, max-age=18000 , s-maxage=18000');
			return res.json({success:success,data:data});
		})
	}
	else {

		let category = req.query.eventCategory;

		let node = events + "/" + category;

		return db.child(node).once('value')
		.then((snapshot) => {

			//console.log(snapshot.val());
			let database = snapshot.val();
			if(database === null)
			{
				return res.json({
					success: false,
					message:`${category} category doesn't exist`
				});
			}

			let data = {};
			data[category] = new Array();

			for(let event in database)
			{
				data[category].push(database[event].eventName);
			}

			var success = true;
			// res.set('Cache-Control', 'public, max-age=18000 , s-maxage=18000');
			return res.json({success:success,data:data});
		})
	}
}

// {
// 	categories: ["a", "b"]
// }
// returns json object with array of categories
function getCategories(req, res) {
	return db.child(events).once('value')
	.then((snapshot) => {

		var data = {categories : []}
		for(var i in snapshot.val())		// get each category
		{
			let category = i;
			data.categories.push(category);
		}
		message = "Categories received";
		success = true;
		// res.set('Cache-Control', 'public, max-age=18000 , s-maxage=18000');
		return res.json({message:message,success:success,data:data});
	})
	.catch((err) => {
		return res.send({
			success: false,
			message: `Error occured while sending categories\n Error: ${err}`
		});
	})
}

// to add a new events from the admin panel
function addEvent(req, res) {

	let eventData = req.body.eventData;	// accepts JSON event data
	// {
	// 	eventName: "string",
	// 	startTime: "string",
	// 	endTime: "string"
	//  category: "string"
	// 	others: "string"
	// }

	if(eventData === undefined) {

		return res.json({
			success: false,
			message: `Send event data as json data in $eventData`
		})
	}

	// adding event to timeline
	// name, startTime and endTime
	db.child(`${events}/${eventData.category}/${eventData.eventName}`).set({

		eventName : eventData.eventName,
		startTime : eventData.startTime,
		endTime : eventData.endTime
	})
	.then((snapshot) => {
		return console.log(`Added ${eventData.eventName} to timeline succesfully`);
	}).catch((err) => {
		return res.send({
			success: false,
			message: `Error occured while adding event to the timeline\nError : ${err}`
		});
	})

	// adding event with full description to the node
	// with all the json data received



	let eventCategory =  eventData.category;
	delete eventData.category;

	db.child(`${eventDescription}/${eventCategory}/${eventData.eventName}`).set(eventData)
	.then((snapshot) => {

		console.log(`Added ${eventData.eventName} successfully`);

		return res.send({
			success: true,
			message: `Added ${eventData.eventName} successfully`
		});
	}).catch((err) => {
		return res.send({
			success: false,
			message: `Error occured when adding events to the description node\nError : ${err}`
		});
	})

}

// returns events description for single event
// or all the events of one category
function getEventDescription(req, res) {

	//	compulsory
	let categoryName = req.query.eventCategory;
	// optional parameter
	let eventName = req.query.eventName;

	if(categoryName === undefined)
	{
		return res.send({
			success: false,
			message: `Invalid Paramenters. \n Usage: eventCategory=category&[eventName=name]`
		});
	}

	if(eventName === undefined)
	{
		db.child(`${eventDescription}/${categoryName}`).once('value')
		.then((snapshot) => {

			if(snapshot.val() === null) {

				return res.send({
					success: false,
					message: `${categoryName} does't exist.`
				});
			}
			// res.set('Cache-Control', 'public, max-age=18000 , s-maxage=18000');
			return res.status(200).json({
				data: snapshot.val(),
				success: true
			});
		})
		.catch(() => {
			return res.json({
				success: false,
				message: `could not fetch description for category ${categoryName}`
			})
		})
	}
	else
	{
		db.child(`${eventDescription}/${categoryName}/${eventName}`).once('value')
		.then((snapshot) => {

			console.log(snapshot.val());

			if(snapshot.val() === null) {
				return res.send({
					success: false,
					message: `${eventName} in ${categoryName} doesn't exist.`
				});
			}
			// res.set('Cache-Control', 'public, max-age=18000 , s-maxage=18000');
			return res.status(200).json({
				data: snapshot.val(),
				success: true
			})
		})
		.catch((err) => {
			return res.send({
				error: true,
				message: `Error in getting events details.\n Error: ${err}`
			});
		})

	}

}
// returns events startTime, endTime and name
function getEventTimeline(req, res) {

	return db.child(events).once('value')
	.then((snapshot) => {
		let data=snapshot.val();
		// res.set('Cache-Control', 'public, max-age=18000 , s-maxage=18000');
		return res.json({
			success:true,
			data:data
		});
	})
	.catch((err) => {
		return res.send({
			success: false,
			message: `Error occured while getting events timeline\n Error : ${err}`
		})
	})

}















/*
*   /googleLogin
*   get:
*      params:
*           accessToken: string
*      description:
*           for user login
*      responses:
*           200:
*               description: user logged in
*               return:
*                   token: string
*           400:
*               description: error
*/
function googleLogin(req, response) {

	request(googleUrl + req.body.accessToken, {json: true}, (err, res, body) => {
		let data;
		if (err) {

			return res.status(400).json({success: false,err:err});
		}

		if (body.error !== undefined) {
			return response.status(401).json({
				message: "empty/invalid body received",
				error: 'unauthenticated request',
				success: false,
			});
		}

		let email1 = body.emails[0].value;
		let email = email1.replace(/\./g, ',');
		let email_child = "users/" + email;
		let ref = database.ref().child(email_child);

		ref.once('value', (snapshot) => {
			if (snapshot.val()) {
			/*	data = {
					onBoard: snapshot.val().onBoard,
					authenticatedRequest: true,
					isRegistered: true,
					body: body
				};*/

				const token = jwt.sign(body, config.key, {expiresIn: "12h"});
				data={token:token};
				return response.status(200).json({
					onBoard:snapshot.val().onBoard,
					success: true, data:data
				});
			}
			else {
				database.ref(email_child).set({
					onBoard: false,
					email: body.emails[0].value,
					name: body.name.givenName + " " + body.name.familyName,
				});
				/*data = {
					onBoard: false,
					authenticatedRequest: true,
					isRegistered: false,
					body: body
				};*/

				const token = jwt.sign(body, config.key, {expiresIn: "12h"});
				data={token:token};
				return response.status(200).json({
					onBoard:false,
					success: true, data:data
				});
			}
		});
	});

}










/*
*   /signUp
*   put:
*      body:
*           phone: Number
*           college: string
*           year: Number
*      description:
*           onboarding data
*      responses:
*           200:
*               description: data updated
*               return:
*                   status: boolean
*           400:
*               description: incomplete parameters
*           403:
*               description: user does not exist
*/
function signUp(req, response) {

	if (req.body.phone === undefined || req.body.college === undefined || req.body.year === undefined) {
		return response.status(400).json({
			success: false,err:'please pass valid/complete url parameters'
		});
	}
	else{
		let email = req.body.email;
		let ref = database.ref('users/'+email);

		ref.once('value', function (snapshot) {
			if(snapshot.val()===null || snapshot.val()===undefined){
				return response.status(403).json({
					success: false,
					err:'user does not exist'
				});

			}
			else if (snapshot.val().onBoard===false) {
				ref.update({
					onBoard: true,
					phone: req.body.phone,
					college: req.body.college,
					year: req.body.year,
				});
				return response.status(200).json({
					success: true,
					message:"user onboarded",
				});
			}
			else {

				return response.status(405).json({
					success:false,
					err:'not allowed, already onboarded'
				})

			}
		});
	}

}


// returns one new random fact everytime
function randomFact(request,response) {
	const numberOfLines = 8;
	const randomIndex = Math.floor(Math.random() * numberOfLines);
	database.ref('/facts/' + randomIndex).on('value',function(snapshot){
		console.log(snapshot.val());
		// response.set('Cache-Control', 'public, max-age=30000 , s-maxage=60000');
		let data={message:snapshot.val()};
		response.status(200).json({
			success:true,
			data:data
		});
	});
}


//<------Returning the array of all the videos------>
//Returns the array of videos containing title and url of a video.
function video(request,response) {

	return database.ref('/videos').once('value')
	.then((snapshot) => {
		// response.set('Cache-Control', 'public, max-age=300 , s-maxage=600');
		let data=snapshot.val();
		return response.status(200).json({success:true,data:data});
	})
	.catch((err) => {
		return response.send({
			success: false,
			message: `Error occured while fetching videos\n Error : ${err}`
		})
	})
}

// <-----Adding query to database------->
// only add newly asked query to the database, if query will be null then it will return the empty query message else query will be added to database.
function addQuery(request,response){
	const query = request.query.text;
	const email=request.body.email;

	console.log(email);
	console.log(query);

	const email_child='queries/'+email;
	if(query !== undefined)
	{
		database.ref().child(email_child).push(query);
		response.status(200).json({
			success:true,
			message : "query successfully added"
		});
	}
	else
	{
		response.status(400).json({
			success:false,
			message: "empty query"
		})
	}
}

// returns query to admin 
function getQuery(req, res) {

	db.child(queries).once('value')
	.then(function (snapshot) {

		let userQueries = snapshot.val();

		let data = {};
		for(user in userQueries) {

			email = user.replace(/,/g, '.');

			data[email] = new Array();

			for(query in userQueries[user]) {

				console.log(email, userQueries[user][query]);
				data[email].push(userQueries[user][query]);
			}
		}

		return res.status(200).json({
			success: true,
			data: data
		});
	})
	.catch(() => {

		return res.status(500).json({
			error: "error getting queries",
			success: false
		})
	})

}

exports.api = functions.https.onRequest(app);