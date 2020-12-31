function Note(key, offset) {
	if (!(this instanceof Note)) return new Note(key, offset);
	if (typeof offset == "undefined") {
		this.key = "CDEFGAB".indexOf(key.charAt(0));
		this.offset = 0;
		for (var i = 1; i < key.length; i++) this.offset += key.charAt(i) == "b" ? -1 : 1;
	} else {
		this.key = (key % 7 + 7) % 7;
		this.offset = offset;
	}
}
Note.prototype.toString = function() {
	return "CDEFGAB".charAt(this.key) + (this.offset < 0 ? "b".repeat(-this.offset) : "#".repeat(this.offset));
};
var half = [0, 2, 4, 5, 7, 9, 11];
Note.prototype.toHalf = function() {
	return ((half[this.key] + this.offset) % 12 + 12) % 12;
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
function transpose(target, note) {
	note = Note(note);
	var out = ((target.key + note.key) % 7 + 7) % 7;
	return Note(out, keyOffsets[target.key][out] + target.offset + note.offset);
}
function toColor(note, customText) {
	var node = create("note", customText);
	node.style.color = "hsl(" + (note.toHalf() * 30 + 15) + ",75%,45%)";
	return node;
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

function fullwidthNum(input) {
	var a;
	return input.split("").map(item => (a = item.charCodeAt(0)) >= 65296 ? String.fromCharCode(a - 65248) : item).join("");
}

function Chord(array) {
	if (!(this instanceof Chord)) return new Chord(array);
	this.original = array;
	var octave = 2;
	this.voicing = array.map(function(item, index) {
		return item + (array[index - 1] && item.toHalf() <= array[index - 1].toHalf() ? ++octave : octave);
	});
}

var bpm, bpmNote, beat, beatNote;
function Beat(data, node, grey) {
	if (!(this instanceof Beat)) return new Beat(data, node, grey);
	this.data = data;
	this.node = node;
	this.grey = grey;
	this.bpm = bpm * beatNote * 4 / bpmNote / beat;
}

var bars, currBar;
var chords = document.getElementById("chords");
var preview = document.getElementById("preview");
function create(tag, content) {
	var node = document.createElement(tag);
	if (content instanceof Node) node.appendChild(content);
	else if (content) node.textContent = content;
	return node;
}

var form = document.forms[0];
var loading = document.getElementById("loading");
var btnPlay = document.getElementById("play");
var btnPause = document.getElementById("pause");
var btnStop = document.getElementById("stop");

var current = document.getElementById("current");
var duration = document.getElementById("duration");

function changePos(val) {
	return function() {
		if (currState == "playing" && synth) synth.releaseAll();
		form.seekbar.value = val;
		btnPlay.onclick();
		refreshPos();
	};
}

var regex = /([+＋⁺₊﹢])|([‑‑⁻₋﹣−˗ー－-])|([／/＼\\](?![／/＼\\*＊※×]))|([AaＡａ][DdＤｄ]{2})|([OoＯｏ0０][MmＭｍ][IiＩｉ][TtＴｔ]|[NnＮｎ][OoＯｏ0０])|([DdＤｄ][OoＯｏ0０][MmＭｍ](?![IiＩｉ][TtＴｔ])(?:[IiＩｉ](?:[NnＮｎ](?:[AaＡａ](?:[NnＮｎ][TtＴｔ]?)?)?)?)?)|([AaＡａ][UuＵｕ][GgＧｇ](?:[MmＭｍ][EeＥｅ](?:[NnＮｎ](?:[TtＴｔ](?:[EeＥｅ][DdＤｄ]?)?)?)?)?)|([OoＯｏ0０][NnＮｎ])|([DdＤｄ][IiＩｉ][MmＭｍ](?:[IiＩｉ](?:[NnＮｎ](?:[IiＩｉ](?:[SsＳｓ](?:[HhＨｈ](?:[EeＥｅ][DdＤｄ]?)?)?)?)?)?)?|[°ºᵒ˚⁰∘゜ﾟ○◦◯⚪⭕￮⭘OoＯｏ0０])|([HhＨｈ](?:[AaＡａ](?:[LlＬｌ][FfＦｆ]?)?)?[-‑‑⁻₋﹣−˗ー－ 	 ﻿ -   　]*[DdＤｄ][IiＩｉ][MmＭｍ](?:[IiＩｉ](?:[NnＮｎ](?:[IiＩｉ](?:[SsＳｓ](?:[HhＨｈ](?:[EeＥｅ][DdＤｄ]?)?)?)?)?)?)?|[øØ∅⌀])|([SsＳｓ][UuＵｕ][SsＳｓ](?:[PpＰｐ](?:[EeＥｅ](?:[NnＮｎ](?:[DdＤｄ](?:[EeＥｅ][DdＤｄ]?)?)?)?)?)?)|([MmＭｍ][aａ](?![UuＵｕ][GgＧｇ]|[DdＤｄ]{2})(?:[JjＪｊ](?:[OoＯｏ0０][RrＲｒ]?)?)?|[MＭΔ△∆▵])|([MmＭｍ][IiＩｉ](?:[NnＮｎ](?:[OoＯｏ0０][RrＲｒ]?)?)?|[mｍ])|([（【\(])|([）】\)])|([。．，、・,.])|([RrＲｒ][OoＯｏ0０]{2}[TtＴｔ])|((?:[EeＥｅ][LlＬｌ][EeＥｅ][VvＶｖ][EeＥｅ][NnＮｎ]|[1１]{2})(?:[TtＴｔ][HhＨｈ])?)|((?:[TtＴｔ][HhＨｈ][IiＩｉ][RrＲｒ][TtＴｔ][EeＥｅ]{2}[NnＮｎ]|[1１][3３])(?:[TtＴｔ][HhＨｈ])?)|([FfＦｆ][IiＩｉ][RrＲｒ][SsＳｓ][TtＴｔ]|[OoＯｏ0０][NnＮｎ][EeＥｅ]|[1１](?:[SsＳｓ][TtＴｔ])?)|([SsＳｓ][EeＥｅ][CcＣｃ][OoＯｏ0０][NnＮｎ][DdＤｄ]|[TtＴｔ][WwＷｗ][OoＯｏ0０]|[2２](?:[NnＮｎ][DdＤｄ])?)|([TtＴｔ][HhＨｈ](?:[IiＩｉ][RrＲｒ][DdＤｄ]|[RrＲｒ][EeＥｅ]{2})|[3３](?:[RrＲｒ][DdＤｄ])?)|((?:[FfＦｆ][OoＯｏ0０][UuＵｕ][RrＲｒ]|4|４)(?:[TtＴｔ][HhＨｈ])?)|([FfＦｆ][IiＩｉ](?:[FfＦｆ][TtＴｔ][HhＨｈ]|[VvＶｖ][EeＥｅ])|[5５](?:[TtＴｔ][HhＨｈ])?)|((?:[SsＳｓ][IiＩｉ][XxＸｘ×]|6|６)(?:[TtＴｔ][HhＨｈ])?)|((?:[SsＳｓ][EeＥｅ][VvＶｖ][EeＥｅ][NnＮｎ]|7|７)(?:[TtＴｔ][HhＨｈ])?)|([NnＮｎ][IiＩｉ][NnＮｎ](?:[TtＴｔ][HhＨｈ]|[EeＥｅ])|[9９](?:[TtＴｔ][HhＨｈ])?)|([FfＦｆ][LlＬｌ](?:[AaＡａ][TtＴｔ]?)?|♭)|([bｂ])|([SsＳｓ](?:[HhＨｈ](?:[AaＡａ](?:[RrＲｒ][PpＰｐ]?)?)?)?|[#＃♯])|([DdＤｄ](?:[OoＯｏ0０][UuＵｕ][BbＢｂ][LlＬｌ][EeＥｅ]|[BbＢｂ][LlＬｌ])[-‑‑⁻₋﹣−˗ー－ 	 ﻿ -   　]*(?:[FfＦｆ][LlＬｌ](?:[AaＡａ][TtＴｔ]?)?|♭)|𝄫)|([DdＤｄ](?:[OoＯｏ0０][UuＵｕ][BbＢｂ][LlＬｌ][EeＥｅ]|[BbＢｂ][LlＬｌ])[-‑‑⁻₋﹣−˗ー－ 	 ﻿ -   　]*(?:[SsＳｓ](?:[HhＨｈ](?:[AaＡａ](?:[RrＲｒ][PpＰｐ]?)?)?)?|[#＃♯])|𝄪|[XxＸｘ×])|([DdＤｄ]?(?:[OoＯｏ0０][UuＵｕ][BbＢｂ][LlＬｌ][EeＥｅ]|[BbＢｂ][LlＬｌ])[-‑‑⁻₋﹣−˗ー－ 	 ﻿ -   　]*(?:[NnＮｎ][AaＡａ](?:[TtＴｔ](?:[UuＵｕ](?:[RrＲｒ](?:[AaＡａ][LlＬｌ]?)?)?)?)?|♮))|([AaＡａ]|[VvＶｖ][IiＩｉ](?![IiＩｉ])|[Ⅵⅵ])|([BＢ]|[VvＶｖ][IiＩｉ]{2}|[Ⅶⅶ])|([CcＣｃ]|[IiＩｉ](?![IiＩｉVvＶｖ])|[Ⅰⅰ])|([DdＤｄ]|[IiＩｉ]{2}(?![IiＩｉ])|[Ⅱⅱ])|([EeＥｅ]|[IiＩｉ]{3}|[Ⅲⅲ])|([FfＦｆ]|[IiＩｉ][VvＶｖ]|[Ⅳⅳ])|([GgＧｇ]|[VvＶｖ](?![IiＩｉ])|[Ⅴⅴ])|([ 	 ﻿ -   　]+)|([\r\n|¦｜‖丨￤LlＬｌ]+)|([&＆])|([%％‰‱﹪٪]+)|([=＝])|([NnＮｎ](?:[OoＯｏ0０][NnＮｎ]?)?[-‑‑⁻₋﹣−˗ー－ 	 ﻿ -   　。．，、・,.]*[CcＣｃ](?:[HhＨｈ](?:[OoＯｏ0０](?:[RrＲｒ][DdＤｄ]?)?)?)?[。．，、・,.]*|[_＿])|((?:[／/＼\\]{2}|[*＊※×](?![／/＼\\]))[^]*?(?:[\r\n]+|$)|[／/＼\\][*＊※×][^]*?(?:[*＊※×][／/＼\\]|$))|([〈《«‹＜<])|([〉》»›＞>])|([「［『〔\[](?:[0０]*(?:[1-9１-９]|[1-5１-５][\d０-９]|[6６][0-4０-４])[。．，、・,.]*[=＝]+)?[0０]*[1-9１-９][\d０-９]{0,2}(?:[。．，、・,.]+[\d０-９]*)?[」］』〕\]])|([｛{][0０]*(?:[1-9１-９]|[1-5１-５][\d０-９]|[6６][0-4０-４])(?:[／/＼\\]+[0０]*(?:[1-9１-９]|[1-5１-５][\d０-９]|[6６][0-4０-４])[。．，、・,.]*)?[｝}])|([^])/g;
var ids = " p_%axd'&ohsMm<>,ret12345679fb#vX!ABCDEFGwl@~`n/{}TI=";
var acciList = {"f": -1, "b": -1, "#": 1, "v": -2, "X": 2, "!": 0};
var accis = {"f": "b", "b": "b", "#": "#", "p": "#", "_": "b", "!": "", "": ""};
var omits = {"r": "C", "e": "F", "t": "A", "1": "C", "3": "E", "5": "G", "7": "B", "9": "D"};
chords.oninput = function() {
	var input = chords.value;
	preview.textContent = "";
	
	var inputList = [];
	var idList = "";
	var i;
	input.replace(regex, function(match) {
		for (i = 1; i < arguments.length; i++) {
			if (arguments[i]) {
				if (ids[i] != "w") {
					inputList.push(match);
					idList += ids[i];
				}
				break;
			}
		}
	});
	
	bars = [];
	currBar = [];
	bpm = 120;
	bpmNote = beat = beatNote = 4;
	var lastNumNode, barNum = true, prevChord, prevChordNode;
	var tupletNode, tupletBeat = [];
	
	for (i = 0; i < idList.length; i++) {
		
		var currPos = i, detect = false, note, acci;
		var beatList = tupletNode ? tupletBeat : currBar;
		
		if ("fb#vX!".includes(curr())) {
			
			acci = acciList[curr()];
			while (peek() in acciList) {plus(); acci += acciList[curr()];}
			if (peek() && "ABCDEFG".includes(peek())) {
				plus();
				note = idList.charCodeAt(i) - 67;
				detect = true;
			} else if (curr() == "b") {
				note = 6;
				acci += 1;
				detect = true;
			} else i = currPos;
			
		} else if ("ABCDEFG".includes(curr())) {
			
			note = idList.charCodeAt(i) - 67;
			acci = 0;
			while (peek() in acciList) {plus(); acci += acciList[curr()];}
			detect = true;
			
		}
		
		if (detect) {
			
			var noteObj = Note(note, acci), noteUntil = i;
			
			var bracketLayer = 0;
			var has5 = false, has6 = false, has7 = false, third = null, seventh = null, type = null;
			var sus2 = false, sus4 = false, thirdAfterType = null, highestInterval = null, extended = false;
			var chordNote = ["C"], addNote = [], omitNote = [], omitNotePos = [], addNoteMandatory = [];
			var seventhPos = null, currStatus = null, mandatory = false;
			var addDSharpPos = null, addFFlatPos = null, addASharpPos = null;
			
			addNoteMandatory[-1] = true;
			
			cont(
				"p", c => {if (peek() != "5") {type = "'"; return true;}},
				"_", c => {if (peek() != "5") {third = "m"; seventhPos = i; return true;}},
				"2", c => {sus2 = true; cont("4", c => sus4 = true); return true;},
				"4", c => {sus4 = true; cont("2", c => sus2 = true); return true;},
				"79et", c => {has7 = true; highestInterval = c; return true;}
			);
			
			function requireNum(acci) {
				var acciPos = i;
				return cont(
					"24569et", c => addNotes(acci, c),
					"<", c => {
						var innerBracketLayer = 1;
						var anyNote = false;
						var tempI = i;
						while (cont(
							"<", c => {innerBracketLayer++; return true;},
							">", c => {innerBracketLayer--; return true;},
							",", c => {return true;},
							"24569et", c => {if (addNotes(acci, c, acciPos)) return anyNote = true;}
						) && innerBracketLayer > 0);
						if (innerBracketLayer > 0 && anyNote) currStatus = "f";
						if (!anyNote) i = tempI;
						return anyNote;
					}
				);
			}
			
			function requireAdd() {
				return cont(
					"2469et", c => addNotes("", c),
					"fb#!p_", acci => {
						var acciPos = i;
						return cont(
							"2469et", c => addNotes(acci, c, acciPos)
						);
					},
					"<", c => {
						var innerBracketLayer = 1;
						var anyNote = false;
						var tempI = i;
						while (cont(
							"<", c => {innerBracketLayer++; return true;},
							">", c => {innerBracketLayer--; return true;},
							",", c => {return true;},
							"2469et", c => {if (addNotes("", c)) return anyNote = true;},
							"fb#!p_", acci => {
								var acciPos = i;
								return cont(
									"2469et", c => addNotes(acci, c, acciPos)
								);
							}
						) && innerBracketLayer > 0);
						if (innerBracketLayer > 0) currStatus = "f";
						if (!anyNote) i = tempI;
						return anyNote;
					}
				);
			}
			
			while (cont(
				"#fb!", requireNum,
				"p", c => {
					if (requireNum(c)) return true;
					if (type || addNote.includes("G#") || addNote.includes("Ab")) return false;
					type = "'";
					return true;
				},
				"_", c => {
					if (requireNum(c)) return true;
					if (third) {
						if (seventh) return false;
						else {
							seventh = "m";
							seventhPos = i;
						}
					} else {
						third = "m";
						seventhPos = i;
						thirdAfterType = !!type;
					}
					return true;
				},
				"d'ho", c => {
					if (type || c == "'" && (addNote.includes("G#") || addNote.includes("Ab")) || "oh".includes(c) && (addNote.includes("Gb") || addNote.includes("F#"))) return false;
					type = c;
					return true;
				},
				"Mm", c => {
					if (third) {
						if (seventh) return false;
						else {
							seventh = c;
							seventhPos = i;
						}
					} else {
						third = c;
						seventhPos = i;
						thirdAfterType = !!type;
					}
					return true;
				},
				"a", c => {
					mandatory = true;
					var addResult = requireAdd();
					mandatory = false;
					return addResult;
				},
				",", c => {
					requireAdd();
					return true;
				},
				"&", c => {
					currStatus = "/"; // exit
					return true;
				},
				"%", c => {
					if (!requireAdd()) currStatus = "/"; // exit
					return true;
				},
				"x", c => cont(
					"ret13579", c => {
						if (omitNotes(c)) {
							while (cont(
								"ret13579", c => omitNotes(c),
								",", c => {return true;},
							));
							while (curr() == ",") back();
							return true;
						}
					},
					"<", c => {
						var innerBracketLayer = 1;
						var anyNote = false;
						while (cont(
							"<", c => {innerBracketLayer++; return true;},
							">", c => {innerBracketLayer--; return true;},
							",", c => {return true;},
							"ret13579", c => {if (omitNotes(c)) return anyNote = true;},
						) && innerBracketLayer > 0);
						if (innerBracketLayer > 0) currStatus = "f";
						return anyNote;
					}
				),
				"s", c => {
					if (!cont(
						"2", c => {
							if (has5 || sus2) return false;
							cont("4", c => {
								if (has5 || sus4) return false;
								return sus4 = true;
							});
							return sus2 = true;
						},
						"4", c => {
							if (has5 || sus4) return false;
							cont("2", c => {
								if (has5 || sus2) return false;
								return sus2 = true;
							});
							return sus4 = true;
						}
					)) {
						if (has5 || sus4) return false;
						sus4 = true;
					}
					return true;
				},
				"24", c => addNotes("", c),
				"9et", c => {
					if (has6 || has7 || extended || bracketLayer > 0) return addNotes("", c);
					else {
						has7 = true;
						highestInterval = c;
						return true;
					}
				},
				"5", c => {
					if (has5 || sus2 || sus4) return false;
					return has5 = true;
				},
				"6", c => {
					if (has6 || addNote.includes("A")) return false;
					return has6 = true;
				},
				"7", c => {
					if (has7) return false;
					return has7 = true;
				},
				"<", c => {
					bracketLayer++;
					return !/^<,*>/.test(idList.slice(i));
				},
				">", c => {
					bracketLayer--;
					return bracketLayer >= 0;
				}
			) && !currStatus);
			
			
			if (type == "h" || type == "d") has7 = true;
			var noThird = has5 || sus2 || sus4;
			var maxNum = has7 - noThird + 1;
			if (maxNum < 2 && (seventh || type && thirdAfterType) || maxNum < 1 && third) {
				clearAndReset(seventhPos);
				continue;
			}
			if (sus2) chordNote.push("D");
			function suitable(fifth) {
				if (sus4) chordNote.push("F");
				if (fifth == "G") {
					if (addNote.includes("Gb")) chordNote.push("Gb");
					if (addNoteMandatory[addNote.indexOf("Gb")] && addNoteMandatory[addNote.indexOf("G#")]) chordNote.push("G");
					if (addNote.includes("G#")) chordNote.push("G#");
				} else chordNote.push(fifth);
				if (has6) chordNote.push("A");
			}
			if (type) {
				if (!seventh && thirdAfterType) {
					seventh = third;
					third = null;
				}
				if (type == "o") {
					if (has6 && has7 && !seventh) {
						clearAnyAndReset("67o");
						continue;
					}
					if (!noThird) chordNote.push(third == "M" ? "E" : "Eb");
					suitable("Gb");
					if (has7) chordNote.push(seventh == "M" ? "B" : seventh == "m" ? "Bb" : "Bbb");
				} else if (type == "'") {
					if (!noThird) chordNote.push(third == "m" ? "Eb" : "E");
					suitable("G#");
					if (has7) chordNote.push(seventh == "M" ? "B" : "Bb");
				} else if (type == "h") {
					if (!noThird) chordNote.push(third == "M" ? "E" : "Eb");
					suitable("Gb");
					chordNote.push(seventh == "M" ? "B" : "Bb");
				} else if (type == "d") {
					if (!noThird) chordNote.push(third == "m" ? "Eb" : "E");
					suitable("G");
					chordNote.push(seventh == "M" ? "B" : "Bb");
				}
			} else {
				if (!noThird) chordNote.push(third == "m" ? "Eb" : "E");
				suitable("G");
				if (has7) chordNote.push(seventh == "M" || !seventh && third == "M" ? "B" : "Bb");
			}
			if (addDSharpPos && chordNote.includes("Eb")) {
				clearAndReset(addDSharpPos);
				continue;
			}
			if (addFFlatPos && chordNote.includes("E")) {
				clearAndReset(addFFlatPos);
				continue;
			}
			if (addASharpPos && chordNote.includes("Bb")) {
				clearAndReset(addASharpPos);
				continue;
			}
			
			if (addNote.includes("Db")) chordNote.push("Db");
			if (addNote.includes("D") || "9et".includes(highestInterval) && addNoteMandatory[addNote.indexOf("Db")] && addNoteMandatory[addNote.indexOf("D#")]) {
				if (chordNote.includes("D")) {
					clearAnyAndReset("9ets");
					continue;
				} else chordNote.push("D");
			}
			if (addNote.includes("D#")) chordNote.push("D#");
			
			if (addNote.includes("Fb")) chordNote.push("Fb");
			if (addNote.includes("F") || "et".includes(highestInterval) && addNoteMandatory[addNote.indexOf("Fb")] && addNoteMandatory[addNote.indexOf("F#")]) {
				if (chordNote.includes("F")) {
					clearAnyAndReset("ets");
					continue;
				} else chordNote.push("F");
			}
			if (addNote.includes("F#")) chordNote.push("F#");
			
			if (addNote.includes("Ab")) chordNote.push("Ab");
			if (addNote.includes("A") || highestInterval == "t" && addNoteMandatory[addNote.indexOf("Ab")] && addNoteMandatory[addNote.indexOf("A#")]) {
				if (chordNote.includes("A")) {
					clearAnyAndReset("t6");
					continue;
				} else chordNote.push("A");
			}
			if (addNote.includes("A#")) chordNote.push("A#");
			
			var failed = false;
			for (var m = 0; m < omitNote.length; m++) {
				if (omitNote[m] == "E") {
					if (chordNote.includes("E") && chordNote.length > 1) chordNote.splice(chordNote.indexOf("E"), 1);
					else if (chordNote.includes("Eb") && chordNote.length > 1) chordNote.splice(chordNote.indexOf("Eb"), 1);
					else {
						clearAndReset(omitNotePos[m]);
						failed = true;
						break;
					}
				} else if (omitNote[m] == "B") {
					if (seventh) {
						clearAndReset(omitNotePos[m]);
						failed = true;
						break;
					} else if (chordNote.includes("B") && chordNote.length > 1) chordNote.splice(chordNote.indexOf("B"), 1);
					else if (chordNote.includes("Bb") && chordNote.length > 1) chordNote.splice(chordNote.indexOf("Bb"), 1);
					else if (chordNote.includes("Bbb") && chordNote.length > 1) chordNote.splice(chordNote.indexOf("Bbb"), 1);
					else {
						clearAndReset(omitNotePos[m]);
						failed = true;
						break;
					}
				} else if (chordNote.includes(omitNote[m]) && chordNote.length > 1) chordNote.splice(chordNote.indexOf(omitNote[m]), 1);
				else {
					clearAndReset(omitNotePos[m]);
					failed = true;
					break;
				}
			}
			if (failed) continue;
			
			chordNote = chordNote.map(function(item) {
				return transpose(noteObj, item);
			});
			
			var onNoteNode = null, finalPos = i;
			
			if (currStatus == "/") {
				plus();
				finalPos--;
				if (curr()) {
					
					var onCurrPos = i, onDetect = false, onNote, onAcci;
					
					if ("fb#vX!".includes(curr())) {
						
						onAcci = acciList[curr()];
						while (peek() in acciList) {plus(); onAcci += acciList[curr()];}
						if (peek() && "ABCDEFG".includes(peek())) {
							plus();
							onNote = idList.charCodeAt(i) - 67;
							onDetect = true;
						} else if (curr() == "b") {
							onNote = 6;
							onAcci += 1;
							onDetect = true;
						} else i = onCurrPos;
						
					} else if ("ABCDEFG".includes(curr())) {
						
						onNote = idList.charCodeAt(i) - 67;
						onAcci = 0;
						while (peek() in acciList) {plus(); onAcci += acciList[curr()];}
						onDetect = true;
						
					}
					
					if (onDetect) {
						var onNoteObj = Note(onNote, onAcci), onNoteUntil = i, onStr = "";
						for (var z = onCurrPos; z <= onNoteUntil; z++) onStr += inputList[z];
						onNoteNode = create("on-note", inputList[onCurrPos - 1]);
						onNoteNode.appendChild(toColor(onNoteObj, onStr));
						var half = onNoteObj.toHalf();
						var inversion = false;
						for (var y = 0; y < chordNote.length; y++) {
							if (chordNote[y].toHalf() == half) {
								chordNote = chordNote.concat(chordNote).slice(y, chordNote.length + y);
								chordNote.first = y && chordNote.length - y;
								inversion = true;
								break;
							}
						}
						if (!inversion) {
							chordNote.unshift(onNoteObj);
							chordNote.first = -1;
						}
					} else {
						back();
						back();
					}
				} else {
					back();
					back();
				}
			}
			
			if (!chordNote.first) chordNote.first = 0;
			
			while ("w<,".includes(curr())) {back(); if (!onNoteNode) finalPos--;}
			
			var notesNode = create("notes");
			chordNote.forEach(function(item, u) {
				if (u) notesNode.appendChild(document.createTextNode(","));
				notesNode.appendChild(toColor(item, item + ""));
			});
			
			var oriNode, str = "", x = currPos;
			for (; x <= noteUntil && x <= finalPos; x++) str += inputList[x];
			oriNode = create("ori", toColor(noteObj, str));
			str = "";
			for (; x <= finalPos; x++) str += inputList[x];
			var textNode = create("text", str);
			if (onNoteNode) textNode.appendChild(onNoteNode);
			oriNode.appendChild(textNode);
			
			var chordNode = create("chord", notesNode);
			chordNode.appendChild(oriNode);
			
			var beatNode = create("beat", chordNode);
			beatNode.appendChild(addBeatNum());
			
			addBarNum();
			beatList.push(Beat(prevChord = Chord(chordNote), prevChordNode = append(beatNode).firstChild));
			
			function clear(pos) {
				idList = idList.slice(0, pos) + "=" + idList.slice(pos + 1);
			}
			function clearAndReset(pos) {
				clear(pos);
				i = currPos - 1;
			}
			function clearAnyAndReset(id) {
				var j = i;
				while (!id.includes(idList.charAt(j))) j--;
				clearAndReset(j);
			}
			function addNotes(acci, note, acciPos) {
				if ("29".includes(note)) {
					note = "D";
					extended = true;
				} else if ("4e".includes(note)) {
					note = "F";
					extended = true;
				} else if ("6t".includes(note)) {
					note = "A";
					extended = true;
				} else note = "G";
				note += accis[acci];
				if (addNote.includes(note)) return false;
				else {
					if (note == "D" && (sus2 || "9et".includes(highestInterval)) ||
						note == "F" && (sus4 || "et".includes(highestInterval)) ||
						note == "F#" && (addNote.includes("Gb") || "oh".includes(type)) ||
						note == "Ab" && (addNote.includes("G#") || type == "'") ||
						note == "A" && (has6 || highestInterval == "t") ||
						note == "Gb" && (addNote.includes("G#") || addNote.includes("F#") || "oh".includes(type)) ||
						note == "G" ||
						note == "G#" && (addNote.includes("Gb") || addNote.includes("Ab") || type == "'")) {
							if (acci == "b") clear(acciPos || i - 1);
							return false;
						}
					if (note == "D#") addDSharpPos = i;
					else if (note == "Fb") {
						if (acci == "b") clear(acciPos || i - 1);
						addFFlatPos = i;
					} else if (note == "A#") addASharpPos = i;
					addNote.push(note);
					addNoteMandatory.push(mandatory);
					return true;
				}
			}
			
			function omitNotes(note) {
				note = omits[note];
				if (omitNote.includes(note)) return false;
				else {
					omitNote.push(note);
					omitNotePos.push(i);
					return true;
				}
			}
		} else if (curr() == "l") {
			
			endBar();
			append("barline", inputList[i]);
			
		} else if (curr() == "@") {
			
			var beatNode = create("beat", create("repeat-note", inputList[i]));
			beatNode.appendChild(addBeatNum());
			
			addBarNum();
			beatList.push(Beat(prevChord, append(beatNode).firstChild, prevChordNode));
			
		} else if (curr() == "~") {
			if (currBar.length || !(peek() == "l" || !peek())) append("error", inputList[i]);
			else {
				addBarNum();
				var repeatBarNode = create("repeat-bar", inputList[i]);
				var g = bars.length, f = g - inputList[i].length, d;
				for (d = f; d < g; d++) bars.push(Beat(bars[d] && bars[d].data || bars[d], repeatBarNode));
				repeatBarNode.appendChild(create("repeat-num", ++f + (f == d ? "" : "~" + d)));
				repeatBarNode.onclick = changePos(g);
				append(repeatBarNode);
				barNum = true;
			}
		} else if (curr() == "`") {
			
			var beatNode = create("beat", create("prolong", inputList[i]));
			beatNode.appendChild(addBeatNum());
			
			addBarNum();
			beatList.push(Beat("=", append(beatNode).firstChild, prevChordNode));
			
		} else if (curr() == "n") {
			
			var beatNode = create("beat", create("non-chord", inputList[i]));
			beatNode.appendChild(addBeatNum());
			
			addBarNum();
			beatList.push(Beat("_", append(beatNode).firstChild));
			
		} else if (curr() == "{") {
			if (tupletNode) append("error", inputList[i]);
			else {
				addBarNum();
				tupletNode = create("tuplet", create("tuplet-bracket", inputList[i]));
			}
		} else if (curr() == "}") {
			if (!tupletNode) append("error", inputList[i]);
			else {
				beatList = currBar;
				tupletNode.appendChild(create("tuplet-bracket", inputList[i]));
				tupletNode.appendChild(addBeatNum());
				append(tupletNode);
				tupletBeat.node = tupletNode;
				currBar.push(tupletBeat);
				tupletBeat = [];
				tupletNode = null;
			}
		} else if (curr() == "T") {
			var $0 = inputList[i].match(/^[「［『〔\[](?:[0０]*([1-9１-９]|[1-5１-５][\d０-９]|[6６][0-4０-４])([。．，、・,.]*)[=＝]+)?[0０]*([1-9１-９][\d０-９]{0,2})(?:[。．，、・,.]+([\d０-９]*))?[」］』〕\]]$/);
			bpm = +(fullwidthNum($0[3]) + ($0[4] ? "." + fullwidthNum($0[4]) : ""));
			bpmNote = $0[1] ? fullwidthNum($0[1]) / (2 - Math.pow(0.5, $0[2].length)) : 4;
			append("bpm", inputList[i]);
		} else if (curr() == "I") {
			var $0 = inputList[i].match(/^[｛{][0０]*([1-9１-９]|[1-5１-５][\d０-９]|[6６][0-4０-４])(?:[／/＼\\]+[0０]*([1-9１-９]|[1-5１-５][\d０-９]|[6６][0-4０-４])([。．，、・,.]*))?[｝}]$/);
			beat = fullwidthNum($0[1]);
			beatNote = $0[2] ? fullwidthNum($0[2]) / (2 - Math.pow(0.5, $0[3].length)) : 4;
			append("beat-change", inputList[i]);
		} else if (curr() == "/") append("comment", inputList[i]);
		else append("error", inputList[i]);
		
		function addBarNum() {
			if (barNum) {
				barNum = false;
				append("bar-num", bars.length + 1);
			}
		}
		function cont() {
			var c = peek();
			if (!c || c == "=") return false;
			plus();
			for (var k = 0; k < arguments.length; k += 2) {
				if (arguments[k].includes(c)) {
					if (arguments[k + 1](c)) return true;
					else break;
				}
			}
			back();
			return false;
		}
		// ----- Pointer Functions -----
		function prev() {
			return idList.charAt(i - 1);
		}
		function peek() {
			return idList.charAt(i + 1);
		}
		function curr() {
			return idList.charAt(i);
		}
		function plus() {
			i++;
		}
		function back() {
			i--;
		}
	}
	if (tupletNode) {
		beatList = currBar;
		tupletNode.appendChild(addBeatNum());
		append(tupletNode);
		tupletBeat.node = tupletNode;
		currBar.push(tupletBeat);
	}
	endBar();
	Tone.Transport.loopEnd = bars.length + "m";
	btnPlay.disabled = form.seekbar.disabled = !bars.length;
	duration.textContent = bars.length + (bars.length == 1 ? " bar" : " bars");
	form.seekbar.max = bars.length - 0.001;
	prepared = false;
	function endBar() {
		var i = currBar.length;
		if (i) {
			var v;
			if (i < beat) {
				v = i;
				while (beat % v) v++;
			} else {
				v = beat;
				while (v < i) v <<= 1;
			}
			if (i < v) lastNumNode.textContent += "~" + v;
			for (; i < v; i++) currBar.push(null);
			currBar.beat = beat;
			for (var h = 0; h < currBar.length; h++) {
				if (currBar[h]) {
					if (!(currBar[h] instanceof Beat)) {
						for (var g = 0; g < currBar[h].length; g++) {
							if (currBar[h][g] && currBar[h][g].node) currBar[h][g].node.parentElement.onclick = changePos(bars.length + (h + g / currBar[h].length) / currBar.length);
						}
					} else if (currBar[h].node) currBar[h].node.parentElement.onclick = changePos(bars.length + h / currBar.length);
				}
			}
			bars.push(currBar);
			currBar = [];
			barNum = true;
		}
	}
	function addBeatNum() {
		return lastNumNode = create("num", beatList.length + 1);
	}
	function append(tag, content) {
		return (tupletNode != tag && tupletNode || preview).appendChild(tag instanceof Node ? tag : create(tag, content));
	}
};
if (!String.prototype.includes) String.prototype.includes = function(search, start) {
	return this.indexOf(search, start) != -1;
};
if (!Array.prototype.includes) Array.prototype.includes = function(search, start) {
	return this.indexOf(search, start) != -1;
};
