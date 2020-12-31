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

var notesObj = {A0: "A0.[mp3|ogg]", C1: "C1.[mp3|ogg]", Eb1: "Eb1.[mp3|ogg]", Gb1: "Gb1.[mp3|ogg]", A1: "A1.[mp3|ogg]", C2: "C2.[mp3|ogg]", Eb2: "Eb2.[mp3|ogg]", Gb2: "Gb2.[mp3|ogg]", A2: "A2.[mp3|ogg]", C3: "C3.[mp3|ogg]", Eb3: "Eb3.[mp3|ogg]", Gb3: "Gb3.[mp3|ogg]", A3: "A3.[mp3|ogg]", C4: "C4.[mp3|ogg]", Eb4: "Eb4.[mp3|ogg]", Gb4: "Gb4.[mp3|ogg]", A4: "A4.[mp3|ogg]", C5: "C5.[mp3|ogg]", Eb5: "Eb5.[mp3|ogg]", Gb5: "Gb5.[mp3|ogg]", A5: "A5.[mp3|ogg]", C6: "C6.[mp3|ogg]", Eb6: "Eb6.[mp3|ogg]", Gb6: "Gb6.[mp3|ogg]", A6: "A6.[mp3|ogg]", C7: "C7.[mp3|ogg]", Eb7: "Eb7.[mp3|ogg]", Gb7: "Gb7.[mp3|ogg]", A7: "A7.[mp3|ogg]", C8: "C8.[mp3|ogg]"};
var synths = {}, synth;

form.instrument.onchange = function() {
	var name = this.value;
	if (name in synths) {
		if (synth) try {synth.releaseAll();} catch (e) {}
		synth = synths[name];
	} else {
		loading.style.display = "block";
		var load = new Tone.Sampler(notesObj, {
			baseUrl: "/sounds/" + name + "-",
			onload: function() {
				loading.style.display = "none";
				if (currState == "loading") {
					currState = "ready";
					setEnabled(true, false, false, true);
				}
				if (synth) try {synth.releaseAll();} catch (e) {}
				(synth = synths[name] = load).volume.value = 20;
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
					? new Tone.Sequence((function(repeatingNode) {
						return function(time, beat) {
							resetHighlight();
							if (beat.node) (prevHighlighted = beat.node).className = "highlighted";
							if (beat.grey) (prevShaded = beat.grey).className = "shaded";
							(prevRepeating = repeatingNode).className = "repeating";
							Tone.Transport.bpm.setValueAtTime(beat.bpm, time);
							if (beat.data != "=") {
								try {synth.releaseAll(time);} catch (e) {}
								if (beat.data != "_") synth.triggerAttack(beat.data.voicing, time);
							}
						}
					})(bars[i].node), [bars[i].data], "1m")
					: new Tone.Sequence(function(time, beat) {
						resetHighlight();
						if (beat.node) (prevHighlighted = beat.node).className = "highlighted";
						if (beat.grey) (prevShaded = beat.grey).className = "shaded";
						Tone.Transport.bpm.setValueAtTime(beat.bpm, time);
						if (beat.data != "=") {
							try {synth.releaseAll(time);} catch (e) {}
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
	is_playing = true;
	rangeDisplayChange();
	setEnabled(false, true, true, false);
	requestAnimationFrame(seekToTime);
};
btnPause.onclick = function() {
	if (synth) try {synth.releaseAll();} catch (e) {}
	Tone.Transport.pause();
	currState = "paused";
	cancelAnimationFrame(requestID);
	setEnabled(true, false, true, false);
};
btnStop.onclick = function() {
	if (synth) try {synth.releaseAll();} catch (e) {}
	Tone.Transport.stop().cancel();
	resetHighlight();
	currState = "ready";
	is_playing = false;
	rangeDisplayChange();
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
	var pos = val % 1 * currBar.length, beat = currBar[~~pos];
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

// keyboard-range

var keyboard_range = document.getElementsByTagName("keyboard-range")[0];
var is_playing = false;
function rangeDisplayChange() {
	[].forEach.call(keyboard_range.children, function(key, r) {
		key.style.borderTopColor = key.style.borderBottomColor = r >= bass_range && r < bass_range + 12 ? "red" : "grey";
		key.style.borderLeftColor = r == bass_range ? "red" : r == chord_range ? "blue" : "grey";
		key.style.borderRightColor = r == bass_range + 11 ? "red" : "grey";
		key.style.opacity = r >= bass_range && r < bass_range + 12 || r >= chord_range
			? is_playing ? 0.6 : 1
			: is_playing ? 0.3 : 0.4;
		key.onmousedown = rangeDrag(
			key.style.cursor = is_playing
				? "default"
				: r == chord_range - 1 || r == chord_range
					? "ew-resize"
					: r >= bass_range && r < bass_range + 12
						? "move"
						: "default"
		);
	});
}
function rangeDrag(cursor) {
	return cursor == "default" ? null : function(eDown) {
		var x = eDown.clientX, ori = cursor == "move" ? bass_range : chord_range;
		document.onmousemove = function(eMove) {
			cursor == "move"
				? bass_range = Math.max(0, Math.min(chord_range - 12, ori + Math.round((eMove.clientX - x) / 9)))
				: chord_range = Math.max(bass_range + 12, Math.min(63, ori + Math.round((eMove.clientX - x) / 9)));
			rangeDisplayChange();
		};
		document.onmouseup = function() {
			document.onmousemove = document.onmouseup = null;
			chords.oninput();
		};
	};
}
rangeDisplayChange();