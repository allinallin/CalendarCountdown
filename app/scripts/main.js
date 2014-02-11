'use strict';

/**
 * Shorthand console.log(), warn(), error() with a toggle
 */
window.logEnabled = true;
window.log = ((window.console && window.console.log && window.logEnabled) ?
              console.log.bind(console) : function(){});
window.warn = ((window.console && window.console.warn && window.logEnabled) ?
              console.warn.bind(console) : function(){});
window.error = ((window.console && window.console.error && window.logEnabled) ?
              console.error.bind(console) : function(){});

var app = app || {};

function oauthCallback(e) {
	app.oauth.callback(e);
}

/**
 * Authentication functions
 */
app.oauth = (function() {
	function oauthCallback(data) {
		if (data.status.signed_in) {
			app.calendar.getCalendars();
			toggleButtons('signout');
		} else if (data.error === 'user_signed_out') {
			log('signed out');
			toggleButtons('signin');
			app.calendar.clearData();
		} else if (data.error) {
			error('google sign in error');
			toggleButtons('signin');
			app.calendar.clearData();
		}
	}

	function signOut() {
		gapi.auth.signOut();
	}

	function toggleButtons(newButton) {
		var signin = document.getElementById('signinButton'),
			signout = document.getElementById('signoutButton'),
			activeBtn = (newButton === 'signin') ? signin : signout,
			disabledBtn = (newButton === 'signin') ? signout : signin;
		
		activeBtn.setAttribute('class', 'active');
		disabledBtn.setAttribute('class', 'disabled');
	}

	return {
		callback: function(e) {
			oauthCallback(e);
		},
		signOut: function(e) {
			signOut(e);
		}
	};
})();

/**
 * Google Calendar functions
 */
app.calendar = (function() {
	var calendarsCache = [],
		eventsCache = [],
		init = false;
	
	function clearData() {
		var calendarsCache = [],
			eventsCache = [];

		document.querySelector('select').innerHTML = '';
		document.querySelector('select').removeAttribute('size');
		document.querySelector('h3').innerHTML = '';
		document.querySelector('ol').innerHTML = '';
	}

	function getCalendars() {
		var restRequest = gapi.client.request({
		  'path': '/calendar/v3/users/me/calendarList'
		});

		restRequest.execute(function(data) {
			populateCalendarList(data.items);
		});
	}

	function populateCalendarList(calendars) {
		var list = document.querySelector('.calendars select');

		list.innerHTML = '';
		calendarsCache = [];
		eventsCache = [];

		for (var i = calendars.length - 1; i >= 0; i--) {
			var name = calendars[i].summary,
				id = calendars[i].id,
				bgColor = calendars[i].backgroundColor,
				fontColor = calendars[i].foregroundColor,
				child = document.createElement('option');

			child.setAttribute('value', i);
			child.innerHTML = name;
			calendarsCache[i] = id;

			list.appendChild(child);
		}

		list.setAttribute('size', calendars.length);
		
		if (!init) {
			list.addEventListener('change', function() {
				app.countdown.destroy();
				getEvents(parseInt(this.value));
			}, false);
		}
	}

	function getEvents(calendarIndex) {
		var calendarId = calendarsCache[calendarIndex],
			restRequest = gapi.client.request({
			  'path': '/calendar/v3/calendars/'+calendarId+'/events',
			  'params': {
					'maxResults': 3,
					'timeMin': new Date().toJSON(),
					'singleEvents': true,
					'orderBy': 'startTime'
			  }
			}),
			heading = document.querySelector('.events h3');

		restRequest.execute(function(data) {
			populateEventList(data.items);
			heading.innerHTML = data.summary || '';
		});
	}

	function populateEventList (events) {
		var list = document.querySelector('.events ol');

		list.innerHTML = '';
		eventsCache = [];
		
		if (typeof events === 'undefined') {
			list.innerHTML = 'Error fetching data from calendar. Is it a contacts, holidays, or weather-related one? That might be too special.';
			return;
		}

		for (var i = events.length - 1; i >= 0; i--) {
			var name = events[i].summary,
				id = events[i].id,
				date = events[i].start.dateTime,
				date = (date) ? date : events[i].start.date.replace('-','/'),
				dateObj = new Date(date),
				li = document.createElement('li');

			li.innerHTML = name + ' starts on ' + dateObj;
			eventsCache.push(events[i]);

			list.appendChild(li);
		}

		if (!eventsCache.length) {
			list.innerHTML = 'No future events in this calendar.';
		} else {
			app.countdown.start(eventsCache[0]);
		}
	}

	return {
		getCalendars: function() {
			getCalendars();
		},
		getEvents: function(e) {
			getEvents(e);
		},
		clearData: clearData
	};
})();

app.countdown = (function() {
	var daysElm = document.querySelector('.countdown .days'),
		hoursElm = document.querySelector('.countdown .hours'),
		minutesElm = document.querySelector('.countdown .minutes'),
		secondsElm = document.querySelector('.countdown .seconds'),
		oneDay = 86400000,
		oneHour = 3600000,
		oneMinute = 60000,
		oneSecond = 1000,
		interval = null,
		later = null,
		heading = document.querySelector('.countdown h3');

	function refreshCountdown() {
		var now = new Date(),
			timeLeft = later.getTime() - now.getTime(),
			days = Math.floor( timeLeft / oneDay ),
			hours = Math.floor( (timeLeft % oneDay) / oneHour ),
			minutes = Math.floor( (timeLeft % oneDay % oneHour) / oneMinute ),
			seconds = Math.floor( (timeLeft % oneDay % oneHour % oneMinute) / oneSecond ),
			output = days+':'+hours+':'+minutes+':'+seconds;

		daysElm.innerHTML = (days.toString().length === 1) ? '0' + days : days;
		hoursElm.innerHTML = (hours.toString().length === 1) ? '0' + hours : hours;
		minutesElm.innerHTML = (minutes.toString().length === 1) ? '0' + minutes : minutes;
		secondsElm.innerHTML = (seconds.toString().length === 1) ? '0' + seconds : seconds;
	}

	function startCountdown(event) {
		var date = event.start.dateTime,
				date = (date) ? date : events.start.date.replace('-','/');

		if (interval) {
			clearInterval(interval);
		}

		later = new Date(date);
		heading.innerHTML = event.summary;

		interval = setInterval(refreshCountdown, 100);
	}

	function destoryCountdown() {
		if (interval) {
			clearInterval(interval);
		}

		heading.innerHTML = '';
		daysElm.innerHTML = '00';
		hoursElm.innerHTML = '00';
		minutesElm.innerHTML = '00';
		secondsElm.innerHTML = '00';
	}

	return {
		start: function(e) {
			startCountdown(e);
		},
		destroy: destoryCountdown,
		refresh: refreshCountdown,
		interval: interval
	};
})();