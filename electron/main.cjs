const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

let win;
const isDev = !app.isPackaged;

function createWindow() {
  win = new BrowserWindow({
    width: 1500, height: 940, minWidth: 1100, minHeight: 720,
    backgroundColor: '#090b12',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  });
  if (isDev) win.loadURL('http://localhost:5173');
  else win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('media:import', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Media', extensions: ['mp4','mov','m4v','webm','mp3','wav','m4a'] }]
  });
  if (result.canceled) return [];
  return result.filePaths.map(filePath => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    path: filePath,
    name: path.basename(filePath),
    type: /\.(mp3|wav|m4a)$/i.test(filePath) ? 'audio' : 'video'
  }));
});

ipcMain.handle('project:save', async (_, project) => {
  const result = await dialog.showSaveDialog(win, { defaultPath: `${project.name || 'Untitled'}.rws`, filters: [{ name: 'Ranchwood Studio', extensions: ['rws'] }] });
  if (result.canceled) return null;
  fs.writeFileSync(result.filePath, JSON.stringify(project, null, 2));
  return result.filePath;
});

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Ranchwood Studio', extensions: ['rws'] }] });
  if (result.canceled) return null;
  return JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
});

const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/%/g, '\\%');

ipcMain.handle('video:export', async (_, { clips, audioTrack, ratio, overlay, preset }) => {
  if (!clips?.length) throw new Error('Add at least one video clip before exporting.');
  const result = await dialog.showSaveDialog(win, { defaultPath: 'Ranchwood-Export.mp4', filters: [{ name: 'MP4 Video', extensions: ['mp4'] }] });
  if (result.canceled) return { canceled: true };
  const [w, h] = ratio === '16:9' ? [1920,1080] : ratio === '1:1' ? [1080,1080] : [1080,1920];
  const args = ['-y'];
  clips.forEach(c => args.push('-ss', String(c.trimStart || 0), '-t', String(Math.max(.1, c.trimEnd - c.trimStart)), '-i', c.path));
  if (audioTrack?.path) args.push('-stream_loop', '-1', '-i', audioTrack.path);
  const filters = clips.map((_, i) => {
    const c = clips[i], d = Math.max(.1, c.trimEnd-c.trimStart), fade = Math.min(.35,d/3);
    let v = `[${i}:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,setpts=PTS-STARTPTS`;
    if (c.transition === 'fade') v += `,fade=t=in:st=0:d=${fade},fade=t=out:st=${Math.max(0,d-fade)}:d=${fade}`;
    if (overlay?.text) {
      const color = preset === 'jake' ? '0xFF69B4' : '0x00BFFF';
      v += `,drawtext=text='${esc(overlay.text)}':fontcolor=${color}:fontsize=64:borderw=5:bordercolor=black:x=(w-text_w)/2:y=h-text_h-140`;
    }
    const volume = c.muted ? 0 : Math.max(0,Math.min(2,(c.volume??100)/100));
    let a = `[${i}:a]aresample=48000,asetpts=PTS-STARTPTS,volume=${volume}`;
    if(c.fadeIn) a += `,afade=t=in:st=0:d=${Math.min(c.fadeIn,d/2)}`;
    if(c.fadeOut) a += `,afade=t=out:st=${Math.max(0,d-c.fadeOut)}:d=${Math.min(c.fadeOut,d/2)}`;
    return `${v}[v${i}];${a}[a${i}]`;
  });
  const joins = clips.map((_, i) => `[v${i}][a${i}]`).join('');
  const duration=clips.reduce((s,c)=>s+Math.max(.1,c.trimEnd-c.trimStart),0);
  let complex=`${filters.join(';')};${joins}concat=n=${clips.length}:v=1:a=1[outv][basea]`, audioMap='[basea]';
  if(audioTrack?.path){const n=clips.length,v=Math.max(0,Math.min(2,(audioTrack.volume??30)/100));complex+=`;[${n}:a]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=${v},afade=t=out:st=${Math.max(0,duration-1)}:d=1[music];[basea][music]amix=inputs=2:duration=first[outa]`;audioMap='[outa]';}
  args.push('-filter_complex', complex, '-map', '[outv]', '-map', audioMap, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', result.filePath);
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = '';
    proc.stderr.on('data', chunk => { stderr += chunk; win?.webContents.send('export:progress', stderr.match(/time=(\d\d:\d\d:\d\d\.\d+)/)?.[1] || 'Encoding'); });
    proc.on('error', reject);
    proc.on('close', code => code === 0 ? resolve({ path: result.filePath }) : reject(new Error(stderr.slice(-1200))));
  });
});
