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
  let wrapper;
  function place(below) {
    if (below && !wrapper) {
      wrapper = document.createElement('div'); wrapper.className = 'game-network-column';
      game.before(wrapper); wrapper.append(game,network);
    } else if (!below && wrapper) {
      wrapper.replaceWith(game); anchor.after(network); wrapper = null;
    }
    network.classList.toggle('under-game',below);
    under.disabled = below; restore.disabled = !below;
    try { localStorage.setItem(key,below?'under-game':'original'); } catch {}
  }
  under.onclick = ()=>{place(true);restore.focus({preventScroll:true});};
  restore.onclick = ()=>{place(false);under.focus({preventScroll:true});};
  const style = document.createElement('style');
  style.textContent = `.game-network-column { grid-column:2;grid-row:1;min-width:0;display:flex;flex-direction:column;gap:12px; } .game-network-column > .board-panel { width:100%;margin-top:var(--game-offset,0px); } .game-network-column > .network-panel { width:100%;max-width:none;margin:0; } .network-panel.under-game > .panel-move-controls:not(.network-placement-controls) { display:none; } .network-placement-controls button { min-height:44px;padding:8px 12px;color:var(--ink);background:var(--soft);border:1px solid var(--line);font-size:13px; } @media(max-width:1100px) { .game-network-column { grid-column:1 / -1;grid-row:1;width:min(100%,470px);justify-self:center; } } @media(max-width:600px) { .game-network-column { grid-column:1;grid-row:1;width:100%; } }`;
  document.head.append(style);
  let below=false;try{below=localStorage.getItem(key)==='under-game';}catch{}
  place(below);
}
