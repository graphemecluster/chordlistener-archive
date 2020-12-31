var chords = document.getElementById("chords");
var preview = document.getElementById("preview");
chords.oninput = function() {
	preview.innerHTML = parseContent(chords.value.replace(/&/g, "").replace(/</g, "").replace(/>/g, "")).replace(//g, "&amp;").replace(//g, "&lt;").replace(//g, "&gt;");
};
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
var prevChord, barsEvent;
btnPlay.onclick = function() {
	if (currState == "ready") {
		Tone.Transport.loopEnd = bars.length + "m";
		barsEvent = [];
		for (var i = 0; i < bars.length; i++) barsEvent[i] = (
			typeof bars[i] == "number"
				? bars[i] < 0
					? new Tone.Event()
					: barsEvent[bars[i]]
				: new Tone.Sequence(function(time, chord) {
					if (chord != "=") {
						if (prevChord) synth.triggerRelease(prevChord.voicing, time);
						if (chord == "%") synth.triggerAttack(prevChord.voicing, time);
						else if (chord.voicing) synth.triggerAttack((prevChord = chord).voicing, time);
					}
				}, [bars[i]], "1m")
			).start(i + "m").stop(i + 1 + "m");
		Tone.Transport.schedule(function() {
			if (!Tone.Transport.loop) btnStop.onclick();
		}, bars.length + "m");
	}
	Tone.Transport.start();
	currState = "playing";
	setEnabled(false, true, true, false);
};
btnPause.onclick = function() {
	Tone.Transport.pause();
	if (synth) synth.releaseAll();
	currState = "paused";
	setEnabled(true, false, true, false);
};
btnStop.onclick = function() {
	Tone.Transport.stop().cancel();
	form.metronome.onchange();
	if (synth) synth.releaseAll();
	currState = "ready";
	setEnabled(true, false, false, true);
};
function setEnabled(play, pause, stop, others) {
	btnPlay.disabled = !play;
	btnPause.disabled = !pause;
	btnStop.disabled = !stop;
	form.chords.disabled = form.beat.disabled = !others;
}