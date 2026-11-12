/* Turns cryptographic trace records into a navigable teaching sequence. */
(function(global){
  "use strict";
  const quips = [
    "The bits are stretching. Give them a second.",
    "Four words walk into a quarter-round. The rest is modular arithmetic.",
    "Column round complete. The columns have been thoroughly rearranged.",
    "Diagonal round! Because straight lines were getting predictable.",
    "XOR: the operation that knows how to undo itself.",
    "Feed-forward complete. Original state, meet your transformed self."
  ];
  function build(result){
    const steps = [];
    let round = 0;
    result.trace.forEach((item,index)=>{
      if(item.type==="COLUMN ROUND" || item.type==="DIAGONAL ROUND") round=item.round;
      steps.push({...item,step:index+1,round:item.round || round,quip:quips[index%quips.length]});
    });
    return steps;
  }
  global.Simulation = {build};
})(window);
