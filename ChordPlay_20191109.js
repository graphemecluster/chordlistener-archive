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
var isDownbeat = [true];
for (var q = 1; q < 64; q++) isDownbeat[q] = false;
// Main Program
var barsEvent, prevHighlighted, prevShaded, prevRepeating;
function resetHighlight() {
	if (prevHighlighted) {prevHighlighted.className = ""; prevHighlighted = null;}
	if (prevShaded) {prevShaded.className = ""; prevShaded = null;}
	if (prevRepeating) {prevRepeating.className = ""; prevRepeating = null;}
}
var prepared = false;
function preperation() {
	if (currState == "ready" && !prepared) {
		barsEvent = [];
		for (var i = 0; i < bars.length; i++) {
			barsEvent[i] = (
				bars[i] instanceof Beat
					? bars[i].data
						? new Tone.Sequence((function(repeatingNode) {
							return function(time, beat) {
								resetHighlight();
								if (beat.node) (prevHighlighted = beat.node).className = "highlighted";
								if (beat.grey) (prevShaded = beat.grey).className = "shaded";
								(prevRepeating = repeatingNode).className = "repeating";
								Tone.Transport.bpm.setValueAtTime(beat.bpm, time);
								if (beat.data != "=") {
									synth.releaseAll(time);
									if (beat.data != "_") synth.triggerAttack(beat.data.voicing, time);
								}
							}
						})(bars[i].node), [bars[i].data], "1m")
						: new Tone.Sequence((function(repeatingNode) {
							return function() {
								resetHighlight();
								(prevRepeating = repeatingNode).className = "repeating";
							}
						})(bars[i].node), [true], "1m")
					: new Tone.Sequence(function(time, beat) {
						resetHighlight();
						if (beat.node) (prevHighlighted = beat.node).className = "highlighted";
						if (beat.grey) (prevShaded = beat.grey).className = "shaded";
						Tone.Transport.bpm.setValueAtTime(beat.bpm, time);
						if (beat.data != "=") {
							synth.releaseAll(time);
							if (beat.data != "_") synth.triggerAttack(beat.data.voicing, time);
						}
					}, [bars[i]], "1m")
			).start(i + "m").stop(i + 1 + "m");
			new Tone.Sequence(function(time, down) {
				if (+form.metronome.value) metronomes.get((down ? "down" : "beat") + form.metronome.value).restart(time);
			}, [isDownbeat.slice(0, bars[i].data && bars[i].data.beat || bars[i].beat)], "1m").start(i + "m").stop(i + 1 + "m");
		}
		Tone.Transport.schedule(function() {
			if (!Tone.Transport.loop) btnStop.onclick();
		}, bars.length + "m");
		prepared = true;
	}
}
btnPlay.onclick = function() {
	preperation();
	Tone.Transport.start();
	currState = "playing";
	setEnabled(false, true, true, false);
	requestAnimationFrame(seekToTime);
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
	resetHighlight();
	currState = "ready";
	cancelAnimationFrame(requestID);
	current.textContent = "1.000";
	form.seekbar.value = 0;
	setEnabled(true, false, false, true);
	prepared = false;
};
function setEnabled(play, pause, stop, chords) {
	btnPlay.disabled = !play;
	btnPause.disabled = !pause;
	btnStop.disabled = !stop;
	form.chords.disabled = !chords;
}

// seekbar

var requestID;
function seekToTime() {
	current.textContent = ((form.seekbar.value = Tone.Transport.ticks / Tone.Transport.PPQ / 4) + 1).toFixed(3);
	requestID = requestAnimationFrame(seekToTime);
}
var dragWhenPlay = false, seeked = false;
form.seekbar.oninput = form.seekbar.onchange = function() {
	if (seeked) {
		seeked = false;
		return;
	}
	if (currState == "playing") {
		btnPause.onclick();
		dragWhenPlay = true;
	} else {
		preperation();
		if (currState == "ready") dragWhenPlay = true;
	}
	if (dragWhenPlay) setEnabled(false, true, true, false);
	refreshPos();
};
function refreshPos() {
	var val = +form.seekbar.value;
	current.textContent = (val + 1).toFixed(3);
	Tone.Transport.ticks = val * Tone.Transport.PPQ * 4;
	resetHighlight();
	var currBar = bars[~~val];
	if (currBar instanceof Beat) {
		(prevRepeating = currBar.node).className = "repeating";
		currBar = currBar.data;
	}
	var pos = val % 1 * currBar.length, beat;
	for (var i = ~~pos; !(beat = currBar[i]); i--);
	if (!(beat instanceof Beat)) beat = beat[~~(pos % 1 * beat.length)];
	if (beat.node) (prevHighlighted = beat.node).className = "highlighted";
	if (beat.grey) (prevShaded = beat.grey).className = "shaded";
}
form.seekbar.onmouseup = function() {
	if (dragWhenPlay) {
		btnPlay.onclick();
		dragWhenPlay = false;
		seeked = true;
	}
};