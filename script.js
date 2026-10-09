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
const gallery=document.querySelector('#gallery-dialog');if(gallery){const cards=[...document.querySelectorAll('.work-card')],photo=gallery.querySelector('img'),counter=gallery.querySelector('.gallery-count');let current=0;const show=i=>{current=(i+cards.length)%cards.length;photo.src=cards[current].dataset.full;photo.alt=cards[current].querySelector('img').alt;counter.textContent=`${current+1} / ${cards.length}`};cards.forEach((card,i)=>card.addEventListener('click',()=>{show(i);gallery.showModal()}));gallery.querySelector('.gallery-close').addEventListener('click',()=>gallery.close());gallery.querySelector('.gallery-prev').addEventListener('click',()=>show(current-1));gallery.querySelector('.gallery-next').addEventListener('click',()=>show(current+1));gallery.addEventListener('click',e=>{if(e.target===gallery)gallery.close()});gallery.addEventListener('keydown',e=>{if(e.key==='ArrowRight')show(current+1);if(e.key==='ArrowLeft')show(current-1)})}

// Progressive enhancement: content remains available without animation support.
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const targets = [...document.querySelectorAll('.intro-main,.about-visual,.section-heading,.service-card,.partners h2,.statement blockquote,.work-heading,.work-card,.approach-layout,.contact-intro,.quote-form,.story-heading,.story-layout,.project-end')];
if ('IntersectionObserver' in window && !motion.matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
  }), {threshold: 0.08});
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
