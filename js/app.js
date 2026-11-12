(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  let result=null,steps=[],stepIndex=0,autoTimer=null,plainText="";
  function setError(message){$("errorMessage").textContent=message||"";}
  function updateCount(){$("charCount").textContent=$("messageInput").value.length+" / 512";}
  function stopAuto(){if(autoTimer){clearInterval(autoTimer);autoTimer=null;}$("playBtn").textContent="▶ Auto play";}
  function updateButtons(){
    const ready=steps.length>0;
    $("prevStepBtn").disabled=!ready||stepIndex<=0;
    $("nextStepBtn").disabled=!ready||stepIndex>=steps.length-1;
    $("playBtn").disabled=!ready;
    $("copyCipherBtn").disabled=!result;
    $("copyPlainBtn").disabled=!result;
  }
  function showStep(index){
    if(!steps.length)return;
    stepIndex=Math.max(0,Math.min(index,steps.length-1));
    Visualizer.renderStep(steps[stepIndex],stepIndex,steps.length);
    Visualizer.renderTimeline(steps,stepIndex);
    updateButtons();
  }
  function runEncryption(){
    stopAuto();setError();
    try{
      plainText=$("messageInput").value;
      if(!plainText.length)throw new Error("Enter a message before starting the simulation.");
      result=ChaCha20.encrypt(plainText,$("keyInput").value,$("nonceInput").value);
      steps=Simulation.build(result);stepIndex=0;
      $("cipherOutput").textContent=result.hex.match(/.{1,2}/g).join(" ");
      $("cipherMeta").textContent=result.bytes.length+" BYTES GENERATED · HEX ENCODED";
      $("plainOutput").textContent="Decrypt to recover the original message.";
      $("plainMeta").textContent="WAITING FOR DECRYPTION";
      showStep(0);
      $("timelineStatus").textContent="SIMULATION INITIALIZED";
      $("stateStatus").textContent="ENGINE ACTIVE";
      $("workbench").scrollIntoView({behavior:"smooth",block:"start"});
    }catch(e){setError(e.message);}
  }
  function decryptCurrent(){
    stopAuto();setError();
    if(!result){setError("Run encryption first. The engine needs a ciphertext to reverse.");return;}
    try{
      const decrypted=ChaCha20.decrypt(result.hex,$("keyInput").value,$("nonceInput").value);
      $("plainOutput").textContent=decrypted.text||"(empty message)";
      $("plainMeta").textContent=decrypted.bytes.length+" BYTES RECOVERED · "+(decrypted.text===plainText?"MATCH CONFIRMED":"CHECK INPUTS");
      if(decrypted.text!==plainText)throw new Error("Recovered text differs. Check that the key and nonce have not changed.");
      $("stateStatus").textContent="DECRYPTION VERIFIED";
    }catch(e){setError(e.message);}
  }
  function goToRound(round){
    if(!steps.length)return;
    const idx=steps.findIndex(s=>s.round===round&&(s.type==="DIAGONAL ROUND"||s.type==="COLUMN ROUND"));
    if(idx>=0){stopAuto();showStep(idx);}
  }
  $("encryptBtn").addEventListener("click",runEncryption);
  $("decryptBtn").addEventListener("click",decryptCurrent);
  $("messageInput").addEventListener("input",updateCount);
  $("prevStepBtn").addEventListener("click",()=>{stopAuto();showStep(stepIndex-1);});
  $("nextStepBtn").addEventListener("click",()=>{stopAuto();showStep(stepIndex+1);});
  $("playBtn").addEventListener("click",()=>{
    if(autoTimer){stopAuto();return;}
    if(stepIndex>=steps.length-1)showStep(0);
    $("playBtn").textContent="Ⅱ Pause";
    autoTimer=setInterval(()=>{if(stepIndex>=steps.length-1){stopAuto();return;}showStep(stepIndex+1);},450);
  });
  $("randomKeyBtn").addEventListener("click",()=>{
    const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);$("keyInput").value=ChaCha20.bytesToHex(bytes);setError();
  });
  $("randomNonceBtn").addEventListener("click",()=>{
    const bytes=new Uint8Array(12);crypto.getRandomValues(bytes);$("nonceInput").value=ChaCha20.bytesToHex(bytes);setError();
  });
  $("copyCipherBtn").addEventListener("click",async()=>{if(result)await navigator.clipboard.writeText(result.hex);});
  $("copyPlainBtn").addEventListener("click",async()=>{if(result)await navigator.clipboard.writeText(plainText);});
  window.App={goToRound};
  updateCount();updateButtons();
})();
