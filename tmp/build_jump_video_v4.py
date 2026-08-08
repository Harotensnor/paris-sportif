from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import guitarpro
from guitarpro import models as gp
from mido import Message, MetaMessage, MidiFile, MidiTrack, bpm2tempo

INPUT_GP5 = Path("input/source.gp5")
INPUT_VALIDATION = Path("input/validation.json")
OUTPUT_DIR = Path("output_v4")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_GP5 = OUTPUT_DIR / "Jump_in_the_Line_TAB_VIDEO_V4.gp5"
OUTPUT_MIDI = OUTPUT_DIR / "Jump_in_the_Line_TAB_VIDEO_V4.mid"

LINE_ENDS = {6, 12, 18, 24, 30, 36, 41, 47, 53, 59}
STANDARD_TUNING = [(1, 64), (2, 59), (3, 55), (4, 50), (5, 45), (6, 40)]

DURATION_TO_TOKEN = {
    (gp.Duration.eighth, False): "e",
    (gp.Duration.quarter, False): "q",
    (gp.Duration.quarter, True): "dq",
    (gp.Duration.half, False): "h",
    (gp.Duration.whole, False): "w",
}


def rhythm_token(beat: gp.Beat) -> str:
    token = DURATION_TO_TOKEN[(beat.duration.value, beat.duration.isDotted)]
    if beat.status == gp.BeatStatus.rest:
        token = "R" + token
    return token


def note_measure_signature(song: gp.Song) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    track = song.tracks[0]
    for number, measure in enumerate(track.measures, 1):
        beats = measure.voices[0].beats
        notes: list[list[int]] = []
        ties: list[int] = []
        note_index = 0
        for beat in beats:
            for note in beat.notes:
                note_index += 1
                notes.append([note.string, note.value])
                if note.type == gp.NoteType.tie:
                    ties.append(note_index)
        out[str(number)] = {
            "rhythm": [rhythm_token(beat) for beat in beats],
            "notes": notes,
            "ties": ties,
        }
    return out


def chord_signature(song: gp.Song) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    track = song.tracks[0]
    for measure_number, measure in enumerate(track.measures, 1):
        for beat_index, beat in enumerate(measure.voices[0].beats):
            chord = beat.effect.chord
            if chord is not None:
                out.append(
                    {
                        "measure": measure_number,
                        "beat_index": beat_index,
                        "name": chord.name,
                        "first_fret": chord.firstFret,
                        "strings": list(chord.strings),
                    }
                )
    return out


def build_score() -> tuple[gp.Song, dict[str, dict[str, Any]], list[dict[str, Any]]]:
    expected_document = json.loads(INPUT_VALIDATION.read_text(encoding="utf-8"))
    expected = expected_document["roundtrip"]

    song = guitarpro.parse(INPUT_GP5)
    original_chords = chord_signature(song)

    song.title = "Jump in the Line"
    song.subtitle = "Melody on Guitar with TAB — transcription de la vidéo"
    song.artist = "Harry Belafonte"
    song.album = "Beetlejuice"
    song.words = ""
    song.music = ""
    song.copyright = ""
    song.tab = "Relevé de la tablature affichée dans la vidéo fournie"
    song.instructions = (
        "Accordage standard E A D G B E, sans capo. "
        "La vidéo affiche le symbole de mesure C (temps commun, 4/4) "
        "et une blanche à 101. Le moteur Guitar Pro est donc réglé sur noire à 202."
    )
    song.notice = [
        "Source de contrôle : MP4 fourni par l'utilisateur.",
        "59 mesures, cordes/cases, rythmes, silences, liaisons et accords contrôlés après réouverture.",
        "Correction V4 : C = 4/4, et non 2/2. Blanche = 101, équivalent noire = 202.",
    ]
    song.tempoName = "Blanche = 101"
    song.tempo = 202
    song.hideTempo = False
    song.key = gp.KeySignature.FMajor

    track = song.tracks[0]
    track.name = "Electric Guitar"
    track.indicateTuning = False
    track.channel.instrument = 25  # Acoustic Guitar (steel) for a closer listening proof.
    track.channel.bank = 0
    track.settings.notation = True
    track.settings.tablature = True
    track.settings.showRhythm = False
    track.settings.diagramList = False
    track.settings.diagramsInScore = True
    track.settings.diagramsAreBelow = False
    track.clefTranspose = 0
    track.clefTransposeSecondary = 0

    for number, (header, measure) in enumerate(zip(song.measureHeaders, track.measures), 1):
        header.number = number
        header.keySignature = gp.KeySignature.FMajor
        header.timeSignature.numerator = 4
        header.timeSignature.denominator = gp.Duration(value=gp.Duration.quarter)
        header.timeSignature.beams = [2, 2, 2, 2]
        header.hasDoubleBar = number == 59
        measure.lineBreak = gp.LineBreak.break_ if number in LINE_ENDS else gp.LineBreak.none

        for voice in measure.voices:
            for beat in voice.beats:
                if beat.text in {"F", "C7", "Bb", "B♭"}:
                    beat.text = ""
                if beat.effect.chord is not None:
                    beat.effect.chord.show = True

    guitarpro.write(song, OUTPUT_GP5, version=(5, 1, 0))
    return song, expected, original_chords


def validate_gp5(
    expected: dict[str, dict[str, Any]],
    expected_chords: list[dict[str, Any]],
) -> gp.Song:
    check = guitarpro.parse(OUTPUT_GP5)
    assert check.title == "Jump in the Line"
    assert check.tempo == 202
    assert check.key == gp.KeySignature.FMajor
    assert len(check.tracks) == 1
    assert len(check.tracks[0].measures) == 59
    assert [(s.number, s.value) for s in check.tracks[0].strings] == STANDARD_TUNING
    assert check.tracks[0].name == "Electric Guitar"
    assert check.tracks[0].settings.notation
    assert check.tracks[0].settings.tablature
    assert not check.tracks[0].settings.showRhythm

    for number, (header, measure) in enumerate(zip(check.measureHeaders, check.tracks[0].measures), 1):
        assert header.timeSignature.numerator == 4
        assert header.timeSignature.denominator.value == gp.Duration.quarter
        assert header.length == gp.Duration.quarterTime * 4
        expected_break = gp.LineBreak.break_ if number in LINE_ENDS else gp.LineBreak.none
        assert measure.lineBreak == expected_break
        assert header.hasDoubleBar == (number == 59)

    actual_signature = note_measure_signature(check)
    assert actual_signature == expected
    actual_chords = chord_signature(check)
    assert actual_chords == expected_chords

    report = {
        "valid": True,
        "source": "tablature visible dans le MP4 fourni",
        "measures": 59,
        "time_signature": "4/4 (symbole C, temps commun)",
        "source_tempo_marking": "blanche = 101",
        "guitar_pro_quarter_bpm": 202,
        "theoretical_duration_seconds": 59 * 4 * 60 / 202,
        "key": "F major",
        "standard_tuning": ["E4", "B3", "G3", "D3", "A2", "E2"],
        "capo": 0,
        "line_ends": sorted(LINE_ENDS),
        "chord_events": actual_chords,
        "all_notes_rhythms_rests_ties_and_chords_roundtrip_validated": True,
        "measure_audit": actual_signature,
    }
    (OUTPUT_DIR / "validation_video_v4.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return check


def extract_note_intervals(song: gp.Song) -> list[dict[str, Any]]:
    quarter = gp.Duration.quarterTime
    intervals: list[dict[str, Any]] = []
    active_by_pitch: dict[int, int] = {}

    for measure in song.tracks[0].measures:
        measure_start = measure.header.start - quarter
        for beat in measure.voices[0].beats:
            start = int(beat.start - quarter)
            end = start + int(beat.duration.time)
            for note in beat.notes:
                pitch = note.realValue
                if note.type == gp.NoteType.tie and pitch in active_by_pitch:
                    index = active_by_pitch[pitch]
                    intervals[index]["end"] = end
                    intervals[index]["tied"] = True
                else:
                    within_measure = start - measure_start
                    intervals.append(
                        {
                            "start": start,
                            "end": end,
                            "pitch": pitch,
                            "within_measure": within_measure,
                            "tied": False,
                        }
                    )
                    active_by_pitch[pitch] = len(intervals) - 1
    return intervals


def build_midi(song: gp.Song) -> None:
    ticks_per_beat = 960
    midi = MidiFile(type=1, ticks_per_beat=ticks_per_beat)

    meta = MidiTrack()
    midi.tracks.append(meta)
    meta.append(MetaMessage("track_name", name="Jump in the Line - video V4", time=0))
    meta.append(
        MetaMessage(
            "time_signature",
            numerator=4,
            denominator=4,
            clocks_per_click=24,
            notated_32nd_notes_per_beat=8,
            time=0,
        )
    )
    meta.append(MetaMessage("set_tempo", tempo=bpm2tempo(202), time=0))

    melody = MidiTrack()
    midi.tracks.append(melody)
    melody.append(MetaMessage("track_name", name="Electric Guitar", time=0))
    melody.append(Message("program_change", program=25, channel=0, time=0))

    events: list[tuple[int, int, int, int]] = []
    for interval in extract_note_intervals(song):
        start = interval["start"]
        end = interval["end"]
        pitch = interval["pitch"]
        within = interval["within_measure"]

        if within == 0:
            velocity = 98
        elif within == gp.Duration.quarterTime * 2:
            velocity = 92
        elif within % gp.Duration.quarterTime == 0:
            velocity = 88
        else:
            velocity = 82

        events.append((start, 1, pitch, velocity))
        events.append((end, 0, pitch, 0))

    events.sort(key=lambda event: (event[0], event[1]))
    last_tick = 0
    for tick, _order, pitch, velocity in events:
        delta = tick - last_tick
        if velocity:
            melody.append(Message("note_on", note=pitch, velocity=velocity, channel=0, time=delta))
        else:
            melody.append(Message("note_off", note=pitch, velocity=0, channel=0, time=delta))
        last_tick = tick

    total_ticks = 59 * 4 * ticks_per_beat
    melody.append(MetaMessage("end_of_track", time=max(0, total_ticks - last_tick)))
    midi.save(OUTPUT_MIDI)

    check = MidiFile(OUTPUT_MIDI)
    assert check.ticks_per_beat == 960
    note_on_count = sum(
        1
        for track in check.tracks
        for message in track
        if message.type == "note_on" and message.velocity > 0
    )
    assert note_on_count == 211

    (OUTPUT_DIR / "validation_midi_v4.json").write_text(
        json.dumps(
            {
                "valid": True,
                "time_signature": "4/4",
                "quarter_bpm": 202,
                "half_note_bpm": 101,
                "note_on_events_after_tie_merge": note_on_count,
                "duration_seconds": 59 * 4 * 60 / 202,
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def main() -> None:
    _song, expected, expected_chords = build_score()
    validated = validate_gp5(expected, expected_chords)
    build_midi(validated)
    print(f"Built {OUTPUT_GP5} and {OUTPUT_MIDI}")


if __name__ == "__main__":
    main()
