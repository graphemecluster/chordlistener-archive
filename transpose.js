var accidentals = {
	"b": -1,
	"#": 1,
	"ｂ": -1,
	"＃": 1,
	"♭": -1,
	"♯": 1,
	"♮": 0,
	"x": 2,
	"\uDD2B": -2,
	"\uDD2A": 2
};
var relatives = [
	[/major|(iod|hypolyd)ian/i],
	[/dori(an|c)|hypomixolydian/i, /hypodori(an|c)/i],
	[/phrygian/i, /hypophrygian/i],
	[/lydian/i, /mixolydian/i],
	[/mixolydian/i],
	[/minor|(aeol|hypodor)ian/i],
	[/(locr|hypophryg)ian/i]
];
function Note(key, offset) {
	if (key instanceof Note) return key;
	if (!(this instanceof Note)) return new Note(key, offset);
	if (!key || ~~key == key) {
		this.key = key ? (key % 7 + 7) % 7 : 0;
		this.offset = +offset || 0;
	} else {
		var match = key.match(/([A-Ga-gＡ-Ｇａ-ｇ])((?:[b#ｂ＃♭♯♮x]|\uD834[\uDD2B\uDD2A])*)(.*)/);
		if (match) {
			this.key = "CDEFGABcdefgabＣＤＥＦＧＡＢｃｄｅｆｇａｂ".indexOf(match[1]) % 7;
			this.offset = match[2].replace(/\uD834/g, "").split("").reduce(function(total, item) {
				return total + accidentals[item];
			}, 0);
			if (!match[3] || /[MＭ](?![A-Za-zＡ-Ｚａ-ｚ])/.test(match[3])) return this;
			if (/[mｍ](?![A-Za-zＡ-Ｚａ-ｚ])/.test(match[3])) return transpose(5, 0, this);
			var index = relatives.findIndex(function(item) {
				return !(item[1] && item[1].test(match[3])) && item[0].test(match[3]);
			});
			if (index != -1) return transpose(index, 0, this);
		} else return null;
	}
}
Note.prototype.toString = function(useUnicode, useDouble) {
	return "CDEFGAB".charAt(this.key) + (
		this.offset < 0
			? useUnicode && useDouble && this.offset == -2
				? "𝄫"
				: (useUnicode ? "♭" : "b").repeat(-this.offset)
			: useDouble && this.offset == 2
				? (useUnicode ? "𝄪" : "x")
				: (useUnicode ? "♯" : "#").repeat(this.offset)
	);
};
var half = [0, 2, 4, 5, 7, 9, 11];
Note.prototype.toHalf = function() {
	return half[this.key] + this.offset;
};
var keyOffsets = [
	[0, 0, 0, 0, 0, 0, 0],
	[1, 0, 0, 1, 0, 0, 0],
	[1, 1, 0, 1, 1, 0, 0],
	[0, 0, 0, 0, 0, 0, -1],
	[0, 0, 0, 1, 0, 0, 0],
	[1, 0, 0, 1, 1, 0, 0],
	[1, 1, 0, 1, 1, 1, 0]
];
function transpose(original, target, note) {
	original = Note(original);
	target = Note(target);
	note = Note(note);
	var out = ((target.key + note.key - original.key) % 7 + 7) % 7;
	return Note(out, keyOffsets[target.key][out] - keyOffsets[original.key][note.key] + target.offset + note.offset - original.offset);
}

var defaultKeySig = [
	Note("C"),
	Note("Db"),
	Note("D"),
	Note("Eb"),
	Note("E"),
	Note("F"),
	Note("F#"),
	Note("G"),
	Note("Ab"),
	Note("A"),
	Note("Bb"),
	Note("B")
];
var defaultKeyChord = [
	Note("C"),
	Note("Db"),
	Note("D"),
	Note("Eb"),
	Note("E"),
	Note("F"),
	Note("Gb"),
	Note("G"),
	Note("G#"),
	Note("A"),
	Note("Bb"),
	Note("B")
];
function mod12(value) {
	return (value % 12 + 12) % 12;
}
function getKey(original, offset) {
	return defaultKeySig[mod12(Note(original).toHalf() + +offset)];
}
var originalLyricsContent;
var classMain = document.getElementsByClassName("main")[0];
var lyricsContent = classMain.children[2];
var selectElement = document.forms[0][2];
document.forms[0][3].disabled = true;
selectElement.value = "0";
selectElement.onchange = function() {
	if (originalLyricsContent) {
		classMain.removeChild(lyricsContent)
		lyricsContent = originalLyricsContent.cloneNode(true);
		classMain.appendChild(lyricsContent);
	} else {
		originalLyricsContent = lyricsContent.cloneNode(true);
	}
	var offset = selectElement.value;
	if (offset == 0) return;
	var capo = mod12(-offset);
	capo = capo > 9 ? "（" + (capo == 10 ? "全" : "半") + "音下げチューニング）" : capo;
	var currentKey = Note();
	var targetKey = defaultKeySig[mod12(offset)];
	function transposeSingleNote(note) {
		return transpose(currentKey, targetKey, note);
	}
	[].forEach.call(lyricsContent.children, function(line) {
		if (line.className == "key") {
			var keyName = line.innerText.slice(5);
			currentKey = Note(keyName);
			targetKey = getKey(currentKey, offset);
			line.innerText = "Original Key: " + keyName + " / Capo: " + capo + " / Play: " + keyName.replace(/[A-GＡ-Ｇ]([b#ｂ＃♭♯♮x]|\uD834[\uDD2B\uDD2A])*/, transposeSingleNote);
		} else if (line.className == "line") {
			[].forEach.call(line.getElementsByClassName("chord"), function(chord) {
				chord.innerText = chord.innerText.replace(/[A-GＡ-Ｇ]([b#ｂ＃♭♯♮x]|\uD834[\uDD2B\uDD2A])*(?!\.)/g, transposeSingleNote).replace(/([A-GＡ-Ｇ](?:[b#ｂ＃♭♯♮x]|\uD834[\uDD2B\uDD2A])*(?!\.))(.*\/)([A-GＡ-Ｇ](?:[b#ｂ＃♭♯♮x]|\uD834[\uDD2B\uDD2A])*(?!\.))/, function(whole, high, middle, bass) {
					high = Note(high);
					bass = transpose(0, defaultKeyChord[mod12(Note(bass).toHalf() - high.toHalf())], high);
					return high + middle + bass;
				});
				chord.setAttribute("onclick", "javascript:popupImage('/cd/" + chord.innerText.replace(/#/g, "s").replace(/\//g, "on") + ".png', event);");
			});
		}
	});
}
