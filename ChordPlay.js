var nextTimeout = null;
var prevChord = null;
function ChordPlay(input, mpm, beat, offset) {
	var chords = [];
	var lengths = [0];
	var measureNote = [];
	input.replace(/C#/g, "Db").replace(/D#/g, "Eb").replace(/F#/g, "Gb").replace(/G#/g, "Ab").replace(/A#/g, "Bb").replace(/\/\/.+?$|\/\*.+?\*\//gm, "").replace(/\r\n?|\n/g, "|").replace(/\s/g, "").replace(/\|{2,}/g, "|").replace(/^\||\|$/g, "").replace(/(\[[^\]]*?\])(\d+)/g, function(match, chord, times) {
		return +times ? chord + (--times ? "&" + times : "") : "";
	}).replace(/([=_&%])(\d+)/g, function(match, sign, times) {
		return sign.repeat(+times);
	}).split("|").map(function(item) {
		return item.match(/\[[^\]]*?\]|[=_&]|%+/g).map(function(chord) {
			return chord.replace(/^\[|\]$/g, "");
		});
	}).forEach(function(item) {
		var repeat = item[0].match(/%/g);
		if (repeat) {
			repeat = repeat.length;
			var noOfNotes = 0;
			var x = chords.length;
			while (repeat) {
				if (measureNote[repeat - 1]) noOfNotes += measureNote[repeat - 1];
				else {
					chords.push(["_"]);
					lengths.push(mpm);
				}
				repeat--;
			}
			for (var a = x - noOfNotes; a < x; a++) {
				chords.push(chords[a]);
				lengths.push(lengths[a + 1]);
			}
		} else {
			var v = +beat;
			var i = item.length;
			while (v < i) v *= 2;
			measureNote.unshift(v);
			item.forEach(function(chord, index) {
				chords.push(chord.split(","));
				lengths.push(mpm / v);
			});
			for (; i < v; i++) {
				chords.push(["="]);
				lengths.push(mpm / v);
			}
		}
	});
	var timeout = function(index) {
		nextTimeout = setTimeout(function() {
			switch (chords[index][0]) {
				case "=":
					break;
				case "_":
					stop();
					break;
				case "&":
					if (prevChord) prevChord.forEach(play);
					break;
				default:
					stop();
					(prevChord = chords[index]).forEach(play);
					break;
			}
			if (chords[++index]) timeout(index);
			else nextTimeout = setTimeout(clear, lengths[index]);
		}, lengths[index]);
	};
	timeout(0);
	function play(item, index) {
		if (sf[form.instrument.value][item]) setTimeout(function() {
			sf[form.instrument.value][item].play();
		}, offset * index);
	}
}
function stop() {
	if (prevChord) prevChord.forEach(function(item) {
		if (sf[form.instrument.value][item]) sf[form.instrument.value][item].stop();
	});
}
if (!String.prototype.repeat) String.prototype.repeat = function(times) {
	var str = "" + this;
	times = ~~times;
	var result = "";
	while (true) {
		if (times & 1) result += str;
		times >>>= 1;
		if (!times) return result;
		str += str;
	}
}
btnStop.onclick = function() {
	clearTimeout(nextTimeout);
	clear();
};
function clear() {
	stop();
	nextTimeout = null;
	prevChord = null;
	form.instrument.disabled = form.bpm.disabled = form.bpm_note.disabled = form.beat.disabled = form.beat_note.disabled = form.slider.disabled = form.chords.disabled = form.play.disabled = false;
	btnStop.disabled = true;
}