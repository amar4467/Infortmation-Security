/* DOM rendering for the state matrix, step monitor and timeline. */
(function(global){
  "use strict";
  const $ = id => document.getElementById(id);
  const hex = n => (n>>>0).toString(16).padStart(8,"0");
  function renderMatrix(words, highlighted){
    const matrix=$("stateMatrix");
    matrix.innerHTML="";
    const roles=["CONST","CONST","CONST","CONST","KEY","KEY","KEY","KEY","KEY","KEY","KEY","KEY","COUNT","NONCE","NONCE","NONCE"];
    words.forEach((word,i)=>{
      const cell=document.createElement("div");
      cell.className="state-cell"+(highlighted && highlighted.includes(i)?" changed":"");
      cell.innerHTML=`<small>${i.toString().padStart(2,"0")}</small><strong>${hex(word)}</strong><em>${roles[i]}</em>`;
      matrix.appendChild(cell);
    });
  }
  function renderStep(step,index,total){
    $("operationSymbol").textContent=step.type==="XOR ENCRYPT"?"⊕":step.type==="FEED-FORWARD"?"＋":step.type==="INITIALIZE"?"▦":"↻";
    $("operationName").textContent=step.name;
    $("operationDescription").textContent=step.description;
    $("stepNumber").textContent=index+1+" / "+total;
    $("stepType").textContent=step.type;
    $("stepRound").textContent=step.round?String(step.round).padStart(2,"0")+"/20":"—";
    $("quip").textContent="“"+step.quip+"”";
    $("stateStatus").textContent="SIMULATION ACTIVE";
    $("roundLabel").textContent=step.round?"ROUND "+String(step.round).padStart(2,"0"):"INITIALIZATION";
    if(step.words) renderMatrix(step.words,step.indices||[]);
    else if(step.type==="XOR ENCRYPT") {
      $("stateStatus").textContent="BYTE STREAM XOR";
      $("roundLabel").textContent="MESSAGE COMBINATION";
    }
  }
  function renderTimeline(steps,index){
    const markers=$("roundMarkers");
    if(!markers.dataset.ready){
      markers.innerHTML="";
      for(let i=1;i<=20;i++){
        const b=document.createElement("button");b.className="round-marker";b.textContent=String(i).padStart(2,"0");b.title="Round "+i;
        b.addEventListener("click",()=>global.App.goToRound(i));
        markers.appendChild(b);
      }
      markers.dataset.ready="1";
    }
    const current=steps[index];
    const currentRound=current?current.round||0:0;
    [...markers.children].forEach((el,i)=>{
      el.classList.toggle("done",i+1<=currentRound);
      el.classList.toggle("selected",i+1===currentRound);
    });
    $("timelineProgress").innerHTML=`${currentRound} <small>/ 20 ROUNDS</small>`;
    $("timelineFill").style.width=(currentRound/20*100)+"%";
    $("timelineStatus").textContent=current?"STEP "+(index+1)+" OF "+steps.length:"NOT STARTED";
  }
  global.Visualizer={renderMatrix,renderStep,renderTimeline};
})(window);
