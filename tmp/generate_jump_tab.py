from __future__ import annotations

import json
from pathlib import Path

import guitarpro
from guitarpro import models as gp

OUTDIR = Path('out_gp5')
OUTDIR.mkdir(parents=True, exist_ok=True)
OUTPUT = OUTDIR / 'Jump_in_the_Line_Mitchs_Music.gp5'

# Every pitch is (standard guitar string number, fret).
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

# Destination note indices (1-based) that are tied from the preceding identical note.
TIE_DESTINATIONS = {
    (2,1), (4,1), (6,1), (8,1),
    (33,4), (35,4), (37,4), (39,4), (40,4),
}

CHORDS = {
    5:'F',6:'C7',7:'F',8:'C7',9:'F',10:'C7',11:'F',12:'C7',13:'F',14:'C7',15:'F',
    17:'F',20:'C7',24:'F',28:'C7',32:'F',36:'C7',37:'F',38:'Bb',39:'F',40:'C7',
    41:'F',42:'Bb',43:'F',44:'C7',45:'F',46:'C7',47:'F',48:'C7',49:'F',50:'C7',
    51:'F',52:'C7',53:'F',54:'C7',55:'F',56:'C7',57:'F',58:'C7',59:'F',
}

CHORD_FRETS = {
    # Chord frets are ordered string 1 (high E) through string 6 (low E).
    'F':  [1,1,2,3,3,1],
    'C7': [0,1,3,2,3,-1],
    'Bb': [1,3,3,3,1,-1],
}

DURATION_SPEC = {
    'e':  (gp.Duration.eighth, False),
    'q':  (gp.Duration.quarter, False),
    'dq': (gp.Duration.quarter, True),
    'h':  (gp.Duration.half, False),
    'w':  (gp.Duration.whole, False),
}


def duration_for(token: str) -> gp.Duration:
    base = token[1:] if token.startswith('R') else token
    value, dotted = DURATION_SPEC[base]
    return gp.Duration(value=value, isDotted=dotted)


def make_chord(name: str) -> gp.Chord:
    chord = gp.Chord(6)
    chord.newFormat = False
    chord.name = name
    chord.firstFret = 1
    chord.strings = list(CHORD_FRETS[name])
    chord.show = True
    return chord


def create_song() -> gp.Song:
    assert set(NOTES) == set(range(1, 60))
    assert set(RHYTHMS) == set(range(1, 60))

    song = gp.Song()
    song.versionTuple = (5, 1, 0)
    song.title = 'Jump in the Line'
    song.subtitle = 'from Beetlejuice'
    song.artist = 'Harry Belafonte'
    song.album = 'Beetlejuice'
    song.music = 'Harry Belafonte'
    song.copyright = 'For personal study from the original Mitch\'s Music educational tablature.'
    song.tab = "Mitch's Music"
    song.instructions = 'Standard tuning (E A D G B E). No capo. Quarter note = 101.'
    song.notice = [
        'Faithful Guitar Pro transcription of the original Mitch\'s Music PDF/video tablature.',
        'Source video: ZRwvPScqEys',
    ]
    song.tempoName = 'Moderately'
    song.tempo = 101
    song.key = gp.KeySignature.FMajor

    # The default song has one measure. Add 58 more.
    for _ in range(58):
        song.newMeasure()

    track = song.tracks[0]
    track.name = 'Melody Guitar'
    track.indicateTuning = True
    track.channel.instrument = 25  # Acoustic Guitar (steel)
    track.settings.tablature = True
    track.settings.notation = True
    track.settings.showRhythm = True
    track.settings.diagramsInScore = True
    track.settings.diagramList = True

    measure_start = gp.Duration.quarterTime
    line_ends = {6, 12, 18, 24, 30, 36, 41, 47, 53, 59}

    for number, (header, measure) in enumerate(zip(song.measureHeaders, track.measures), start=1):
        header.number = number
        header.start = measure_start
        header.keySignature = gp.KeySignature.FMajor
        header.timeSignature.numerator = 4
        header.timeSignature.denominator = gp.Duration(value=gp.Duration.quarter)
        header.hasDoubleBar = number == 59
        measure.lineBreak = gp.LineBreak.break_ if number in line_ends else gp.LineBreak.none
        measure_start += header.length

        voice = measure.voices[0]
        voice.beats.clear()
        measure.voices[1].beats.clear()

        note_cursor = 0
        beat_start = header.start
        first_beat = None

        for token in RHYTHMS[number]:
            beat = gp.Beat(voice)
            beat.start = beat_start
            beat.duration = duration_for(token)
            is_rest = token.startswith('R')
            if is_rest:
                beat.status = gp.BeatStatus.rest
            else:
                beat.status = gp.BeatStatus.normal
                string, fret = NOTES[number][note_cursor]
                note_cursor += 1
                note = gp.Note(beat)
                note.string = string
                note.value = fret
                note.type = gp.NoteType.tie if (number, note_cursor) in TIE_DESTINATIONS else gp.NoteType.normal
                beat.notes.append(note)
            voice.beats.append(beat)
            if first_beat is None:
                first_beat = beat
            beat_start += beat.duration.time

        assert note_cursor == len(NOTES[number]), (number, note_cursor, len(NOTES[number]))
        assert beat_start - header.start == header.length, (number, beat_start-header.start, header.length)

        if number in CHORDS:
            assert first_beat is not None
            first_beat.effect.chord = make_chord(CHORDS[number])
            # Text keeps the harmonic symbol visible even in readers that hide diagrams.
            first_beat.text = CHORDS[number]

    return song


def token_of(beat: gp.Beat) -> str:
    duration_map = {
        (gp.Duration.eighth, False): 'e',
        (gp.Duration.quarter, False): 'q',
        (gp.Duration.quarter, True): 'dq',
        (gp.Duration.half, False): 'h',
        (gp.Duration.whole, False): 'w',
    }
    tok = duration_map[(beat.duration.value, beat.duration.isDotted)]
    if beat.status == gp.BeatStatus.rest:
        tok = 'R' + tok
    return tok


def validate_roundtrip(path: Path) -> dict:
    parsed = guitarpro.parse(path)
    assert parsed.title == 'Jump in the Line'
    assert parsed.artist == 'Harry Belafonte'
    assert parsed.tempo == 101
    assert parsed.key == gp.KeySignature.FMajor
    assert len(parsed.tracks) == 1
    track = parsed.tracks[0]
    assert len(track.measures) == 59
    assert [(s.number, s.value) for s in track.strings] == [(1,64),(2,59),(3,55),(4,50),(5,45),(6,40)]

    roundtrip = {}
    chord_check = {}
    for number, measure in enumerate(track.measures, start=1):
        beats = measure.voices[0].beats
        got_rhythm = [token_of(b) for b in beats]
        assert got_rhythm == RHYTHMS[number], (number, got_rhythm, RHYTHMS[number])
        got_notes = []
        got_ties = []
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
        total = sum(b.duration.time for b in beats if b.status != gp.BeatStatus.empty)
        assert total == gp.Duration.quarterTime * 4, (number, total)
        if number in CHORDS:
            chord = beats[0].effect.chord
            assert chord is not None, number
            assert chord.name == CHORDS[number], (number, chord.name, CHORDS[number])
            chord_check[str(number)] = chord.name
        roundtrip[str(number)] = {
            'rhythm': got_rhythm,
            'notes': [list(n) for n in got_notes],
            'ties': got_ties,
        }

    return {
        'valid': True,
        'file': path.name,
        'size_bytes': path.stat().st_size,
        'format': 'Guitar Pro 5.1',
        'title': parsed.title,
        'artist': parsed.artist,
        'tempo': parsed.tempo,
        'key': parsed.key.name,
        'time_signature': '4/4',
        'tuning': [str(s) for s in track.strings],
        'measures': len(track.measures),
        'chords': chord_check,
        'roundtrip': roundtrip,
    }


def main() -> None:
    song = create_song()
    guitarpro.write(song, OUTPUT, version=(5, 1, 0))
    report = validate_roundtrip(OUTPUT)
    (OUTDIR / 'validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k != 'roundtrip'}, indent=2))


if __name__ == '__main__':
    main()
