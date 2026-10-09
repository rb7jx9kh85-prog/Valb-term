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
  const cards = [...document.querySelectorAll('.work-card')];
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
  cards.forEach((card, i) => card.addEventListener('click', () => {show(i);gallery.showModal();}));
  gallery.querySelector('.gallery-close').addEventListener('click', () => gallery.close());
  gallery.querySelector('.gallery-prev').addEventListener('click', () => show(current - 1));
  gallery.querySelector('.gallery-next').addEventListener('click', () => show(current + 1));
  gallery.addEventListener('click', e => {if (e.target === gallery) gallery.close();});
  gallery.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') {e.preventDefault();show(current + 1);}
    if (e.key === 'ArrowLeft') {e.preventDefault();show(current - 1);}
  });
  gallery.addEventListener('close', () => photoAnimation?.cancel());
  reduced.addEventListener('change', () => {if (reduced.matches) photoAnimation?.cancel();});
}

// Progressive enhancement: content remains available without animation support.
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const targets = [...document.querySelectorAll('.intro-main,.about-visual,.section-heading,.service-card,.partners h2,.statement blockquote,.work-heading,.work-card,.approach-layout,.contact-intro,.quote-form,.story-heading,.story-layout,.project-end,.principles>div,.project-steps li')];
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
