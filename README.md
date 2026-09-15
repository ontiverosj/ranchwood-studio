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
- Secure Claude API-key settings encrypted through macOS secure storage
- Claude connection status and live connection test
- Reel Agent workflow for automatic silence removal and timeline assembly
- 9:16, 16:9, and 1:1 projects
- Jake Eats and Greywolf title presets
- Save and reopen `.rws` projects
- Export joined video clips to MP4 using bundled FFmpeg

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev`.

## Connect Claude

Open **AI Settings** in the application, paste your Anthropic API key, select
**Save key**, and then select **Test connection**. The key is encrypted locally
and is never stored in this repository.

## Build an installer

Run `npm run dist`. Electron Builder creates the installer in `release/`.

## Planned next release

Automatic captions, audio waveforms, music ducking, and AI highlight selection.
