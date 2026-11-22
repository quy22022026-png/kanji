(function (global) {
  'use strict';
  function attach(card, options) {
    if (!card) throw new Error('Missing flashcard element');
    let startX=0, startY=0, startAt=0, tracking=false, horizontal=false, locked=false, suppressClick=false;
    let activePointer=null;
    let suppressClickTimer=null;
    const armClickSuppression=()=>{
      suppressClick=true;
      if(suppressClickTimer) clearTimeout(suppressClickTimer);
      // Some Safari versions do not dispatch click after a pointer gesture.
      // Never let that stale flag swallow the user's next intentional tap.
      suppressClickTimer=setTimeout(()=>{suppressClick=false;suppressClickTimer=null;},140);
    };
    const clearClickSuppression=()=>{
      suppressClick=false;
      if(suppressClickTimer) clearTimeout(suppressClickTimer);
      suppressClickTimer=null;
    };
    const reset=()=>{
      card.classList.remove('swiping-again','swiping-good');
      card.style.transform='';
      card.style.transition='';
      card.style.opacity='';
    };
    card.addEventListener('pointerdown', e=>{
      if(suppressClick) clearClickSuppression();
      if (locked || options.isBusy() || e.button!==0 || e.target.closest('button,.tap-token,a,input,select')) return;
      tracking=true; horizontal=false; activePointer=e.pointerId;
      startX=e.clientX; startY=e.clientY; startAt=performance.now();
      card.style.transition='none';
    });
    card.addEventListener('pointermove', e=>{
      if(!tracking || e.pointerId!==activePointer) return;
      const dx=e.clientX-startX,dy=e.clientY-startY;
      if(!horizontal && Math.abs(dy)>14 && Math.abs(dy)>Math.abs(dx)){tracking=false;reset();return;}
      if(Math.abs(dx)>12 && Math.abs(dx)>Math.abs(dy)*1.15) horizontal=true;
      if(!horizontal) return;
      suppressClick=true;
      card.classList.toggle('swiping-again',dx<0);
      card.classList.toggle('swiping-good',dx>0);
      // Never move the outer card off viewport: prevents Safari horizontal layout jumps.
      card.style.transform=`translate3d(${Math.max(-38,Math.min(38,dx*.18))}px,0,0) rotate(${Math.max(-3,Math.min(3,dx*.012))}deg)`;
    });
    const end=e=>{
      if(!tracking || e.pointerId!==activePointer) return;
      tracking=false;
      const dx=e.clientX-startX,dy=e.clientY-startY;
      const velocity=Math.abs(dx)/Math.max(1,performance.now()-startAt);
      const accept=horizontal && Math.abs(dx)>Math.abs(dy) &&
        (Math.abs(dx)>=Math.max(64,card.clientWidth*.25) || (Math.abs(dx)>=36 && velocity>=.65));
      reset();
      if(horizontal) armClickSuppression();
      if(accept && !locked && !options.isBusy()){
        locked=true;
        try { if(dx<0) options.onAgain(); else options.onGood(); }
        finally { locked=false; }
      }
    };
    card.addEventListener('pointerup',end);
    card.addEventListener('pointercancel',()=>{tracking=false;horizontal=false;reset();clearClickSuppression();});
    card.addEventListener('click',e=>{
      if(e.target.closest('button,.tap-token,a,input,select'))return;
      if(suppressClick){clearClickSuppression();return;}
      if(!options.isBusy())options.onFlip();
    });
    return {reset,clearClickSuppression};
  }
  global.KawaiiFlashcardInteraction=Object.freeze({attach});
})(window);
