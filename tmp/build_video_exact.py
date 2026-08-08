from __future__ import annotations

import json
from pathlib import Path

import guitarpro
from guitarpro import models as gp
from mido import Message, MetaMessage, MidiFile, MidiTrack, bpm2tempo

SOURCE = Path("input/source.gp5")
EXPECTED_FILE = Path("input/source-validation.json")
OUTDIR = Path("output")
OUTDIR.mkdir(parents=True, exist_ok=True)
GP5 = OUTDIR / "Jump_in_the_Line_TAB_VIDEO_EXACTE.gp5"
MIDI = OUTDIR / "Jump_in_the_Line_TAB_VIDEO_EXACTE.mid"

EXPECTED = json.loads(EXPECTED_FILE.read_text(encoding="utf-8"))["roundtrip"]


def rhythm_token(beat: gp.Beat) -> str:
    mapping = {
        (gp.Duration.eighth, False): "e",
        (gp.Duration.quarter, False): "q",
        (gp.Duration.quarter, True): "dq",
        (gp.Duration.half, False): "h",
        (gp.Duration.whole, False): "w",
    }
    token = mapping[(beat.duration.value, beat.duration.isDotted)]
    if beat.status == gp.BeatStatus.rest:
        token = "R" + token
    return token


def patch_and_validate_gp5() -> gp.Song:
    song = guitarpro.parse(SOURCE)
    song.title = "Jump in the Line"
    song.subtitle = "Tablature affichee dans la video"
    song.artist = "Harry Belafonte"
    song.album = "Beetlejuice"
    song.music = ""
    song.words = ""
    song.copyright = ""
    song.tab = "Releve mesure par mesure depuis la video fournie"
    song.instructions = (
        "Mesure alla breve 2/2. Indication originale visible dans la video : "
        "blanche = 101, soit noire = 202 pour le moteur Guitar Pro. "
        "Accordage standard E A D G B E, sans capo."
    )
    song.notice = [
        "Les 59 mesures, cases, cordes, rythmes, silences et liaisons sont conserves.",
        "Correction essentielle : blanche = 101 en 2/2, et non noire = 101 en 4/4.",
    ]
    song.tempoName = "Blanche = 101 (alla breve)"
    # GP5 stores the tempo against the quarter-note pulse.
    song.tempo = 202
    song.hideTempo = False
    song.key = gp.KeySignature.FMajor

    for header in song.measureHeaders:
        header.keySignature = gp.KeySignature.FMajor
        header.timeSignature.numerator = 2
        header.timeSignature.denominator = gp.Duration(value=gp.Duration.half)
        header.timeSignature.beams = [4, 4, 0, 0]

    track = song.tracks[0]
    track.name = "Electric Guitar"
    track.offset = 0
    track.indicateTuning = False
    track.channel.instrument = 25  # Acoustic Guitar (steel)
    track.channel.bank = 0
    track.settings.tablature = True
    track.settings.notation = True
    track.settings.showRhythm = False
    track.settings.diagramList = False
    track.settings.diagramsInScore = True
    track.clefTranspose = 0
    track.clefTransposeSecondary = 0

    # The old reconstruction duplicated chord names as free text. Keep the actual chord objects only.
    for measure in track.measures:
        for voice in measure.voices:
            for beat in voice.beats:
                if beat.text in {"F", "C7", "Bb", "B♭"}:
                    beat.text = ""

    guitarpro.write(song, GP5, version=(5, 1, 0))
    check = guitarpro.parse(GP5)

    assert check.tempo == 202
    assert check.key == gp.KeySignature.FMajor
    assert len(check.tracks) == 1
    assert len(check.tracks[0].measures) == 59
    assert [(s.number, s.value) for s in check.tracks[0].strings] == [
        (1, 64), (2, 59), (3, 55), (4, 50), (5, 45), (6, 40)
    ]

    audit: dict[str, dict[str, object]] = {}
    for header in check.measureHeaders:
        assert header.timeSignature.numerator == 2
        assert header.timeSignature.denominator.value == gp.Duration.half
        assert header.length == gp.Duration.quarterTime * 4

    for number, measure in enumerate(check.tracks[0].measures, 1):
        beats = measure.voices[0].beats
        rhythm = [rhythm_token(beat) for beat in beats]
        notes: list[list[int]] = []
        ties: list[int] = []
        note_index = 0
        for beat in beats:
            for note in beat.notes:
                note_index += 1
                notes.append([note.string, note.value])
                if note.type == gp.NoteType.tie:
                    ties.append(note_index)
        expected = EXPECTED[str(number)]
        assert rhythm == expected["rhythm"], (number, rhythm, expected["rhythm"])
        assert notes == expected["notes"], (number, notes, expected["notes"])
        assert ties == expected["ties"], (number, ties, expected["ties"])
        audit[str(number)] = {"rhythm": rhythm, "notes": notes, "ties": ties}

    report = {
        "valid": True,
        "source": "tablature displayed in the user-provided video",
        "measures": 59,
        "time_signature": "2/2 (alla breve)",
        "source_tempo_marking": "half note = 101",
        "guitar_pro_quarter_bpm": 202,
        "theoretical_full_score_duration_seconds": 59 * 2 * 60 / 101,
        "standard_tuning": ["E4", "B3", "G3", "D3", "A2", "E2"],
        "capo": 0,
        "all_59_measure_notes_rhythms_rests_and_ties_roundtrip_validated": True,
        "measure_audit": audit,
    }
    (OUTDIR / "validation_video_exacte.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return check


def build_midi(song: gp.Song) -> None:
    midi = MidiFile(type=1, ticks_per_beat=960)

    conductor = MidiTrack()
    midi.tracks.append(conductor)
    conductor.append(MetaMessage("track_name", name="Jump in the Line - video exact", time=0))
    conductor.append(
        MetaMessage(
            "time_signature",
            numerator=2,
            denominator=2,
            clocks_per_click=48,
            notated_32nd_notes_per_beat=8,
            time=0,
        )
    )
    conductor.append(MetaMessage("set_tempo", tempo=bpm2tempo(202), time=0))

    melody = MidiTrack()
    midi.tracks.append(melody)
    melody.append(MetaMessage("track_name", name="Electric Guitar", time=0))
    melody.append(Message("program_change", program=25, channel=0, time=0))

    # Event tuple: absolute tick, ordering (off before on), pitch, velocity.
    events: list[list[int]] = []
    latest_off_index: dict[int, int] = {}
    quarter = gp.Duration.quarterTime

    for measure in song.tracks[0].measures:
        for beat in measure.voices[0].beats:
            start = int(beat.start - quarter)
            end = start + int(beat.duration.time)
            for note in beat.notes:
                pitch = note.realValue
                if note.type == gp.NoteType.tie:
                    assert pitch in latest_off_index, (measure.number, pitch)
                    off_index = latest_off_index[pitch]
                    events[off_index][0] = end
                else:
                    events.append([start, 1, pitch, 88])
                    events.append([end, 0, pitch, 0])
                    latest_off_index[pitch] = len(events) - 1

    events.sort(key=lambda event: (event[0], event[1]))
    last_tick = 0
    for tick, _order, pitch, velocity in events:
        delta = tick - last_tick
        assert delta >= 0
        if velocity:
            melody.append(Message("note_on", note=pitch, velocity=velocity, channel=0, time=delta))
        else:
            melody.append(Message("note_off", note=pitch, velocity=0, channel=0, time=delta))
        last_tick = tick

    total_ticks = 59 * 4 * midi.ticks_per_beat
    melody.append(MetaMessage("end_of_track", time=max(0, total_ticks - last_tick)))
    midi.save(MIDI)

    # Mido computes the real duration from the embedded tempo map.
    reloaded = MidiFile(MIDI)
    expected_seconds = 59 * 2 * 60 / 101
    assert abs(reloaded.length - expected_seconds) < 0.01, (reloaded.length, expected_seconds)
    (OUTDIR / "validation_midi.json").write_text(
        json.dumps(
            {
                "valid": True,
                "duration_seconds": reloaded.length,
                "expected_seconds": expected_seconds,
                "quarter_bpm": 202,
                "displayed_source_marking": "half note = 101",
                "time_signature": "2/2",
            },
            indent=2,
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    validated_song = patch_and_validate_gp5()
    build_midi(validated_song)
    print("Built and validated", GP5, MIDI)
