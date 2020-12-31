chords.onscroll = function() {
	if (preview.isScrolling) preview.isScrolling = false;
	else {
		preview.scrollTop = this.scrollTop / this.scrollHeight * preview.scrollHeight;
		chords.isScrolling = true;
	}
};
preview.onscroll = function() {
	if (chords.isScrolling) chords.isScrolling = false;
	else {
		chords.scrollTop = this.scrollTop / this.scrollHeight * chords.scrollHeight;
		preview.isScrolling = true;
	}
};
if (chords.value) chords.oninput();

// ------------------------------

var form = document.forms[0];
var loading = document.getElementById("loading");
var btnPlay = document.getElementById("play");
var btnPause = document.getElementById("pause");
var btnStop = document.getElementById("stop");

var currState = "loading"; // loading, ready, playing, paused

var synths = {}, synth;

SampleLibrary.baseUrl = "tonejs-instruments-master/samples/";
form.instrument.onchange = function() {
	var name = this.value;
	if (name in synths) {
		if (synth) synth.releaseAll();
		synth = synths[name];
	} else {
		loading.style.display = "block";
		var half = SampleLibrary.load({
			instruments: name,
			minify: true,
			onload: function() {
				loading.style.display = "none";
				if (currState == "loading") {
					currState = "ready";
					setEnabled(true, false, false, true);
				}
				if (synth) synth.releaseAll();
				synth = synths[name] = half;
				var full = SampleLibrary.load({
					instruments: name,
					onload: function() {
						if (synth) synth.releaseAll();
						synth = synths[name] = full;
					}
				}).toMaster();
			}
		}).toMaster();
	}
};
form.instrument.onchange();
form.bpm.oninput = function() {
	Tone.Transport.bpm.value = +this.value;
	duration.textContent = displayTime(Tone.Transport.loopEnd);
};
form.beat.oninput = function() {
	Tone.Transport.timeSignature = +this.value;
	chords.oninput();
};
form.loop.onclick = function() {
	Tone.Transport.loop = this.checked;
};
Tone.Transport.loop = true;
var swing_val = document.getElementById("swing_val");
form.swing.oninput = form.swing.onchange = function() {
	Tone.Transport.swing = (this.value / 2 - 1) / 4;
	swing_val.innerText = (this.value & 1) ? this.value + ":2" : (this.value >>> 1) + ":1";
};
form.swing_division.onchange = function() {
	Tone.Transport.swingSubdivision = this.value;
};
form.volume.oninput = form.volume.onchange = function() {
	Tone.Master.volume.value = Tone.gainToDb(+this.value);
};
var metronomes = new Tone.Players({
	down1: "metronome-1-down.mp3",
	beat1: "metronome-1-beat.mp3",
	down2: "metronome-2-down.mp3",
	beat2: "metronome-2-beat.mp3",
	down3: "metronome-3-down.mp3",
	beat3: "metronome-3-beat.mp3",
}).toMaster();
form.metronome_vol.oninput = form.metronome_vol.onchange = function() {
	metronomes.volume.value = Tone.gainToDb(this.value * 4.5);
};
form.metronome_vol.oninput();
var metronomeEvent;
form.metronome.onchange = function() {
	if (metronomeEvent) {
		metronomeEvent.cancel().dispose();
		metronomeEvent = null;
	}
	if (+this.value) {
		var fileArray = ["down" + this.value];
		for (var i = 1; i < +form.beat.value; i++) fileArray[i] = "beat" + this.value;
		metronomeEvent = new Tone.Sequence(function(time, file) {
			metronomes.get(file).restart(time);
		}, fileArray).start(0);
	}
};

// Main Program
var prevBeat, barsEvent, prevAllBeat, repeatingNode;
var current = document.getElementById("current");
var duration = document.getElementById("duration");
btnPlay.onclick = function() {
	if (currState == "ready") {
		prevBeat = prevAllBeat = repeatingNode = null;
		Tone.Transport.loopEnd = bars.length + "m";
		barsEvent = [];
		for (var i = 0; i < bars.length; i++) barsEvent[i] = (
			bars[i] instanceof Beat
				? bars[i].data < 0
					? new Tone.Event()
					: new Tone.Event(function(time, repeatNode) {
						repeatingNode = repeatNode;
						repeatNode.className = "repeating";
					}, bars[i].node).start(i + "m")
					&& new Tone.Event(function(time, repeatNode) {
						repeatingNode = null;
						repeatNode.className = "";
					}, bars[i].node).start(i + 1 + "m")
					&& barsEvent[bars[i].data]
				: new Tone.Sequence(function(time, beat) {
					if (prevAllBeat && prevAllBeat.node) prevAllBeat.node.firstChild.className = "";
					if (prevBeat && prevBeat.node) prevBeat.node.firstChild.className = "";
					if (repeatingNode) repeatingNode.className = "repeating";
					beat.node.firstChild.className = "highlighted";
					prevAllBeat = beat;
					if (beat.data == "=") {
						if (prevBeat && prevBeat.node) prevBeat.node.firstChild.className = "shaded";
					} else {
						if (prevBeat) synth.triggerRelease(prevBeat.data.voicing, time);
						if (beat.data == "%") {
							if (prevBeat) {
								if (prevBeat.node) prevBeat.node.firstChild.className = "shaded";
								synth.triggerAttack(prevBeat.data.voicing, time);
							}
						} else if (beat.data != "_") {
							prevBeat = beat;
							synth.triggerAttack(beat.data.voicing, time);
						}
					}
				}, [bars[i]], "1m")
			).start(i + "m").stop(i + 1 + "m");
		Tone.Transport.schedule(function() {
			if (!Tone.Transport.loop) btnStop.onclick();
		}, bars.length + "m");
		duration.textContent = displayTime(Tone.Transport.loopEnd);
	}
	Tone.Transport.start();
	currState = "playing";
	setEnabled(false, true, true, false);
	seekToTime();
};
btnPause.onclick = function() {
	if (synth) synth.releaseAll();
	Tone.Transport.pause();
	currState = "paused";
	cancelAnimationFrame(requestID);
	setEnabled(true, false, true, false);
};
btnStop.onclick = function() {
	if (synth) synth.releaseAll();
	Tone.Transport.stop().cancel();
	if (prevAllBeat && prevAllBeat.node) prevAllBeat.node.firstChild.className = "";
	if (prevBeat && prevBeat.node) prevBeat.node.firstChild.className = "";
	if (repeatingNode) repeatingNode.className = "";
	form.metronome.onchange();
	currState = "ready";
	cancelAnimationFrame(requestID);
	current.textContent = "0:00.00";
	form.seekbar.value = 0;
	setEnabled(true, false, false, true);
};
function setEnabled(play, pause, stop, others) {
	btnPlay.disabled = !play;
	btnPause.disabled = !pause;
	btnStop.disabled = !stop;
	form.chords.disabled = form.beat.disabled = !others;
	form.seekbar.disabled = others;
}

// seekbar

var requestID;
function seekToTime() {
	form.seekbar.value = Tone.Transport.seconds / Tone.Transport.loopEnd;
	current.textContent = displayTime(Tone.Transport.seconds);
	requestID = requestAnimationFrame(seekToTime);
}
function displayTime(time) {
	return ~~(time / 60) + ":" + ((time %= 60) < 10 ? "0" : "") + time.toFixed(2);
}
var dragWhenPlay = false, seeked = false;
form.seekbar.oninput = form.seekbar.onchange = function() {
	if (seeked) {
		seeked = false;
		return;
	}
	if (currState != "paused") {
		btnPause.onclick();
		setEnabled(false, false, false, false);
		dragWhenPlay = true;
	}
	Tone.Transport.seconds = form.seekbar.value * Tone.Transport.loopEnd;
	current.textContent = displayTime(Tone.Transport.seconds);
};
form.seekbar.onmouseup = function() {
	if (dragWhenPlay) {
		btnPlay.onclick();
		dragWhenPlay = false;
		seeked = true;
		if (repeatingNode) repeatingNode.className = "";
	}
};