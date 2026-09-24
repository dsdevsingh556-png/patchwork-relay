let PATCH_DATA = [];
let player = "A";
let lastMover = null;
let stateVersion = 0;
let moveCount = 0;
let selected = null;
let previewBoard = null;
let status = "ACTIVE";
let history = [];
let currentPatch = null;
let board = null;
let challenge = null;
const MAX_MOVES=12;

function lsKey(){return "patchwork-demo:"+currentPatch.id;}
function save(){
  localStorage.setItem(lsKey(),JSON.stringify({player,lastMover,stateVersion,moveCount,board,challenge,history,status}));
}
function load(patch){
  currentPatch=patch;
  const saved=JSON.parse(localStorage.getItem(lsKey())||"null");
  if(saved){({player,lastMover,stateVersion,moveCount,board,challenge,history}=saved); status=(moveCount>=MAX_MOVES?"ARCHIVED":"ACTIVE");}
  else {player="A";lastMover=null;stateVersion=0;moveCount=0;board=patch.board.map(r=>[...r]);challenge={mode:patch.challenge};history=[];status="ACTIVE";}
  selected=null; previewBoard=null; status=(moveCount>=MAX_MOVES?"ARCHIVED":"ACTIVE"); render();
}
function svgForTile(tile,selectedCell){
  if(tile==="__") return "";
  const mask=tileMask(tile), lines=[];
  const dirs=[[1,"0 0 0 -28"],[2,"0 0 28 0"],[4,"0 0 0 28"],[8,"0 0 -28 0"]];
  for(const [bit,pts] of dirs) if(mask&bit) lines.push(`<line x1="50" y1="50" x2="${bit===2?78:bit===8?22:50}" y2="${bit===1?22:bit===4?78:50}" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>`);
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${lines.join("")}<circle cx="50" cy="50" r="9" fill="currentColor"/></svg>`;
}
function render(){
  const m=computeMetrics(board);
  document.querySelector("#patchName").textContent=`${currentPatch.name} · ${currentPatch.id}`;
  document.querySelector("#challenge").textContent=challenge.mode==="REWIRE"
    ? `RESHAPE inside highlighted zone`
    : ({
      GAIN_LINK:"Create ≥1 connection; loose ends may rise by 1.",
      CLEAN_TWO:"Remove ≥2 loose ends; keep connections.",
      MERGE:"Merge ≥1 connected group; keep connections.",
      GAIN_LOOP:"Create ≥1 new loop; do not split groups.",
      CORE_JOIN:"Connect the four central cells; keep connections.",
      EXACT_TWO:"Create exactly 2 new connections."
    }[challenge.mode]);
  document.querySelector("#player").textContent=`Player ${player}${lastMover?` · last mover: ${lastMover}`:""}`;
  document.querySelector("#moves").textContent=`Move ${moveCount}/${MAX_MOVES}`;
  document.querySelector("#metrics").textContent=`links ${m.matchedEdges} · loose ${m.looseEnds} · groups ${m.components} · loops ${m.cycles}`;
  const grid=document.querySelector("#board");grid.innerHTML="";
  const displayBoard = previewBoard || board;
  let focus=challenge.focus;
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){
    const b=document.createElement("button");b.className="cell";
    if(selected&&selected.row===r&&selected.col===c)b.classList.add("selected");
    if(focus&&Math.max(Math.abs(r-focus.row),Math.abs(c-focus.col))<=focus.radius)b.classList.add("focus");
    b.disabled=moveCount>=MAX_MOVES||displayBoard[r][c]==="__"||lastMover===player;
    b.innerHTML=svgForTile(displayBoard[r][c]);
    b.title=displayBoard[r][c]==="__"?"Empty":`${displayBoard[r][c]} · row ${r}, col ${c}`;
    b.onclick=()=>{selected={row:r,col:c}; previewBoard=null; document.querySelector("#previewText").textContent=""; render();};
    grid.appendChild(b);
  }
  document.querySelector("#rotate90").disabled=!selected;
  document.querySelector("#rotate180").disabled=!selected;
  document.querySelector("#rotate270").disabled=!selected;
  document.querySelector("#commit").disabled=!selected || !previewBoard;
  document.querySelector("#status").textContent=status;
  const hs=document.querySelector("#history");hs.innerHTML=history.slice().reverse().map(h=>
    `<div class="hist"><b>#${h.move}</b> Player ${h.player} · (${h.row},${h.col}) · +${h.k*90}° · ${h.challenge}</div>`).join("")||"<div class='muted'>No committed moves yet.</div>";
}
function preview(steps){
  if(!selected)return;
  previewBoard=applySingleMove(board,selected.row,selected.col,steps);
  selected={...selected,previewSteps:steps};
  document.querySelector("#previewText").textContent=`Preview: rotate (${selected.row},${selected.col}) by ${steps*90}°.`;
  render();
}
function commitMove(){
  if(!selected || !previewBoard)return;
  const steps=selected.previewSteps||1;
  const beforeMetrics=computeMetrics(board);
  const after=computeMetrics(previewBoard);
  if(!challengePass(challenge,beforeMetrics,after,selected)){
    alert("CHALLENGE FAILED — this move is not valid for the current Patch.");
    previewBoard=null;
    render();
    return;
  }
  board=previewBoard;
  previewBoard=null;
  moveCount++;
  stateVersion++;
  history.push({move:moveCount,player,row:selected.row,col:selected.col,k:steps,challenge:challenge.mode});
  lastMover=player;
  const next=chooseNextChallenge(board,currentPatch.id,stateVersion,challenge);
  if(moveCount>=MAX_MOVES||!next){
    status="ARCHIVED";
  } else {
    challenge=next;
    status="ACTIVE";
  }
  selected=null;
  save();render();
}
function changePlayer(){
  const order=["A","B","C","D"];
  const i=order.indexOf(player);
  let next=order[(i+1)%order.length];
  if(lastMover===next)next=order[(order.indexOf(next)+1)%order.length];
  player=next;selected=null;previewBoard=null;save();render();
}
async function share(){
  const url=location.href.split("#")[0]+"#"+currentPatch.id;
  try{await navigator.clipboard.writeText(url);alert("Demo link copied: "+url);}catch{alert(url);}
}

async function boot(){
  PATCH_DATA = await (await fetch("./patches.json")).json();
  document.querySelector("#patchSelect").innerHTML=PATCH_DATA.map(p=>`<option value="${p.id}">${p.id} — ${p.name}</option>`).join("");
  document.querySelector("#patchSelect").onchange=e=>load(PATCH_DATA.find(p=>p.id===e.target.value));
  document.querySelector("#nextHuman").onclick=changePlayer;
  document.querySelector("#share").onclick=share;
  document.querySelector("#rotate90").onclick=()=>preview(1);
  document.querySelector("#rotate180").onclick=()=>preview(2);
  document.querySelector("#rotate270").onclick=()=>preview(3);
  document.querySelector("#commit").onclick=commitMove;
  const hash=location.hash.slice(1);
  load(PATCH_DATA.find(p=>p.id===hash)||PATCH_DATA[0]);
  document.querySelector("#version").textContent=String(stateVersion);
  const originalRender=render;
  render=function(){originalRender();document.querySelector("#version").textContent=String(stateVersion);};
  render();
}
boot().catch(err => {
  document.querySelector("#patchName").textContent = "Failed to load patches.json";
  console.error(err);
});
