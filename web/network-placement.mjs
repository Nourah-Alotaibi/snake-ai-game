// Place the existing network card directly beneath the game without recreating it.
const network = document.querySelector('.network-panel');
const game = document.querySelector('.board-panel');
if (network && game) {
  const key = 'snake-lab-network-placement';
  const anchor = document.createComment('Original network position');
  network.before(anchor);
  const tools = document.createElement('div');
  tools.className = 'panel-move-controls network-placement-controls';
  const caption = document.createElement('span'); caption.textContent = 'Network position';
  const under = document.createElement('button'), restore = document.createElement('button');
  under.type = restore.type = 'button';
  under.textContent = '↓ Under Snake'; restore.textContent = '↩ Original position';
  under.setAttribute('aria-label','Move neural network directly under the Snake game');
  restore.setAttribute('aria-label','Restore neural network to its original position');
  tools.append(caption,under,restore); network.prepend(tools);
  function place(below) {
    if (below) {
      const workspace = document.querySelector('.workspace');
      workspace.insertBefore(network,workspace.querySelector('.deep-learning'));
    } else {
      anchor.after(network);
    }
    network.classList.toggle('under-game',below);
    under.disabled = below; restore.disabled = !below;
    try { localStorage.setItem(key,below?'under-game':'original'); } catch {}
  }
  under.onclick = ()=>{place(true);restore.focus({preventScroll:true});};
  restore.onclick = ()=>{place(false);under.focus({preventScroll:true});};
  const style = document.createElement('style');
  style.textContent = `body:not(.presenting) .workspace > .deep-learning { margin-top:clamp(480px,65vh,900px); } @media(max-width:600px) { body:not(.presenting) .workspace > .deep-learning { margin-top:64px; } } .workspace:has(> .network-panel.under-game) > .deep-learning { grid-row:3; } .workspace > .network-panel.under-game { grid-column:1 / -1;grid-row:2;width:100%;max-width:1280px;justify-self:center;margin:16px 0 0;padding:24px; } .network-panel.under-game #network { width:100%;max-width:1000px;margin:16px auto; } .network-panel.under-game #network .interactive-network { width:100%!important;min-width:0; } .network-panel.under-game .calculation { max-width:1000px;margin:16px auto;font-size:15px; } @media(max-width:600px) { .workspace > .network-panel.under-game { grid-row:4;padding:14px; } .workspace:has(> .network-panel.under-game) > .deep-learning { grid-row:5; } } .game-network-column { grid-column:2;grid-row:1;min-width:0;display:flex;flex-direction:column;gap:12px; } .game-network-column > .board-panel { width:100%;margin-top:var(--game-offset,0px); } .game-network-column > .network-panel { width:100%;max-width:none;margin:0; } .network-panel.under-game > .panel-move-controls:not(.network-placement-controls) { display:none; } .network-placement-controls button { min-height:44px;padding:8px 12px;color:var(--ink);background:var(--soft);border:1px solid var(--line);font-size:13px; } @media(max-width:1100px) { .game-network-column { grid-column:1 / -1;grid-row:1;width:min(100%,470px);justify-self:center; } } @media(max-width:600px) { .game-network-column { grid-column:1;grid-row:1;width:100%; } }`;
  style.textContent += `
    .network-panel.under-game #sensors {
      max-width:1000px;margin:14px auto;gap:8px;
    }
    .network-panel.under-game #sensors span {
      font-size:13px;line-height:1.4;padding:6px 10px;
      opacity:0.85;min-height:30px;box-sizing:border-box;display:inline-flex;align-items:center;
    }
    .network-panel.under-game #sensors span.on {
      opacity:1;font-weight:600;color:var(--ink);
      background:color-mix(in srgb,var(--accent) 20%,var(--panel));
      border-color:color-mix(in srgb,var(--accent) 70%,var(--line));
      box-shadow:0 0 8px color-mix(in srgb,var(--accent) 18%,transparent);
    }
    @media(max-width:600px) {
      .network-panel.under-game #sensors { gap:6px; }
      .network-panel.under-game #sensors span { font-size:12px;padding:5px 8px; }
    }
  `;
  document.head.append(style);
  let below=false;try{below=localStorage.getItem(key)==='under-game';}catch{}
  place(below);
}



// Remove the retired presentation entry point from older cached layouts.
document.getElementById("present")?.remove();

import "./video-tutorial.mjs";
