const menu = document.querySelector('#menu'), nav = document.querySelector('#nav');
function setMenu(open) {
  if (!menu || !nav) return;
  nav.classList.toggle('open', open);
  menu.dataset.open = String(open);
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
}
menu?.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
const year=document.querySelector('#year');if(year)year.textContent=new Date().getFullYear();
document.querySelector('#quote-form')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,status=document.querySelector('#form-status');const data=Object.fromEntries(new FormData(form));const key=window.VALB_WEB3FORMS_KEY||'';if(key){status.textContent='Envoi en cours…';try{const r=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,access_key:key,subject:'Nouvelle demande de devis — VALB-THERM',from_name:'Site VALB-THERM'})});const result=await r.json();if(!result.success)throw new Error('Échec de l’envoi');status.textContent='Votre demande a bien été envoyée. Merci !';form.reset()}catch{status.textContent='Envoi impossible. Appelez-nous au +41 79 697 49 66 ou écrivez à info@valb-therm.ch.'}}else{const subject=encodeURIComponent('Demande de devis VALB-THERM — '+data.service);const body=encodeURIComponent(`Nom : ${data.name}\nTéléphone : ${data.phone}\nE-mail : ${data.email}\nDomaine : ${data.service}\nProjet : ${data.project}\n\n${data.message}`);window.location.href=`mailto:info@valb-therm.ch?subject=${subject}&body=${body}`;status.textContent='Votre application e-mail va s’ouvrir avec votre demande préremplie. Vérifiez et envoyez le message.'}});
const gallery = document.querySelector('#gallery-dialog');
if (gallery) {
  const allCards = [...document.querySelectorAll('.work-card')];
  let cards = allCards;
  const photo = gallery.querySelector('img'), counter = gallery.querySelector('.gallery-count');
  let current = 0, photoAnimation;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const show = i => {
    const direction = i < current ? -1 : 1;
    current = (i + cards.length) % cards.length;
    photoAnimation?.cancel();
    photo.src = cards[current].dataset.full;
    photo.alt = cards[current].querySelector('img').alt;
    counter.textContent = `${current + 1} / ${cards.length}`;
    if (!reduced.matches && photo.animate) {
      photoAnimation = photo.animate([
        {opacity: .25, transform: `translateX(${direction * 18}px) scale(.985)`},
        {opacity: 1, transform: 'translateX(0) scale(1)'}
      ], {duration: 380, easing: 'cubic-bezier(.2,.65,.3,1)'});
    }
  };
  allCards.forEach(card => card.addEventListener('click', () => {
    const category = card.closest('.project-gallery');
    cards = category ? [...category.querySelectorAll('.work-card')] : allCards;
    gallery.setAttribute('aria-label', category?.querySelector('h2')?.textContent.trim() || 'Photo de réalisation');
    show(cards.indexOf(card));
    gallery.showModal();
    document.body.classList.add('gallery-open');
  }));
  gallery.querySelector('.gallery-close').addEventListener('click', () => gallery.close());
  gallery.querySelector('.gallery-prev').addEventListener('click', () => show(current - 1));
  gallery.querySelector('.gallery-next').addEventListener('click', () => show(current + 1));
  gallery.addEventListener('click', e => {if (e.target === gallery) gallery.close();});
  gallery.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') {e.preventDefault();show(current + 1);}
    if (e.key === 'ArrowLeft') {e.preventDefault();show(current - 1);}
  });
  gallery.addEventListener('close', () => {photoAnimation?.cancel();document.body.classList.remove('gallery-open');});
  reduced.addEventListener('change', () => {if (reduced.matches) photoAnimation?.cancel();});
}

// Progressive enhancement: content remains available without animation support.
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const targets = [...document.querySelectorAll('.intro-main,.about-visual,.section-heading,.service-card,.partners h2,.statement blockquote,.work-heading,.work-card,.approach-layout,.contact-intro,.quote-form,.story-heading,.story-layout,.project-end,.principles>div,.project-steps li,.expertise-row,.renewable-photo,.renewable-copy')];
if ('IntersectionObserver' in window && !motion.matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
  }), {threshold: 0.08});
  document.querySelectorAll('.service-list,.work-grid,.principles,.project-steps').forEach(group => {
    [...group.children].forEach((child, index) => {
      child.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 90}ms`);
    });
  });
  targets.forEach(target => {target.classList.add('reveal');observer.observe(target);});
  document.documentElement.classList.add('motion-ready');
  motion.addEventListener('change', () => {
    if (motion.matches) {document.documentElement.classList.remove('motion-ready');observer.disconnect();}
  });
}
const progress = document.querySelector('.scroll-progress');
const hero = document.querySelector('.hero');
const heroPhoto = document.querySelector('.hero-photo');
let ticking = false;
function updateScroll() {
  const range = document.documentElement.scrollHeight - window.innerHeight;
  if (progress) progress.style.transform = `scaleX(${range > 0 ? window.scrollY / range : 0})`;
  if (heroPhoto && !motion.matches && window.scrollY < hero.offsetHeight) {
    heroPhoto.style.translate = `0 ${Math.min(window.scrollY * .12, 100)}px`;
  }
  ticking = false;
}
window.addEventListener('scroll', () => {
  if (!ticking) {requestAnimationFrame(updateScroll);ticking = true;}
}, {passive: true});
window.addEventListener('resize', updateScroll, {passive: true});
updateScroll();
// Escape, desktop resizing and in-page links all close the mobile navigation.
function closeMenu() { setMenu(false); }
document.addEventListener('keydown', e => {if (e.key === 'Escape') closeMenu();});
window.addEventListener('resize', () => {if (window.innerWidth > 850) closeMenu();});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

// Glass follows the pointer only on devices with a precise hovering input.
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const glassCards = [...document.querySelectorAll('.service-card')];
const resetCard = card => {
  card.style.removeProperty('--tilt-x');card.style.removeProperty('--tilt-y');
  card.style.removeProperty('--light-x');card.style.removeProperty('--light-y');
};
for (const card of glassCards) {
  let frame = 0, pointerX = 0, pointerY = 0;
  card.addEventListener('pointermove', event => {
    if (motion.matches || !finePointer.matches || event.pointerType === 'touch') return;
    pointerX = event.clientX;pointerY = event.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (motion.matches || !finePointer.matches) return;
      const rect = card.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (pointerX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (pointerY - rect.top) / rect.height));
      card.style.setProperty('--tilt-x', `${(0.5 - y) * 4}deg`);
      card.style.setProperty('--tilt-y', `${(x - 0.5) * 4}deg`);
      card.style.setProperty('--light-x', `${x * 100}%`);
      card.style.setProperty('--light-y', `${y * 100}%`);
    });
  }, {passive: true});
  card.addEventListener('pointerleave', () => {cancelAnimationFrame(frame);frame = 0;resetCard(card);});
}
const activeRipples = new Set();
document.querySelectorAll('.btn,.header-cta,.gallery-dialog button,#menu').forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (motion.matches || !button.animate) return;
    const rect = button.getBoundingClientRect(), size = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('span');ripple.className = 'glass-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    Object.assign(ripple.style, {
      width: `${size}px`, height: `${size}px`,
      left: `${event.clientX - rect.left - size / 2}px`,
      top: `${event.clientY - rect.top - size / 2}px`
    });
    button.append(ripple);
    const animation = ripple.animate([{transform:'scale(0)',opacity:.24},{transform:'scale(1)',opacity:0}],
      {duration:600,easing:'cubic-bezier(.2,.65,.3,1)'});
    activeRipples.add(animation);
    animation.finished.catch(() => {}).finally(() => {ripple.remove();activeRipples.delete(animation);});
  }, {passive: true});
});
const resetInteractionMotion = () => {
  if (motion.matches || !finePointer.matches) glassCards.forEach(resetCard);
  if (motion.matches) {
    activeRipples.forEach(animation => animation.cancel());
    heroPhoto?.style.removeProperty('translate');
  }
};
motion.addEventListener('change', resetInteractionMotion);
finePointer.addEventListener('change', resetInteractionMotion);

// One native scroll-snap carousel per reviews section; the original grid is the no-JS fallback.
for (const section of document.querySelectorAll('.reviews-immersive')) {
  const track = section.querySelector('.reviews-grid');
  const slides = [...track.querySelectorAll('.review-card')];
  if (slides.length < 2) continue;
  let current = 0, elapsed = 0, previousTime = 0, frame = 0, scrollTimer = 0;
  let inView = false, hovered = false, focused = false, interacting = false;
  let userPaused = motion.matches;
  const duration = 7000;
  const icon = name => `<svg class="ui-icon" aria-hidden="true" viewBox="0 0 24 24"><use href="assets/icons.svg#${name}"></use></svg>`;
  const controls = document.createElement('div'); controls.className = 'review-controls';
  controls.innerHTML = `<div class="review-navigation"><span class="review-counter" aria-live="off"></span><button type="button" aria-label="Avis précédent">${icon('previous')}</button><button type="button" aria-label="Avis suivant">${icon('next')}</button></div><button class="review-pause" type="button"></button>`;
  const pagination = document.createElement('div'); pagination.className = 'review-pagination';
  pagination.setAttribute('role', 'group'); pagination.setAttribute('aria-label', 'Choisir un témoignage');
  const tabs = slides.map((slide, index) => {
    const button = document.createElement('button'); button.type = 'button';button.className = 'review-tab';
    const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
    button.append(number, document.createTextNode(slide.querySelector('h3').textContent.trim()));
    button.setAttribute('aria-label', `Afficher l’avis de ${slide.querySelector('h3').textContent.trim()}`);
    button.addEventListener('click', () => go(index)); pagination.append(button); return button;
  });
  track.after(controls, pagination);
  section.classList.add('reviews-enhanced');
  track.setAttribute('role', 'region');track.setAttribute('aria-roledescription', 'carrousel');
  track.setAttribute('aria-label', 'Témoignages clients'); track.tabIndex = 0;
  const pause = controls.querySelector('.review-pause');
  const counter = controls.querySelector('.review-counter');
  const navigation = controls.querySelectorAll('.review-navigation button');
  const canPlay = () => !userPaused && !motion.matches && inView && !hovered && !focused && !interacting && !document.hidden;
  const syncPlayback = () => {
    const playing = canPlay();
    section.classList.toggle('reviews-autoplay', !userPaused && !motion.matches);
    section.classList.toggle('reviews-playing', playing);
    pause.disabled = motion.matches;
    pause.setAttribute('aria-label', motion.matches ? 'Animations réduites selon vos préférences' : userPaused ? 'Activer le défilement automatique' : 'Mettre le défilement automatique en pause');
    pause.setAttribute('aria-pressed', String(!userPaused));
    pause.innerHTML = motion.matches ? 'Animations réduites' : userPaused ? '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="m7 4 9 6-9 6Z"/></svg> Lecture auto' : '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="M7 4v12M13 4v12"/></svg> Mettre en pause';
    cancelAnimationFrame(frame); previousTime = 0;
    if (playing) frame = requestAnimationFrame(tick);
  };
  const select = (index, animate = true) => {
    if (current !== index) elapsed = 0;
    current = index;
    tabs.forEach((tab, i) => tab.setAttribute('aria-current', String(i === current)));
    slides.forEach((slide, i) => {
      slide.setAttribute('role', 'group');slide.setAttribute('aria-roledescription', 'diapositive');
      slide.setAttribute('aria-label', `${i + 1} sur ${slides.length}`);
      slide.inert = i !== current;
    });
    counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    if (animate && !motion.matches) {
      const elements = slides[current].querySelectorAll('.review-author, blockquote, a');
      elements.forEach((element, i) => element.animate([{opacity:.15, transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}], {duration:650,delay:i*90,easing:'cubic-bezier(.2,.65,.3,1)'}));
    }
  };
  function go(index) {
    const next = (index + slides.length) % slides.length;
    if (next !== current) select(next);
    elapsed = 0;
    track.scrollTo({left: next * track.clientWidth, behavior: 'instant'});
  }
  function tick(time) {
    if (!canPlay()) {previousTime=0; return;}
    if (previousTime) elapsed += Math.min(time - previousTime, 100);
    previousTime = time;
    if (elapsed >= duration) go(current + 1);
    frame = requestAnimationFrame(tick);
  }
  navigation[0].addEventListener('click', () => go(current - 1));
  navigation[1].addEventListener('click', () => go(current + 1));
  pause.addEventListener('click', () => {userPaused = !userPaused; elapsed = 0;syncPlayback();});
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {event.preventDefault();go(current + (event.key === 'ArrowRight' ? 1 : -1));}
  });
  track.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer=setTimeout(() => {
      const index = Math.round(track.scrollLeft / track.clientWidth);
      if (index >= 0 && index < slides.length && index !== current) select(index);
    }, 160);
  }, {passive:true});
  section.addEventListener('pointerenter', event => {if (event.pointerType !== 'touch') {hovered=true;syncPlayback();}});
  section.addEventListener('pointerleave', () => {hovered=false;syncPlayback();});
  section.addEventListener('focusin', () => {focused=true;syncPlayback();});
  section.addEventListener('focusout', event => {if (!section.contains(event.relatedTarget)) {focused=false;syncPlayback();}});
  track.addEventListener('pointerdown', () => {interacting=true;syncPlayback();}, {passive:true});
  const endInteraction = () => {if (interacting) {interacting=false;elapsed=0;syncPlayback();}};
  window.addEventListener('pointerup', endInteraction, {passive:true});
  window.addEventListener('pointercancel', endInteraction, {passive:true});
  document.addEventListener('visibilitychange', syncPlayback);
  motion.addEventListener('change', () => {
    userPaused=motion.matches;elapsed=0;
    if (motion.matches) slides.forEach(slide => slide.getAnimations({subtree:true}).forEach(animation => animation.cancel()));
    syncPlayback();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {inView=entries[0].isIntersecting;syncPlayback();}, {threshold:.18}).observe(section);
  } else {inView=true;}
  new ResizeObserver(() => {track.scrollTo({left:current*track.clientWidth,behavior:'instant'});}).observe(track);
  for (const slide of slides) {
    let lightFrame=0;
    slide.addEventListener('pointermove', event => {
      if (motion.matches || !finePointer.matches || lightFrame) return;
      const x=event.clientX,y=event.clientY;
      lightFrame=requestAnimationFrame(() => {
        lightFrame=0;const rect=slide.getBoundingClientRect();
        slide.style.setProperty('--review-light-x',`${x-rect.left}px`);slide.style.setProperty('--review-light-y',`${y-rect.top}px`);
      });
    }, {passive:true});
  }
  select(0, false);syncPlayback();
}
