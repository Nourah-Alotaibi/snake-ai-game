const button = document.createElement('button');
button.type='button';button.textContent='Tutorial video';
const dialog=document.createElement('dialog');
dialog.setAttribute('aria-label','Snake Learning Lab video tutorial');
dialog.style.cssText='width:min(960px,92vw);max-height:90vh;padding:16px;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:12px;';
const close=document.createElement('button');close.type='button';close.textContent='Close';close.setAttribute('aria-label','Close video tutorial');
const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='none';
video.src='https://www.nora-alotaibi.com/blog/snake-learning-lab/snake-tutorial.mp4?v=2';
video.style.cssText='display:block;width:100%;max-height:75vh;margin-top:12px;';
dialog.append(close,video);document.body.append(dialog);
document.getElementById('tutorial-open')?.before(button);
button.onclick=()=>dialog.showModal();close.onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{video.pause();button.focus();});

const screenNote=document.createElement('p');
screenNote.textContent='For a clearer view and easier learning, try the lab on a larger screen, such as an iPad, tablet, or laptop.';
screenNote.style.cssText='max-width:720px;margin:8px auto 12px;text-align:center;color:var(--muted);font-size:13px;line-height:1.5;padding:0 12px;';
document.querySelector('main h1')?.parentElement?.append(screenNote);
