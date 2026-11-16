(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const tracks = {
    'Neon Nights': { bpm:110, notes:36, pattern:[0,1,2,3,1,0,3,2,0,2,1,3] },
    'Pixel Heart': { bpm:124, notes:42, pattern:[1,2,0,3,2,1,3,0,1,3,2,0] },
    'Bassline Rush': { bpm:140, notes:52, pattern:[0,3,1,2,3,0,2,1,0,1,3,2] }
  };
  let selectedTrack='Neon Nights', difficulty='easy', notes=[], running=false, paused=false, score=0, combo=0, hits=0, misses=0, total=0, startAt=0, raf=0, audioCtx=null, beatTimer=null;
  const laneWrap=$('#laneWrap'), overlay=$('#startOverlay'), result=$('#resultOverlay');
  const symbols=['←','↓','↑','→'];
  const speed={easy:0.24,normal:0.31,hard:0.39};
  function updateHud(){ $('#score').textContent='SCORE: '+String(score).padStart(6,'0');$('#combo').textContent='COMBO: '+combo;$('#accuracy').textContent='ACCURACY: '+(total?Math.round(hits/total*100):100)+'%'; }
  function audio(){ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume(); }
  function tone(freq,duration=.09,type='triangle',volume=.035){ if(!audioCtx)return;const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(volume,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration); }
  function makeNote(lane,time){const el=document.createElement('div');el.className='note';el.textContent=symbols[lane];laneWrap.appendChild(el);return {lane,time,el,hit:false};}
  function clearNotes(){ $$('.note',laneWrap).forEach(n=>n.remove());notes=[]; }
  function startGame(){ cancelAnimationFrame(raf);clearNotes();result.classList.add('hidden');overlay.classList.add('hidden');audio();score=0;combo=0;hits=0;misses=0;total=0;updateHud();running=true;paused=false;$('#gameState').textContent='PLAYING: '+selectedTrack.toUpperCase();
    const track=tracks[selectedTrack], interval=60000/track.bpm, count=track.notes+(difficulty==='hard'?12:difficulty==='easy'?-8:0);const pattern=track.pattern;const now=performance.now();startAt=now+1900;
    for(let i=0;i<count;i++){const lane=pattern[i%pattern.length];notes.push(makeNote(lane,startAt+i*interval));}
    notes.forEach(n=>n.el.style.top='-48px');
    const beatFreq=track.bpm/60;let beat=0;clearInterval(beatTimer);beatTimer=setInterval(()=>{if(running&&!paused){tone(beat%4===0?180:110,.045,'sine',.018);beat++;}},1000/beatFreq);
    raf=requestAnimationFrame(frame);
  }
  function frame(now){if(!running){return;}if(paused){raf=requestAnimationFrame(frame);return;}const travel=350/speed[difficulty];for(const n of notes){if(n.hit)continue;const y=310-(now-(n.time- travel))/travel*295;n.el.style.top=y+'px';if(now>n.time+155){n.hit=true;n.el.remove();misses++;total++;combo=0;updateHud();}}
    if(notes.every(n=>n.hit)){finish();return;}raf=requestAnimationFrame(frame);
  }
  function hitLane(lane){if(!running||paused)return;const now=performance.now();let target=null,best=Infinity;for(const n of notes){if(n.hit||n.lane!==lane)continue;const d=Math.abs(now-n.time);if(d<best){best=d;target=n;}}const receptor=$$('.receptor')[lane];receptor.classList.add('hit');setTimeout(()=>receptor.classList.remove('hit'),85);if(target&&best<170){target.hit=true;target.el.remove();const points=best<55?350:best<105?200:100;score+=points+Math.min(combo,50)*5;combo++;hits++;total++;tone([440,523,659,784][lane],.08,'square',.025);}else{combo=0;total++;tone(130,.06,'sawtooth',.012);}updateHud();}
  function finish(){running=false;clearInterval(beatTimer);cancelAnimationFrame(raf);$('#gameState').textContent='TRACK COMPLETE';$('#resultTitle').textContent=hits>misses?'NICE WORK!':'KEEP PRACTICING!';$('#resultText').textContent=`Score: ${score.toLocaleString()} · Hits: ${hits} · Misses: ${misses}`;result.classList.remove('hidden');}
  function togglePause(){if(!running)return;paused=!paused;$('#gameState').textContent=paused?'PAUSED':'PLAYING: '+selectedTrack.toUpperCase();if(paused){clearInterval(beatTimer);}else{audio();const bpm=tracks[selectedTrack].bpm;beatTimer=setInterval(()=>tone(110,.04,'sine',.015),60000/bpm);}}
  const keyMap={ArrowLeft:0,KeyA:0,ArrowDown:1,KeyS:1,ArrowUp:2,KeyW:2,ArrowRight:3,KeyD:3};
  window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();togglePause();return;}if(keyMap[e.code]!==undefined){e.preventDefault();hitLane(keyMap[e.code]);}});
  $$('.receptor').forEach(el=>{el.addEventListener('pointerdown',()=>hitLane(Number(el.dataset.lane)));});
  $$('#trackList .track-card').forEach(btn=>btn.addEventListener('click',()=>{$$('#trackList .track-card').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');selectedTrack=btn.dataset.track;$('#gameState').textContent='READY: '+selectedTrack.toUpperCase();}));
  $$('#difficulty button').forEach(btn=>btn.addEventListener('click',()=>{$$('#difficulty button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');difficulty=btn.dataset.diff;}));
  $('#startBtn').addEventListener('click',startGame);$('#againBtn').addEventListener('click',startGame);
  $('#menuToggle').addEventListener('click',()=>$('#nav').classList.toggle('open'));$$('#nav a').forEach(a=>a.addEventListener('click',()=>$('#nav').classList.remove('open')));
  $('#year').textContent=new Date().getFullYear();
  // Optional gamepad polling for the four rhythm lanes.
  let previousButtons=[];function pollPad(){const pads=navigator.getGamepads?navigator.getGamepads():[];const pad=[...pads].find(Boolean);if(pad){const mapping=[14,13,12,15];mapping.forEach((b,i)=>{const down=!!pad.buttons[b]?.pressed;if(down&&!previousButtons[b])hitLane(i);previousButtons[b]=down;});if(pad.buttons[9]?.pressed&&!previousButtons[9])togglePause();previousButtons[9]=!!pad.buttons[9]?.pressed;}requestAnimationFrame(pollPad);}if(navigator.getGamepads)pollPad();
})();
