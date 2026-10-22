// Trim the capture's preroll sync marker and mux its actual WebAudio output.
const fs=require("node:fs"), path=require("node:path"), assert=require("node:assert/strict");
const {spawnSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
const capturePath=path.resolve(process.argv[2]||path.join(root,".dream-loop/video/capture.json"));
const output=path.resolve(process.argv[3]||path.join(root,"docs/combat-preview.webm"));
const ffmpeg=process.env.FFMPEG_PATH||path.join(process.env.LOCALAPPDATA||"","ms-playwright/ffmpeg-1013/ffmpeg-win64.exe");
assert(fs.existsSync(ffmpeg),"Set FFMPEG_PATH to the ffmpeg executable");
const capture=JSON.parse(fs.readFileSync(capturePath,"utf8"));
assert(capture.syncMarker&&capture.audio?.file,"Capture must include real audio and a preroll marker");
const run=args=>{const result=spawnSync(ffmpeg,["-hide_banner","-y",...args],{encoding:"utf8",maxBuffer:8*1024*1024});assert.equal(result.status,0,result.stderr);return result.stderr;};
// Playwright's video is 25 fps. Sampling a tiny corner finds the final magenta
// preroll frame without storing another full-resolution frame sequence.
const fps=25,frameDir=path.join(path.dirname(capturePath),"sync-frames-"+Date.now());
fs.mkdirSync(frameDir,{recursive:true});
run(["-i",capture.file,"-an","-vf","crop=8:8:0:0","-c:v","png","-f","image2",path.join(frameDir,"frame-%04d.png")]);
const {PNG}=require("pngjs"),frames=fs.readdirSync(frameDir).filter(name=>name.endsWith('.png')).sort();
let last=-1,count=0;
for(let frame=0;frame<frames.length;frame++) {
  const bytes=PNG.sync.read(fs.readFileSync(path.join(frameDir,frames[frame]))).data;let magenta=0;
  for(let pixel=0;pixel<64;pixel++) {
    const i=pixel*4;if(bytes[i]>210&&bytes[i+1]<45&&bytes[i+2]>210)magenta++;
  }
  if(magenta>60){last=frame;count++;}
}
assert(count>=3&&last>=0,"At least three preroll marker frames must be detected");
const trimStart=(last+1)/fps;
run(["-ss",String(trimStart),"-i",capture.file,"-i",capture.audio.file,"-map","0:v:0","-map","1:a:0","-c:v","libvpx-vp9","-b:v","0","-crf","32","-deadline","good","-cpu-used","4","-row-mt","1","-pix_fmt","yuv420p","-c:a","copy","-shortest",output]);
const report={file:output,videoCodec:"VP9",audioCodec:"Opus",fps,trimStart,markerFrames:count,audioSource:capture.audio.file,audioDuration:capture.audio.duration,bytes:fs.statSync(output).size,syncScope:"Audio starts when the preroll marker is removed; trim uses the first non-marker video frame. Video frame granularity is 40ms; physical audio-output latency is not measured."};
fs.writeFileSync(path.join(path.dirname(capturePath),"encoded.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report));
