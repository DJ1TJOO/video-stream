var containerVideo = document.querySelector('.c-video');
var video = document.querySelector('.video');
var loadingBarThumb = document.querySelector('.loading-bar-thumb');
var loadingBar = document.querySelector('.loading-bar');
var playPauseBtn = document.getElementById('play-pause');
var skipForwardBtn = document.getElementById('skip-forward');
var skipBackwardBtn = document.getElementById('skip-backward');
var fullscreenBtn = document.getElementById('fullscreen');
var volumeBtn = document.getElementById('volume');
var volumeBarThumb = document.querySelector('.volume-slider-thumb');
var volumeBar = document.querySelector('.volume-slider');
var volumeBarBackground = document.querySelector('.volume-slider-background');
var title = document.getElementById('title');
var backBtn = document.getElementById('back');
var center = document.getElementById('center');
var action = document.getElementById('action');
var time = document.getElementById('time');
var videoJson = null;

var actionAnimate = () => {
	action.animate(
		[
			// keyframes
			{ color: 'rgba(255, 255, 255, 0)' },
			{ color: 'rgba(255, 255, 255, 0.7)' },
			{ color: 'rgba(255, 255, 255, 0)' },
		],
		{
			// timing options
			duration: 500,
			easing: 'ease-in-out',
		},
	);
};

var volumeAdd = (add) => {
	video.volume = Math.min(Math.max(video.volume + add, 0), 1);
};

var fullscreenToggle = () => {
	var isInFullScreen =
		(document.fullscreenElement && document.fullscreenElement !== null) ||
		(document.webkitFullscreenElement && document.webkitFullscreenElement !== null) ||
		(document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
		(document.msFullscreenElement && document.msFullscreenElement !== null);

	if (!isInFullScreen) {
		if (containerVideo.requestFullscreen) {
			containerVideo.requestFullscreen();
		} else if (containerVideo.mozRequestFullScreen) {
			/* Firefox */
			containerVideo.mozRequestFullScreen();
		} else if (containerVideo.webkitRequestFullscreen) {
			/* Chrome, Safari & Opera */
			containerVideo.webkitRequestFullscreen();
		} else if (containerVideo.msRequestFullscreen) {
			/* IE/Edge */
			containerVideo.msRequestFullscreen();
		}
	} else {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.msExitFullscreen) {
			document.msExitFullscreen();
		}
	}
};

var settedTime = false;

$(document).ready(function () {
	var id = window.location.href.substring(window.location.href.lastIndexOf('/') + 1);
	$.getJSON('/videos/info/' + id, function (dataJson) {
		videoJson = JSON.parse(dataJson);
		video.setAttribute('type', 'video/mp4');
		video.setAttribute('src', '/video/' + id);
		video.addEventListener(
			'loadeddata',
			function () {
				video.style.marginTop = document.documentElement.scrollHeight / 2 - video.clientHeight / 2 + 'px';
				title.innerText = `${videoJson.title} (${videoJson.year})`;
				if (video.volume >= 0 && video.volume <= 0.01) {
					volumeBtn.className = 'mute';
				} else if (video.volume > 0.01 && video.volume <= 0.33) {
					volumeBtn.className = 'down';
				} else if (video.volume > 0.33 && video.volume <= 0.66) {
					volumeBtn.className = 'volume';
				} else if (video.volume > 0.66 && video.volume <= 1) {
					volumeBtn.className = 'up';
				}
				volumeBarThumb.style.height = video.volume * 100 + '%';
				var curhours = Math.floor(video.currentTime / 3600);
				var curmins = Math.floor((video.currentTime - curhours * 3600) / 60);
				var cursecs = Math.floor(video.currentTime - curmins * 60);
				var durhours = Math.floor(video.duration / 3600);
				var durmins = Math.floor((video.duration - durhours * 3600) / 60);
				var dursecs = Math.floor(video.duration - durmins * 60);
				if (cursecs < 10) {
					cursecs = '0' + cursecs;
				}
				if (dursecs < 10) {
					dursecs = '0' + dursecs;
				}
				if (curmins < 10) {
					curmins = '0' + curmins;
				}
				if (durmins < 10) {
					durmins = '0' + durmins;
				}
				if (curhours < 10) {
					curhours = '0' + curhours;
				}
				if (durhours < 10) {
					durhours = '0' + durhours;
				}
				time.innerText = curhours + ':' + curmins + ':' + cursecs + '/' + durhours + ':' + durmins + ':' + dursecs;
				video.addEventListener(
					'canplay',
					function () {
						if (videoJson.hasOwnProperty('time') && !settedTime) {
							video.currentTime = videoJson.time;
							settedTime = true;
						} else {
							settedTime = true;
						}
					},
					false,
				);
			},
			false,
		);
	});
});

var back = () => {
	window.history.back();
};

var fullscreenEvent = () => {
	var isInFullScreen =
		(document.fullscreenElement && document.fullscreenElement !== null) ||
		(document.webkitFullscreenElement && document.webkitFullscreenElement !== null) ||
		(document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
		(document.msFullscreenElement && document.msFullscreenElement !== null);
	if (isInFullScreen) {
		fullscreenBtn.className = 'small';
	} else {
		fullscreenBtn.className = 'full';
	}
	video.style.marginTop = document.documentElement.clientHeight / 2 - video.clientHeight / 2 + 'px';
};

var togglePlayPause = () => {
	if (video.paused) {
		playPauseBtn.className = 'pause';
		action.innerHTML = '&#xf04c;';
		video.play();
	} else {
		playPauseBtn.className = 'play';
		action.innerHTML = '&#xf04b;';
		video.pause();
	}
	actionAnimate();
};

var toggleVolumeSlider = () => {
	if (volumeBarBackground.style.display == 'none') {
		volumeBarBackground.style.display = 'block';
	} else {
		volumeBarBackground.style.display = 'none';
	}
};

var skipForward = () => {
	video.currentTime = video.currentTime + 10;
	action.innerHTML = '&#xf2f9;';
	actionAnimate();
};

var skipBackward = () => {
	video.currentTime = video.currentTime - 10;
	action.innerHTML = '&#xf2ea;';
	actionAnimate();
};

playPauseBtn.onclick = () => {
	togglePlayPause();
};

skipForwardBtn.onclick = () => {
	skipForward();
};

skipBackwardBtn.onclick = () => {
	skipBackward();
};

fullscreenBtn.onclick = () => {
	fullscreenToggle();
};

backBtn.onclick = () => {
	back();
};

volumeBtn.onclick = () => {
	toggleVolumeSlider();
};

var loadingBarClick = (e) => {
	e = e || window.event;
	var x = e.pageX - loadingBar.getBoundingClientRect().left;
	var clickedValue = (x * 100) / loadingBar.offsetWidth;
	video.currentTime = (video.duration / 100) * clickedValue;
};

loadingBar.onclick = (e) => {
	loadingBarClick(e);
};

let loadingBarMouseDown = false;
loadingBar.onmousedown = (e) => {
	loadingBarMouseDown = true;
};
loadingBar.onmouseup = (e) => {
	loadingBarMouseDown = false;
};
loadingBar.onmouseleave = (e) => {
	loadingBarMouseDown = false;
};
loadingBar.onmousemove = (e) => (loadingBarMouseDown ? loadingBarClick(e) : null);

var volumeBarClick = (e) => {
	e = e || window.event;
	var y = e.clientY - volumeBar.getBoundingClientRect().top;
	var clickedValue = 100 - (y * 100) / volumeBar.offsetHeight;
	clickedValue = Math.min(Math.max(clickedValue, 0), 100);
	video.volume = parseFloat(clickedValue / 100);
};

volumeBar.onclick = (e) => {
	volumeBarClick(e);
};

let volumeBarMouseDown = false;
volumeBar.onmousedown = (e) => {
	volumeBarMouseDown = true;
};
volumeBar.onmouseup = (e) => {
	volumeBarMouseDown = false;
};
volumeBar.onmouseleave = (e) => {
	volumeBarMouseDown = false;
};
volumeBar.onmousemove = (e) => (volumeBarMouseDown ? volumeBarClick(e) : null);

video.onclick = () => {
	togglePlayPause();
};

center.onclick = () => {
	togglePlayPause();
};

video.addEventListener('timeupdate', () => {
	var loadingBarPos = video.currentTime / video.duration;
	loadingBarThumb.style.width = loadingBarPos * 100 + '%';
	var curhours = Math.floor(video.currentTime / 3600);
	var curmins = Math.floor((video.currentTime - curhours * 3600) / 60);
	var cursecs = Math.floor(video.currentTime - curmins * 60 - curhours * 3600);
	var durhours = Math.floor(video.duration / 3600);
	var durmins = Math.floor((video.duration - durhours * 3600) / 60);
	var dursecs = Math.floor(video.duration - durmins * 60 - durhours * 3600);
	if (cursecs < 10) {
		cursecs = '0' + cursecs;
	}
	if (dursecs < 10) {
		dursecs = '0' + dursecs;
	}
	if (curmins < 10) {
		curmins = '0' + curmins;
	}
	if (durmins < 10) {
		durmins = '0' + durmins;
	}
	if (curhours < 10) {
		curhours = '0' + curhours;
	}
	if (durhours < 10) {
		durhours = '0' + durhours;
	}
	time.innerText = curhours + ':' + curmins + ':' + cursecs + '/' + durhours + ':' + durmins + ':' + dursecs;
});

const interval = setInterval(function () {
	$.post('/watched/' + videoJson.id + '/' + video.currentTime + '/' + video.duration, {}, function (data, status) {
		//alert("Data: " + data + "\nStatus: " + status);
	});
}, 10000);

video.addEventListener('volumechange', () => {
	if (!video.muted) {
		volumeBarThumb.style.height = video.volume * 100 + '%';
		if (video.volume >= 0 && video.volume <= 0.01) {
			volumeBtn.className = 'mute';
			action.innerHTML = '&#xf6a9;';
			actionAnimate();
		} else if (video.volume > 0.01 && video.volume <= 0.33) {
			volumeBtn.className = 'down';
			action.innerHTML = '&#xf026;';
			actionAnimate();
		} else if (video.volume > 0.33 && video.volume <= 0.66) {
			volumeBtn.className = 'volume';
			action.innerHTML = '&#xf027;';
			actionAnimate();
		} else if (video.volume > 0.66 && video.volume <= 1) {
			volumeBtn.className = 'up';
			action.innerHTML = '&#xf028;';
			actionAnimate();
		}
	}
});
document.onkeyup = function (e) {
	if (e.which == 32) {
		playPauseBtn.click();
	} else if (e.which == 39) {
		//right
		skipForwardBtn.click();
	} else if (e.which == 37) {
		//left
		skipBackwardBtn.click();
	} else if (e.which == 38) {
		//up
		volumeAdd(0.025);
	} else if (e.which == 40) {
		//down
		volumeAdd(-0.025);
	} else if (e.which == 70) {
		//f
		fullscreenToggle();
	} else if (e.which == 77) {
		//m
		if (video.muted) {
			video.muted = false;
			volumeBtn.className = 'up';
			action.innerHTML = '&#xf028;';
			actionAnimate();
		} else {
			video.muted = true;
			volumeBtn.className = 'mute';
			action.innerHTML = '&#xf6a9;';
			actionAnimate();
		}
	}
	volumeBarBackground.style.display = 'none';
};

$(document).mouseup(function (e) {
	// if the target of the click isn't the container nor a descendant of the container
	var container = $('#volume-slider-background');

	if (!container.is(e.target) && container.has(e.target).length === 0) {
		volumeBarBackground.style.display = 'none';
	}
});

document.addEventListener('fullscreenchange', fullscreenEvent, false);
document.addEventListener('mozfullscreenchange', fullscreenEvent, false);
document.addEventListener('MSFullscreenChange', fullscreenEvent, false);
document.addEventListener('webkitfullscreenchange', fullscreenEvent, false);

//mouse hide
var timeout;
var isHidden = false;

document.addEventListener('mousemove', magicMouse);

function magicMouse() {
	if (timeout) {
		clearTimeout(timeout);
	}
	timeout = setTimeout(function () {
		document.querySelector('body').style.cursor = 'none';
		document.querySelector('body').style.pointerEvents = 'none';
		containerVideo.style.cursor = 'none';
		containerVideo.style.pointerEvents = 'none';
		$('*').css('cursor', 'none');
		$('*').css('pointerEvents', 'none');
		isHidden = true;
	}, 5000);
	if (isHidden) {
		document.querySelector('body').style.cursor = 'auto';
		document.querySelector('body').style.pointerEvents = 'auto';
		containerVideo.style.cursor = 'auto';
		containerVideo.style.pointerEvents = 'auto';
		$('*').css({ cursor: '' });
		$('*').css('pointerEvents', 'auto');
		isHidden = false;
	}
}
