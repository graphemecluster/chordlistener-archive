import QtQuick 2.0
import MuseScore 3.0
MuseScore {
	version: "1.0"
	description: "Add Rests"
	menuPath: "Plugins.Add Rests"
	onRun: {
		function Fraction(numerator, denominator) {
			if (!(this instanceof Fraction)) return new Fraction(numerator, denominator);
			this.numerator = typeof numerator.numerator == "number" ? numerator.numerator : typeof numerator == "number" ? numerator : 0;
			this.denominator = typeof numerator.denominator == "number" ? numerator.denominator : typeof denominator == "number" ? denominator : 1;
			if (this.numerator && this.denominator) {
				var div = gcd(Math.abs(this.numerator), Math.abs(this.denominator));
				this.numerator /= div;
				this.denominator /= div;
			} else {
				this.numerator = 0;
				this.denominator = 1;
			}
		}
		Fraction.prototype.toString = function() {
			return this.numerator + "/" + this.denominator;
		};
		function gcd(left, right) {
			return right ? gcd(right, left % right) : left;
		}
		function addFrac(left, right) {
			return Fraction(left.numerator * right.denominator + right.numerator * left.denominator, left.denominator * right.denominator);
		}
		function subFrac(left, right) {
			return Fraction(left.numerator * right.denominator - right.numerator * left.denominator, left.denominator * right.denominator);
		}
		function mulFrac(left, right) {
			return Fraction(left.numerator * right.numerator, left.denominator * right.denominator);
		}
		function divFrac(left, right) {
			return Fraction(left.numerator * right.denominator, left.denominator * right.numerator);
		}
		function compFrac(left, right) {
			var diff = subFrac(left, right);
			return (diff.numerator < 0) ^ (diff.denominator < 0);
		}
		function merge(left, right) {
			var a = left.slice(), b = right.slice(), result = [], i = 0, j = 0;
			while (a.length && b.length) result.push(compFrac(a[0].pos, b[0].pos) ? a.shift() : b.shift());
			return result.concat(a, b);
		}
		function addRests(measure, cursor) {
			var segment = measure.firstSegment, tracks = [], i, dur, prevItem, nts = curScore.ntracks;
			for (i = 0; i < nts; i++) tracks[i] = null;
			do {
				for (i = 0; i < nts; i++) if ((dur = segment.elementAt(i)) && (dur = dur.globalDuration)) {
					if (tracks[i]) tracks[i].push({track: i, dur: Fraction(dur), pos: addFrac((prevItem = tracks[i][tracks[i].length - 1]).pos, prevItem.dur)});
					else tracks[i] = [{track: i, dur: Fraction(dur), pos: Fraction(0, 1)}];
				}
			} while (segment = segment.nextInMeasure);
			var useTrack = tracks.indexOf(null);
			if (useTrack == -1) {
				console.log("No empty track to use");
				return;
			}
			var sorted = tracks.reduce(function(prev, curr) {
				return curr ? prev ? merge(curr, prev) : curr : prev;
			}), minItem, minDiff, diff;
			for (i = 1; i < sorted.length; i++) {
				var diff = subFrac(sorted[i].pos, sorted[i - 1].pos);
				if (diff.numerator && (!minItem || compFrac(diff, minDiff))) {
					minItem = sorted[i];
					minDiff = diff;
				}
			}
			if (!minItem) {
				console.log("Empty measure");
				return;
			}
			var leastVal, j;
			for (i = 0; i < nts; i++) {
				if (tracks[i]) {
					for (j = 0; j < tracks[i].length && !compFrac(minItem.pos, tracks[i][j].pos); j++);
					if (j < tracks[i].length && (!leastVal || compFrac(tracks[i][--j].dur, leastVal))) leastVal = tracks[i][j].dur;
				}
			}
			var currVal = [], minVals, minVal;
			for (i = 0; i < sorted.length; i++) {
				currVal[sorted[i].track] = sorted[i].dur;
				if (sorted[i + 1] && sorted[i + 1].pos.numerator == sorted[i].pos.numerator && sorted[i + 1].pos.denominator == sorted[i].pos.denominator) continue;
				minVal = null;
				for (j = 0; j < nts; j++) if (currVal[j] && (!minVal || compFrac(currVal[j], minVal))) minVal = currVal[j];
				if (minVals) {
					if ((prevItem = minVals[minVals.length - 1].dur).numerator != minVal.numerator || prevItem.denominator != minVal.denominator) minVals.push({dur: minVal, pos: sorted[i].pos});
				} else minVals = [{dur: minVal, pos: sorted[i].pos}];
			}
			minDiff.denominator <<= 1;
			var ratio = divFrac(minDiff, leastVal), totalBarLen, trackBarLen, restLen;
			for (i = 0; i < nts; i++) if (tracks[i]) {
				trackBarLen = addFrac((prevItem = tracks[i][tracks[i].length - 1]).dur, prevItem.pos);
				if (!totalBarLen || compFrac(totalBarLen, trackBarLen)) totalBarLen = trackBarLen;
			}
			cursor.track = useTrack;
			minVals.forEach(function(item, index) {
				var answer = mulFrac(ratio, item.dur), binary = 1, tuplet = 1, times = subFrac(minVals[++index] ? minVals[index].pos : totalBarLen, item.pos);
				while (!(answer.denominator & 1)) {
					binary <<= 1;
					answer.denominator >>= 1;
				}
				while (tuplet <= answer.denominator) tuplet <<= 1;
				tuplet = fraction(answer.denominator, tuplet >> 1);
				restLen = fraction(answer.numerator, binary);
				times = binary * times.numerator / times.denominator / answer.numerator;
				for (i = 0; i < times; i++) {
					if (answer.denominator == 1) cursor.addRest(answer.numerator, binary);
					else {
						cursor.addTuplet(tuplet, restLen);
						for (j = 0; j < answer.denominator; j++) cursor.next();
					}
				}
			});
		}
		if (!curScore) Qt.quit();
		var cursor = curScore.newCursor(), barNum = 0, n;
		cursor.rewind(1);
		if (cursor.segment) {
			cursor.rewind(2);
			var lastMeasure = cursor.measure;
			cursor.rewind(1);
			do {
				var cloneCursor = curScore.newCursor();
				cloneCursor.rewind(1);
				for (n = 0; n < barNum; n++) cloneCursor.nextMeasure();
				addRests(cursor.measure, cloneCursor);
				barNum++;
			} while (cursor.measure != lastMeasure && cursor.nextMeasure());
		} else {
			cursor.rewind(0);
			do {
				var cloneCursor = curScore.newCursor();
				cloneCursor.rewind(0);
				for (n = 0; n < barNum; n++) cloneCursor.nextMeasure();
				addRests(cursor.measure, cloneCursor);
				barNum++;
			} while (cursor.nextMeasure());
		}
		Qt.quit();
	}
}