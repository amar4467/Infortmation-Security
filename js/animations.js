/* Small interface interactions; animation never changes cryptographic values. */
(function(){
  const toggle=document.getElementById("menuToggle");
  const nav=document.querySelector(".nav-links");
  toggle.addEventListener("click",()=>nav.classList.toggle("open"));
  nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));
  const art=document.querySelector(".hero-art");
  if(window.matchMedia("(pointer:fine)").matches){
    art.addEventListener("pointermove",e=>{
      const r=art.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      art.style.setProperty("--mx",x.toFixed(2));art.style.setProperty("--my",y.toFixed(2));
      const core=art.querySelector(".core-object");core.style.translate=`${x*12}px ${y*12}px`;
    });
    art.addEventListener("pointerleave",()=>{art.querySelector(".core-object").style.translate="0 0";});
  }
})();
