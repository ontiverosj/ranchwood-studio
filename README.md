# Ranchwood Studio

A focused desktop video editor for quickly creating Jake Eats and Greywolf social videos.

## Current MVP

- Import MP4, MOV, WebM, MP3, WAV, and M4A
- Preview and scrub video clips
- Sequence, trim, split, reorder, and delete clips
- Undo and redo timeline edits
- Visual clip thumbnails and timeline zoom
- Background music with independent volume control
- Per-clip volume, mute, audio fades, and fade transitions
- 9:16, 16:9, and 1:1 projects
- Jake Eats and Greywolf title presets
- Save and reopen `.rws` projects
- Export joined video clips to MP4 using bundled FFmpeg

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev`.

## Build an installer

Run `npm run dist`. Electron Builder creates the installer in `release/`.

## Planned next release

Automatic captions, audio waveforms, music ducking, and AI highlight selection.
