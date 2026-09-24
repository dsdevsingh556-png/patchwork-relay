const DIRS = [[-1,0,1,4],[0,1,2,8],[1,0,4,1],[0,-1,8,2]];
const CANON={I:5,C:3,T:11,H:15};
const STRUCTURAL=["CORE_JOIN","MERGE","GAIN_LOOP","CLEAN_TWO","GAIN_LINK","EXACT_TWO"];

function rotateMask(mask,steps){let m=mask;for(let i=0;i<steps%4;i++){let o=0;if(m&1)o|=2;if(m&2)o|=4;if(m&4)o|=8;if(m&8)o|=1;m=o;}return m;}
function tileMask(tile){if(tile==="__")return 0;return rotateMask(CANON[tile[0]],Number(tile.slice(1)));}
function cloneBoard(b){return b.map(r=>[...r]);}
function rotateTile(tile,steps){
  const type=tile[0], next=rotateMask(tileMask(tile),steps);
  for(let k=0;k<4;k++){
    if(rotateMask(CANON[type],k)===next){
      if(type==="I"&&k>=2)return `I${k%2}`;
      if(type==="H")return "H0";
      return `${type}${k}`;
    }
  }
  throw new Error("rotation failed");
}
function applySingleMove(board,row,col,steps){
  const next=cloneBoard(board); next[row][col]=rotateTile(next[row][col],steps); return next;
}
function computeMetrics(board){
  const key=(r,c)=>`${r},${c}`, occ=new Set(), adj=new Map();
  let edges=0,loose=0,boundary=0;
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){
    if(board[r][c]==="__")continue;
    const k=key(r,c);occ.add(k);adj.set(k,new Set());
  }
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){
    const t=board[r][c];if(t==="__")continue;
    const mask=tileMask(t);
    for(const [dr,dc,bit,opp] of DIRS){
      if(!(mask&bit))continue;
      const nr=r+dr,nc=c+dc;
      if(nr<0||nr>=4||nc<0||nc>=4){loose++;boundary++;continue;}
      const other=board[nr][nc];
      if(other!=="__"&&(tileMask(other)&opp)){
        adj.get(key(r,c)).add(key(nr,nc));
        if(dr>0||dc>0)edges++;
      }else loose++;
    }
  }
  let components=0;const seen=new Set();
  for(const start of occ){
    if(seen.has(start))continue;components++;
    const stack=[start];seen.add(start);
    while(stack.length){const x=stack.pop();for(const y of adj.get(x))if(!seen.has(y)){seen.add(y);stack.push(y);}}
  }
  const cycles=Math.max(0,edges-occ.size+components);
  const core=["1,1","1,2","2,1","2,2"];let coreConnected=false;
  if(core.every(k=>occ.has(k))){
    const stack=["1,1"], seenCore=new Set(["1,1"]);
    while(stack.length){const x=stack.pop();for(const y of adj.get(x))if(!seenCore.has(y)){seenCore.add(y);stack.push(y);}}
    coreConnected=core.every(k=>seenCore.has(k));
  }
  return {matchedEdges:edges,looseEnds:loose,boundaryOpen:boundary,components,cycles,coreConnected};
}
function challengePass(ch,b,a,move){
  switch(ch.mode){
    case "GAIN_LINK": return a.matchedEdges>=b.matchedEdges+1&&a.looseEnds<=b.looseEnds+1;
    case "CLEAN_TWO": return a.looseEnds<=b.looseEnds-2&&a.matchedEdges>=b.matchedEdges;
    case "MERGE": return b.components>1&&a.components<=b.components-1&&a.matchedEdges>=b.matchedEdges;
    case "GAIN_LOOP": return a.cycles>=b.cycles+1&&a.components<=b.components;
    case "CORE_JOIN": return !b.coreConnected&&a.coreConnected&&a.matchedEdges>=b.matchedEdges;
    case "EXACT_TWO": return a.matchedEdges===b.matchedEdges+2&&a.looseEnds<=b.looseEnds+1;
    case "REWIRE":
      return ch.focus&&Math.max(Math.abs(move.row-ch.focus.row),Math.abs(move.col-ch.focus.col))<=1&&
             a.matchedEdges>=b.matchedEdges-1&&a.looseEnds<=b.looseEnds+1&&a.components<=b.components+1;
  }
}
function enumMoves(board,ch){
  const b=computeMetrics(board),out=[];
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){
    if(board[r][c]==="__")continue;
    for(const k of [1,2,3]){
      const cand=applySingleMove(board,r,c,k),a=computeMetrics(cand);
      if(challengePass(ch,b,a,{row:r,col:c}))out.push({row:r,col:c,k,cand,after:a});
    }
  }
  return out;
}
function hash32(s){let h=2166136261>>>0;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function chooseRewireFocus(board,patchId,version){
  const choices=[];
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){
    const focus={row:r,col:c,radius:1},moves=enumMoves(board,{mode:"REWIRE",focus});
    if(!moves.length)continue;
    choices.push({focus,moves,penalty:(moves.length>=2&&moves.length<=6)?0:1,
      distance:Math.abs(r-1.5)+Math.abs(c-1.5),hash:hash32(`${patchId}:${version}:${r}:${c}`)});
  }
  if(!choices.length)return null;
  choices.sort((a,b)=>a.penalty-b.penalty||a.distance-b.distance||
    Math.min(a.moves.length,6)-Math.min(b.moves.length,6)||a.hash-b.hash);
  return choices[0];
}
function chooseNextChallenge(board,patchId,version,previous){
  const available=[];
  for(const mode of STRUCTURAL){
    const spec={mode},moves=enumMoves(board,spec);if(moves.length)available.push({spec,moves});
  }
  const alternatives=available.filter(x=>x.spec.mode!==previous.mode),pool=alternatives.length?alternatives:available;
  if(pool.length){
    const pri={CORE_JOIN:100,MERGE:75,GAIN_LOOP:55,CLEAN_TWO:40,GAIN_LINK:30,EXACT_TWO:20};
    pool.sort((a,b)=>{
      const pa=pri[a.spec.mode]+((a.moves.length>=2&&a.moves.length<=6)?12:0);
      const pb=pri[b.spec.mode]+((b.moves.length>=2&&b.moves.length<=6)?12:0);
      return pb-pa||a.moves.length-b.moves.length;
    });
    return pool[0].spec;
  }
  const fb=chooseRewireFocus(board,patchId,version);
  return fb?{mode:"REWIRE",focus:fb.focus}:null;
}
