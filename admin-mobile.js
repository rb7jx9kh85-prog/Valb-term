(() => {
  const links = [...document.querySelectorAll('.admin-nav a[href^="#"]')];
  const sections = links.map(link => document.querySelector(link.getAttribute('href')));
  let scheduled = false;
  function update() {
    scheduled = false;
    if (document.querySelector('#admin-app').hidden) return;
    let active = 0;
    sections.forEach((section, index) => {
      if (section.getBoundingClientRect().top <= 150) active = index;
    });
    links.forEach((link, index) => {
      link.classList.toggle('active', index === active);
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  document.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }, {passive:true});
  links.forEach(link => link.addEventListener('click', () => {
    links.forEach(item => {
      item.classList.toggle('active', item === link);
      if (item === link) item.setAttribute('aria-current', 'location');
      else item.removeAttribute('aria-current');
    });
  }));
  update();
})();
