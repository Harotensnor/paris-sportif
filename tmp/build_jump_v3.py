from __future__ import annotations

import copy
import glob
import json
from dataclasses import dataclass
from pathlib import Path

import guitarpro
from guitarpro import models as gp
import mido

OUTDIR = Path('out_v3')
OUTDIR.mkdir(parents=True, exist_ok=True)

# Exact visible tablature from the recovered two-page Mitch's Music PDF.
# Every pitch is (standard-guitar string number, fret), string 1 = high E.
NOTES: dict[int, list[tuple[int, int]]] = {
    1:[(4,3),(3,2),(2,1),(3,2),(3,3)],
    2:[(3,3),(3,3),(3,0),(4,2),(3,0)],
    3:[(4,3),(4,3),(3,2),(4,3),(3,0)],
    4:[(3,0),(3,3),(3,0),(4,2),(5,3)],
    5:[(4,3),(4,3),(3,2),(4,3),(3,0)],
    6:[(3,0),(3,3),(3,0),(4,2),(5,3)],
    7:[(4,3),(4,3),(3,2),(4,3),(3,0)],
    8:[(3,0),(3,3),(3,0),(4,2),(5,3)],
    9:[(3,2),(3,2),(2,1),(3,2),(3,3)],
    10:[(3,3)],
    11:[(3,2),(3,2),(2,1),(3,2),(3,3)],
    12:[],
    13:[(3,2),(3,2),(2,1),(3,2),(3,3)],
    14:[(3,3),(4,2)],
    15:[(4,3),(5,3),(5,3),(5,3),(5,3)],
    16:[],
    17:[(2,1),(2,1)],
    18:[(2,1),(3,2),(2,1),(2,1)],
    19:[(2,1),(2,1),(2,1),(2,1)],
    20:[(2,1)],
    21:[(1,0),(1,0)],
    22:[(1,0),(2,3),(2,1),(2,1)],
    23:[(2,1),(3,3),(3,2),(3,0)],
    24:[(4,3)],
    25:[(1,1),(1,1)],
    26:[(1,1),(2,1),(1,1),(1,1)],
    27:[(2,1),(1,1),(1,0),(2,1)],
    28:[(3,3)],
    29:[(1,0),(1,0)],
    30:[(1,0),(2,3),(2,1),(2,1)],
    31:[(2,1),(3,3),(3,2),(3,0)],
    32:[(4,3),(4,3)],
    33:[(2,1),(2,1),(2,1),(2,1),(3,2),(4,3)],
    34:[(2,3),(2,3),(3,3)],
    35:[(2,1),(2,1),(2,1),(2,1),(3,2),(4,3)],
    36:[(3,0),(3,0),(5,3)],
    37:[(2,1),(2,1),(2,1),(2,1),(3,2),(4,3)],
    38:[(2,3),(2,3),(3,3),(3,3)],
    39:[(2,1),(2,1),(3,2),(3,2),(4,3),(4,3)],
    40:[(3,3),(3,3),(3,0),(3,0),(4,2),(5,3)],
    41:[(3,2),(3,2),(3,2),(3,2)],
    42:[(3,0),(3,0),(3,0),(4,3),(4,2)],
    43:[(4,3)],
    44:[(2,1),(1,0),(2,3),(2,1)],
    45:[(3,2),(3,2),(3,2),(3,2)],
    46:[(3,0),(3,0),(3,0),(4,3),(4,2)],
    47:[(4,3),(1,1),(2,3)],
    48:[(2,1),(1,0),(2,3),(2,1)],
    49:[(3,2),(3,2),(3,2),(3,2)],
    50:[(3,0),(3,0),(3,0),(4,3),(4,2)],
    51:[(4,3),(1,1),(2,3)],
    52:[(2,1),(1,0),(2,3),(2,1)],
    53:[(3,2),(3,2),(3,2),(3,2)],
    54:[(3,0),(3,0),(3,0),(4,3),(4,2)],
    55:[(4,3),(1,1),(2,3)],
    56:[(2,1),(1,0),(2,3),(2,1)],
    57:[(3,2),(3,2),(3,2),(3,2)],
    58:[(3,0),(3,0),(3,0),(4,3),(4,2)],
    59:[(4,3)],
}

RHYTHMS: dict[int, list[str]] = {
    1:'q q q e e'.split(), 2:'e e q q q'.split(), 3:'q q q e e'.split(), 4:'e e q q q'.split(),
    5:'q q q e e'.split(), 6:'e e q q q'.split(), 7:'q q q e e'.split(), 8:'e e q q q'.split(),
    9:'Rq e e q e e'.split(), 10:'Re e Rq Rh'.split(), 11:'Rq e e q e e'.split(), 12:'Rw'.split(),
    13:'Rq e e q e e'.split(), 14:'Re e Rq Rq q'.split(), 15:'q e e q q'.split(), 16:'Rw'.split(),
    17:'q Rq q Rq'.split(), 18:'q Re e q q'.split(), 19:'Re q e q q'.split(), 20:'q Rq Rh'.split(),
    21:'q Rq q Rq'.split(), 22:'q Re e q q'.split(), 23:'Re q e q q'.split(), 24:'q Rq Rh'.split(),
    25:'q Rq q Rq'.split(), 26:'q Re e q e Re'.split(), 27:'Re q e q q'.split(), 28:'q Rq Rh'.split(),
    29:'q Rq q Rq'.split(), 30:'dq e q q'.split(), 31:'Re q e q q'.split(), 32:'q Rq Rq q'.split(),
    33:'e q e e e q'.split(), 34:'q q Rq Re e'.split(), 35:'e q e e e q'.split(), 36:'q q Rq q'.split(),
    37:'e q e e e q'.split(), 38:'q e Re Rq e e'.split(), 39:'e e Re e e e q'.split(), 40:'e q e e e q'.split(),
    41:'e q e q Rq'.split(), 42:'Re q e e e q'.split(), 43:'q Rq Rh'.split(), 44:'Re e Re e q q'.split(),
    45:'e q e h'.split(), 46:'Re q e e e q'.split(), 47:'q q q Rq'.split(), 48:'Re q e q q'.split(),
    49:'e q e h'.split(), 50:'Re q e e e q'.split(), 51:'q q q Rq'.split(), 52:'Re q e q q'.split(),
    53:'e q e h'.split(), 54:'Re q e e e q'.split(), 55:'q q q Rq'.split(), 56:'Re q e q q'.split(),
    57:'e q e q Rq'.split(), 58:'Re q e e e q'.split(), 59:'q Rq Rh'.split(),
}

TIE_DESTINATIONS = {
    (2,1), (4,1), (6,1), (8,1),
    (33,4), (35,4), (37,4), (39,4), (40,4),
}

CHORD_MARKERS = {
    5:'F',6:'C7',7:'F',8:'C7',9:'F',10:'C7',11:'F',12:'C7',13:'F',14:'C7',15:'F',
    17:'F',20:'C7',24:'F',28:'C7',32:'F',36:'C7',37:'F',38:'Bb',39:'F',40:'C7',
    41:'F',42:'Bb',43:'F',44:'C7',45:'F',46:'C7',47:'F',48:'C7',49:'F',50:'C7',
    51:'F',52:'C7',53:'F',54:'C7',55:'F',56:'C7',57:'F',58:'C7',59:'F',
}

CHORD_DIAGRAM_FRETS = {
    'F':  [1,1,2,3,3,1],
    'C7': [0,1,3,2,3,-1],
    'Bb': [1,3,3,3,1,-1],
}

GUITAR_VOICINGS = {
    'F':  [(6,1),(5,3),(4,3),(3,2),(2,1),(1,1)],
    'C7': [(5,3),(4,2),(3,3),(2,1),(1,0)],
    'Bb': [(5,1),(4,3),(3,3),(2,3),(1,1)],
}

BASS_NOTES = {
    'F':  ((2,3),(1,5),(1,10)),
    'C7': ((3,3),(1,0),(1,5)),
    'Bb': ((3,1),(2,3),(1,3)),
}

DURATION_SPEC = {
    's':  (gp.Duration.sixteenth, False),
    'e':  (gp.Duration.eighth, False),
    'q':  (gp.Duration.quarter, False),
    'dq': (gp.Duration.quarter, True),
    'h':  (gp.Duration.half, False),
    'w':  (gp.Duration.whole, False),
}
DURATION_BEATS = {'s':0.25, 'e':0.5, 'q':1.0, 'dq':1.5, 'h':2.0, 'w':4.0}
STANDARD_TUNING = {1:64, 2:59, 3:55, 4:50, 5:45, 6:40}
BASS_TUNING = {1:43, 2:38, 3:33, 4:28}
LINE_ENDS = {6, 12, 18, 24, 30, 36, 41, 47, 53, 59}


def duration_for(token: str) -> gp.Duration:
    base = token[1:] if token.startswith('R') else token
    value, dotted = DURATION_SPEC[base]
    return gp.Duration(value=value, isDotted=dotted)


def duration_beats(token: str) -> float:
    base = token[1:] if token.startswith('R') else token
    return DURATION_BEATS[base]


def make_chord_diagram(name: str) -> gp.Chord:
    chord = gp.Chord(6)
    chord.newFormat = False
    chord.name = name
    chord.firstFret = 1
    chord.strings = list(CHORD_DIAGRAM_FRETS[name])
    chord.show = True
    return chord


def active_chords() -> dict[int, str | None]:
    result: dict[int, str | None] = {}
    current: str | None = None
    for number in range(1, 60):
        if number in CHORD_MARKERS:
            current = CHORD_MARKERS[number]
        result[number] = current
    return result


ACTIVE_CHORDS = active_chords()


def configure_page(song: gp.Song) -> None:
    song.pageSetup.pageSize = gp.Point(216, 279)
    song.pageSetup.pageMargin = gp.Padding(15, 15, 15, 15)
    song.pageSetup.scoreSizeProportion = 1.0
    song.pageSetup.headerAndFooter = gp.HeaderFooterElements.title
    song.pageSetup.title = '%title%'
    song.pageSetup.subtitle = ''
    song.pageSetup.artist = ''
    song.pageSetup.album = ''
    song.pageSetup.words = ''
    song.pageSetup.music = ''
    song.pageSetup.wordsAndMusic = ''
    song.pageSetup.copyright = '\n'
    song.pageSetup.pageNumber = ''


def create_base_song() -> gp.Song:
    song = gp.Song()
    song.versionTuple = (5, 1, 0)
    song.title = 'Jump in the Line'
    song.subtitle = ''
    song.artist = ''
    song.album = ''
    song.words = ''
    song.music = ''
    song.copyright = ''
    song.tab = "Mitch's Music"
    song.instructions = 'Standard tuning. No capo. Tempo: quarter note = 101.'
    song.notice = [
        'Visible melody, rests, ties and fingering rebuilt measure by measure from the recovered original PDF.',
        'Playback articulation has been shortened so the MIDI follows picked acoustic-guitar phrasing instead of organ-like sustain.',
    ]
    song.tempoName = 'Moderately'
    song.tempo = 101
    song.hideTempo = False
    song.key = gp.KeySignature.FMajor
    configure_page(song)
    for _ in range(58):
        song.newMeasure()
    measure_start = gp.Duration.quarterTime
    for number, header in enumerate(song.measureHeaders, start=1):
        header.number = number
        header.start = measure_start
        header.keySignature = gp.KeySignature.FMajor
        header.timeSignature.numerator = 4
        header.timeSignature.denominator = gp.Duration(value=gp.Duration.quarter)
        header.hasDoubleBar = number == 59
        measure_start += header.length
    return song


def prepare_track(track: gp.Track, *, name: str, channel: int, instrument: int,
                  notation: bool, tablature: bool, tuning: list[gp.GuitarString] | None = None) -> None:
    track.name = name
    track.indicateTuning = False
    track.channel.channel = channel
    track.channel.effectChannel = channel
    track.channel.instrument = instrument
    track.channel.volume = 104
    track.channel.balance = 64
    track.channel.reverb = 16
    track.channel.chorus = 0
    track.settings.notation = notation
    track.settings.tablature = tablature
    track.settings.showRhythm = False
    track.settings.diagramList = False
    track.settings.diagramsInScore = False
    if tuning is not None:
        track.strings = tuning
    for measure in track.measures:
        measure.lineBreak = gp.LineBreak.break_ if measure.number in LINE_ENDS else gp.LineBreak.none
        for voice in measure.voices:
            voice.beats.clear()


def lead_duration_percent(token: str, measure: int, note_index: int) -> float:
    if (measure, note_index) in TIE_DESTINATIONS:
        return 1.0
    base = token[1:] if token.startswith('R') else token
    return {'s':0.55, 'e':0.67, 'q':0.78, 'dq':0.86, 'h':0.90, 'w':0.94}[base]


def lead_velocity(offset_beats: float) -> int:
    rounded = round(offset_beats * 2) / 2
    if rounded in (0.0, 2.0):
        return gp.Velocities.forte
    return gp.Velocities.mezzoForte


def fill_lead_track(song: gp.Song, track: gp.Track) -> None:
    prepare_track(track, name='Melodie TAB originale', channel=0, instrument=25,
                  notation=True, tablature=True)
    track.settings.diagramsInScore = True
    track.color = gp.Color(40, 100, 180)
    for number, measure in enumerate(track.measures, start=1):
        voice = measure.voices[0]
        note_cursor = 0
        beat_start = measure.start
        offset_beats = 0.0
        first_beat: gp.Beat | None = None
        for token in RHYTHMS[number]:
            beat = gp.Beat(voice)
            beat.start = beat_start
            beat.duration = duration_for(token)
            if token.startswith('R'):
                beat.status = gp.BeatStatus.rest
            else:
                beat.status = gp.BeatStatus.normal
                string, fret = NOTES[number][note_cursor]
                note_cursor += 1
                note = gp.Note(beat)
                note.string = string
                note.value = fret
                note.type = gp.NoteType.tie if (number, note_cursor) in TIE_DESTINATIONS else gp.NoteType.normal
                note.velocity = lead_velocity(offset_beats)
                note.durationPercent = lead_duration_percent(token, number, note_cursor)
                beat.notes.append(note)
            voice.beats.append(beat)
            if first_beat is None:
                first_beat = beat
            beat_start += beat.duration.time
            offset_beats += duration_beats(token)
        assert note_cursor == len(NOTES[number]), (number, note_cursor, len(NOTES[number]))
        assert beat_start - measure.start == measure.length, (number, beat_start - measure.start, measure.length)
        if number in CHORD_MARKERS and first_beat is not None:
            first_beat.effect.chord = make_chord_diagram(CHORD_MARKERS[number])


def add_rest(voice: gp.Voice, start: int, token: str) -> gp.Beat:
    beat = gp.Beat(voice)
    beat.start = start
    beat.duration = duration_for('R' + token)
    beat.status = gp.BeatStatus.rest
    voice.beats.append(beat)
    return beat


def add_chord_beat(voice: gp.Voice, start: int, token: str, chord_name: str,
                   velocity: int, duration_percent: float, upstroke: bool) -> gp.Beat:
    beat = gp.Beat(voice)
    beat.start = start
    beat.duration = duration_for(token)
    beat.status = gp.BeatStatus.normal
    for string, fret in GUITAR_VOICINGS[chord_name]:
        note = gp.Note(beat)
        note.string = string
        note.value = fret
        note.type = gp.NoteType.normal
        note.velocity = velocity
        note.durationPercent = duration_percent
        beat.notes.append(note)
    beat.effect.stroke = gp.BeatStroke(
        gp.BeatStrokeDirection.up if upstroke else gp.BeatStrokeDirection.down,
        gp.Duration.thirtySecond,
    )
    voice.beats.append(beat)
    return beat


def fill_rhythm_guitar(track: gp.Track) -> None:
    prepare_track(track, name='Guitare rythmique calypso', channel=1, instrument=26,
                  notation=True, tablature=True)
    track.channel.volume = 72
    track.channel.balance = 46
    track.channel.reverb = 10
    track.color = gp.Color(190, 100, 30)
    for number, measure in enumerate(track.measures, start=1):
        voice = measure.voices[0]
        chord = ACTIVE_CHORDS[number]
        start = measure.start
        if chord is None:
            add_rest(voice, start, 'w')
            continue
        if number <= 16:
            for _ in range(4):
                add_rest(voice, start, 'e'); start += gp.Duration.quarterTime // 2
                add_chord_beat(voice, start, 'e', chord, gp.Velocities.mezzoPiano, 0.34, True)
                start += gp.Duration.quarterTime // 2
        elif number <= 36:
            for _ in range(2):
                add_chord_beat(voice, start, 'e', chord, gp.Velocities.mezzoPiano, 0.32, False)
                start += gp.Duration.quarterTime // 2
                add_rest(voice, start, 'dq'); start += gp.Duration.quarterTime * 3 // 2
        else:
            for beat_no in range(3):
                add_chord_beat(voice, start, 'e', chord, gp.Velocities.mezzoForte, 0.36, beat_no % 2 == 1)
                start += gp.Duration.quarterTime // 2
                add_rest(voice, start, 's'); start += gp.Duration.quarterTime // 4
                add_chord_beat(voice, start, 's', chord, gp.Velocities.mezzoPiano, 0.42, True)
                start += gp.Duration.quarterTime // 4
            add_chord_beat(voice, start, 'e', chord, gp.Velocities.mezzoForte, 0.36, False)
            start += gp.Duration.quarterTime // 2
            add_chord_beat(voice, start, 'e', chord, gp.Velocities.mezzoPiano, 0.34, True)
            start += gp.Duration.quarterTime // 2
        assert start - measure.start == measure.length, (number, start - measure.start, measure.length)


def add_bass_note(voice: gp.Voice, start: int, token: str, string: int, fret: int,
                  velocity: int = gp.Velocities.mezzoForte) -> gp.Beat:
    beat = gp.Beat(voice)
    beat.start = start
    beat.duration = duration_for(token)
    beat.status = gp.BeatStatus.normal
    note = gp.Note(beat)
    note.string = string
    note.value = fret
    note.type = gp.NoteType.normal
    note.velocity = velocity
    note.durationPercent = 0.76
    beat.notes.append(note)
    voice.beats.append(beat)
    return beat


def fill_bass(track: gp.Track) -> None:
    tuning = [gp.GuitarString(1,43), gp.GuitarString(2,38), gp.GuitarString(3,33), gp.GuitarString(4,28)]
    prepare_track(track, name='Basse', channel=2, instrument=33,
                  notation=True, tablature=True, tuning=tuning)
    track.channel.volume = 82
    track.channel.balance = 64
    track.channel.reverb = 4
    track.color = gp.Color(60, 150, 80)
    for number, measure in enumerate(track.measures, start=1):
        voice = measure.voices[0]
        chord = ACTIVE_CHORDS[number]
        start = measure.start
        if chord is None:
            add_rest(voice, start, 'w')
            continue
        root, fifth, octave = BASS_NOTES[chord]
        if number <= 16:
            for pitch in (root, fifth, root, fifth):
                add_bass_note(voice, start, 'q', *pitch)
                start += gp.Duration.quarterTime
        elif number <= 36:
            add_bass_note(voice, start, 'q', *root); start += gp.Duration.quarterTime
            add_rest(voice, start, 'q'); start += gp.Duration.quarterTime
            add_bass_note(voice, start, 'q', *fifth); start += gp.Duration.quarterTime
            add_rest(voice, start, 'q'); start += gp.Duration.quarterTime
        else:
            add_bass_note(voice, start, 'q', *root); start += gp.Duration.quarterTime
            add_bass_note(voice, start, 'e', *fifth); start += gp.Duration.quarterTime // 2
            add_bass_note(voice, start, 'e', *octave, gp.Velocities.mezzoPiano); start += gp.Duration.quarterTime // 2
            add_bass_note(voice, start, 'q', *root); start += gp.Duration.quarterTime
            add_bass_note(voice, start, 'q', *fifth); start += gp.Duration.quarterTime
        assert start - measure.start == measure.length, (number, start - measure.start, measure.length)


def find_percussion_template() -> tuple[list[gp.GuitarString], dict[int, tuple[int,int]]] | None:
    for filename in glob.glob('/tmp/PyGuitarPro/tests/*.gp5'):
        try:
            test_song = guitarpro.parse(filename)
        except Exception:
            continue
        for track in test_song.tracks:
            if not track.isPercussionTrack:
                continue
            mapping: dict[int, tuple[int,int]] = {}
            for measure in track.measures:
                for voice in measure.voices:
                    for beat in voice.beats:
                        for note in beat.notes:
                            try:
                                mapping.setdefault(note.realValue, (note.string, note.value))
                            except Exception:
                                pass
            if {36,38,42}.issubset(mapping):
                return copy.deepcopy(track.strings), mapping
    return None


def fill_drums(song: gp.Song) -> bool:
    template = find_percussion_template()
    if template is None:
        return False
    strings, mapping = template
    track = gp.Track(song, number=len(song.tracks) + 1)
    song.tracks.append(track)
    prepare_track(track, name='Percussions', channel=9, instrument=0,
                  notation=True, tablature=False, tuning=strings)
    track.isPercussionTrack = True
    track.channel.channel = 9
    track.channel.effectChannel = 9
    track.channel.volume = 78
    track.color = gp.Color(130, 80, 150)
    kick = mapping.get(36) or mapping.get(35)
    snare = mapping.get(37) or mapping.get(38)
    hat = mapping.get(42) or mapping.get(44)
    if not (kick and snare and hat):
        song.tracks.remove(track)
        return False
    for number, measure in enumerate(track.measures, start=1):
        voice = measure.voices[0]
        start = measure.start
        if number < 5:
            add_rest(voice, start, 'w')
            continue
        for index in range(8):
            beat = gp.Beat(voice)
            beat.start = start
            beat.duration = duration_for('e')
            beat.status = gp.BeatStatus.normal
            drum_hits: list[tuple[int,int,int]] = [(hat[0],hat[1],gp.Velocities.mezzoPiano)]
            if index in (0,4):
                drum_hits.append((kick[0],kick[1],gp.Velocities.mezzoForte))
            if index in (2,6):
                drum_hits.append((snare[0],snare[1],gp.Velocities.mezzoForte))
            used_strings: set[int] = set()
            for string, fret, velocity in drum_hits:
                if string in used_strings:
                    continue
                used_strings.add(string)
                note = gp.Note(beat)
                note.string = string
                note.value = fret
                note.type = gp.NoteType.normal
                note.velocity = velocity
                note.durationPercent = 0.45
                beat.notes.append(note)
            voice.beats.append(beat)
            start += gp.Duration.quarterTime // 2
        assert start - measure.start == measure.length
    return True


def create_melody_song() -> gp.Song:
    song = create_base_song()
    fill_lead_track(song, song.tracks[0])
    return song


def create_full_song() -> tuple[gp.Song, bool]:
    song = create_base_song()
    fill_lead_track(song, song.tracks[0])
    rhythm = gp.Track(song, number=2)
    song.tracks.append(rhythm)
    fill_rhythm_guitar(rhythm)
    bass = gp.Track(song, number=3)
    song.tracks.append(bass)
    fill_bass(bass)
    drums = fill_drums(song)
    return song, drums


def token_of(beat: gp.Beat) -> str:
    duration_map = {
        (gp.Duration.sixteenth, False): 's',
        (gp.Duration.eighth, False): 'e',
        (gp.Duration.quarter, False): 'q',
        (gp.Duration.quarter, True): 'dq',
        (gp.Duration.half, False): 'h',
        (gp.Duration.whole, False): 'w',
    }
    token = duration_map[(beat.duration.value, beat.duration.isDotted)]
    if beat.status == gp.BeatStatus.rest:
        token = 'R' + token
    return token


def validate_melody(path: Path, expected_track_count_min: int) -> dict:
    parsed = guitarpro.parse(path)
    assert parsed.title == 'Jump in the Line'
    assert parsed.tempo == 101
    assert parsed.key == gp.KeySignature.FMajor
    assert len(parsed.tracks) >= expected_track_count_min
    track = parsed.tracks[0]
    assert len(track.measures) == 59
    assert [(s.number, s.value) for s in track.strings] == [(1,64),(2,59),(3,55),(4,50),(5,45),(6,40)]
    for number, measure in enumerate(track.measures, start=1):
        beats = measure.voices[0].beats
        assert [token_of(beat) for beat in beats] == RHYTHMS[number], number
        got_notes: list[tuple[int,int]] = []
        got_ties: list[int] = []
        note_index = 0
        for beat in beats:
            for note in beat.notes:
                note_index += 1
                got_notes.append((note.string, note.value))
                if note.type == gp.NoteType.tie:
                    got_ties.append(note_index)
        assert got_notes == NOTES[number], (number, got_notes, NOTES[number])
        expected_ties = [idx for m, idx in sorted(TIE_DESTINATIONS) if m == number]
        assert got_ties == expected_ties, (number, got_ties, expected_ties)
        total = sum(beat.duration.time for beat in beats)
        assert total == gp.Duration.quarterTime * 4, (number, total)
    return {
        'file': path.name,
        'valid': True,
        'size_bytes': path.stat().st_size,
        'tempo': parsed.tempo,
        'measures': len(track.measures),
        'tracks': [t.name for t in parsed.tracks],
        'melody_notes_and_rhythm_match_source_data': True,
    }


PPQ = 480

@dataclass
class MidiEvent:
    tick: int
    priority: int
    message: mido.Message


def append_note(events: list[MidiEvent], channel: int, pitch: int, onset: int, duration: int, velocity: int) -> None:
    duration = max(1, duration)
    events.append(MidiEvent(onset, 1, mido.Message('note_on', channel=channel, note=pitch, velocity=velocity, time=0)))
    events.append(MidiEvent(onset + duration, 0, mido.Message('note_off', channel=channel, note=pitch, velocity=0, time=0)))


def finalize_midi_track(events: list[MidiEvent], name: str, program: int | None,
                        channel: int, volume: int, pan: int, reverb: int) -> mido.MidiTrack:
    track = mido.MidiTrack()
    track.append(mido.MetaMessage('track_name', name=name, time=0))
    if program is not None:
        track.append(mido.Message('program_change', channel=channel, program=program, time=0))
    track.append(mido.Message('control_change', channel=channel, control=7, value=volume, time=0))
    track.append(mido.Message('control_change', channel=channel, control=10, value=pan, time=0))
    track.append(mido.Message('control_change', channel=channel, control=91, value=reverb, time=0))
    last = 0
    for event in sorted(events, key=lambda e: (e.tick, e.priority)):
        track.append(event.message.copy(time=event.tick - last))
        last = event.tick
    track.append(mido.MetaMessage('end_of_track', time=PPQ))
    return track


def lead_midi_events() -> list[MidiEvent]:
    events: list[MidiEvent] = []
    previous_by_string: dict[int, tuple[int, int, int, int]] = {}
    for measure in range(1, 60):
        bar_onset = (measure - 1) * 4 * PPQ
        beat_offset = 0.0
        note_index = 0
        for token in RHYTHMS[measure]:
            token_beats = duration_beats(token)
            if not token.startswith('R'):
                string, fret = NOTES[measure][note_index]
                note_index += 1
                pitch = STANDARD_TUNING[string] + fret
                onset = bar_onset + round(beat_offset * PPQ)
                nominal = round(token_beats * PPQ)
                if (measure, note_index) in TIE_DESTINATIONS and string in previous_by_string:
                    off_index, prev_pitch, prev_onset, prev_duration = previous_by_string[string]
                    if prev_pitch == pitch:
                        new_duration = (onset + nominal) - prev_onset
                        events[off_index].tick = prev_onset + new_duration
                        previous_by_string[string] = (off_index, pitch, prev_onset, new_duration)
                    else:
                        velocity = 102 if abs(beat_offset % 2) < 1e-6 else 90
                        append_note(events, 0, pitch, onset, round(nominal * 0.78), velocity)
                        previous_by_string[string] = (len(events)-1, pitch, onset, round(nominal * 0.78))
                else:
                    percent = lead_duration_percent(token, measure, note_index)
                    velocity = 104 if abs(beat_offset % 2) < 1e-6 else 92
                    append_note(events, 0, pitch, onset, round(nominal * percent), velocity)
                    previous_by_string[string] = (len(events)-1, pitch, onset, round(nominal * percent))
            beat_offset += token_beats
    return events


def rhythm_pattern_events(measure: int) -> list[tuple[float,float,bool,int]]:
    result: list[tuple[float,float,bool,int]] = []
    if measure <= 16:
        for i in range(4): result.append((i + 0.5, 0.5, True, 65))
    elif measure <= 36:
        result.extend([(0.0, 0.5, False, 68), (2.0, 0.5, False, 66)])
    else:
        pos = 0.0
        for i in range(3):
            result.append((pos, 0.5, i % 2 == 1, 74)); pos += 0.75
            result.append((pos, 0.25, True, 62)); pos += 0.25
        result.append((3.0, 0.5, False, 74))
        result.append((3.5, 0.5, True, 64))
    return result


def rhythm_midi_events() -> list[MidiEvent]:
    events: list[MidiEvent] = []
    for measure in range(5, 60):
        chord = ACTIVE_CHORDS[measure]
        if chord is None: continue
        bar = (measure - 1) * 4 * PPQ
        pitches = [STANDARD_TUNING[s] + f for s, f in GUITAR_VOICINGS[chord]]
        for onset_beats, nominal_beats, upstroke, velocity in rhythm_pattern_events(measure):
            ordered = list(reversed(pitches)) if upstroke else list(pitches)
            onset = bar + round(onset_beats * PPQ)
            strum_gap = 5
            duration = round(nominal_beats * PPQ * 0.42)
            for idx, pitch in enumerate(ordered):
                append_note(events, 1, pitch, onset + idx * strum_gap, duration, max(30, velocity - idx))
    return events


def bass_midi_events() -> list[MidiEvent]:
    events: list[MidiEvent] = []
    for measure in range(5, 60):
        chord = ACTIVE_CHORDS[measure]
        if chord is None: continue
        bar = (measure - 1) * 4 * PPQ
        root_sf, fifth_sf, octave_sf = BASS_NOTES[chord]
        root = BASS_TUNING[root_sf[0]] + root_sf[1]
        fifth = BASS_TUNING[fifth_sf[0]] + fifth_sf[1]
        octave = BASS_TUNING[octave_sf[0]] + octave_sf[1]
        if measure <= 16:
            pattern = [(0,1,root,78),(1,1,fifth,70),(2,1,root,76),(3,1,fifth,70)]
        elif measure <= 36:
            pattern = [(0,1,root,76),(2,1,fifth,70)]
        else:
            pattern = [(0,1,root,80),(1,0.5,fifth,70),(1.5,0.5,octave,66),(2,1,root,78),(3,1,fifth,72)]
        for onset_beats, nominal_beats, pitch, velocity in pattern:
            append_note(events, 2, pitch, bar + round(onset_beats * PPQ), round(nominal_beats * PPQ * 0.76), velocity)
    return events


def drum_midi_events() -> list[MidiEvent]:
    events: list[MidiEvent] = []
    for measure in range(5, 60):
        bar = (measure - 1) * 4 * PPQ
        for i in range(8):
            onset = bar + i * PPQ // 2
            append_note(events, 9, 42, onset, PPQ // 5, 52 if i % 2 == 0 else 43)
            if i in (0,4): append_note(events, 9, 36, onset, PPQ // 4, 82)
            if i in (2,6): append_note(events, 9, 37, onset, PPQ // 4, 74)
        if measure >= 37:
            for i in (1,3,5,7):
                append_note(events, 9, 56, bar + i * PPQ // 2, PPQ // 5, 42)
    return events


def write_preview_midi(path: Path, full: bool) -> None:
    midi = mido.MidiFile(type=1, ticks_per_beat=PPQ)
    meta = mido.MidiTrack()
    meta.append(mido.MetaMessage('track_name', name='Tempo', time=0))
    meta.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
    meta.append(mido.MetaMessage('key_signature', key='F', time=0))
    meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(101), time=0))
    midi.tracks.append(meta)
    midi.tracks.append(finalize_midi_track(lead_midi_events(), 'Melodie TAB originale', 25, 0, 108, 64, 24))
    if full:
        midi.tracks.append(finalize_midi_track(rhythm_midi_events(), 'Guitare rythmique calypso', 26, 1, 70, 45, 12))
        midi.tracks.append(finalize_midi_track(bass_midi_events(), 'Basse', 33, 2, 82, 64, 4))
        midi.tracks.append(finalize_midi_track(drum_midi_events(), 'Percussions', None, 9, 76, 64, 4))
    midi.save(path)


def main() -> None:
    melody_path = OUTDIR / 'Jump_in_the_Line_V3_melodie_originale.gp5'
    full_path = OUTDIR / 'Jump_in_the_Line_V3_playback_complet.gp5'
    melody_song = create_melody_song()
    guitarpro.write(melody_song, melody_path, version=(5,1,0))
    full_song, drums_in_gp = create_full_song()
    guitarpro.write(full_song, full_path, version=(5,1,0))
    write_preview_midi(OUTDIR / 'Jump_in_the_Line_V3_melodie_originale.mid', full=False)
    write_preview_midi(OUTDIR / 'Jump_in_the_Line_V3_playback_complet.mid', full=True)
    report = {
        'melody_file': validate_melody(melody_path, 1),
        'full_file': validate_melody(full_path, 3),
        'drums_embedded_in_gp5': drums_in_gp,
        'source_measures': 59,
        'tempo': 101,
        'key': 'F major',
        'visible_melody_changed_from_source_pdf': False,
        'playback_changes': [
            'short picked-note durations instead of full-length MIDI sustain',
            'metric velocity accents',
            'optional calypso rhythm guitar',
            'optional bass line',
            'percussion in the full MIDI preview; also in GP5 when a valid GP5 percussion template was found',
        ],
    }
    (OUTDIR / 'validation-v3.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
