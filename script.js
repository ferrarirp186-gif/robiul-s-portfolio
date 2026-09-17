(() => {
  'use strict';

  // 1. Background Canvas Smooth Scroll Animation
  const canvas = document.getElementById('scroll-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const img = new Image();
    img.src = 'img/main image.png';

    let isImageLoaded = false;
    let dpr = 1;

    // Physics interpolation state
    let targetProgress = 0;
    let currentProgress = 0;
    const ease = 0.065;

    // Pointer parallax
    let targetMouseX = 0, targetMouseY = 0;
    let currentMouseX = 0, currentMouseY = 0;

    function smoothstep(e0, e1, x) {
      const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
      return t * t * (3 - 2 * t);
    }

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function getScale(p) {
      if (p < 0.50) {
        const t = smoothstep(0, 0.50, p);
        return lerp(1.06, 1.70, t);
      } else {
        const t = smoothstep(0.50, 1.0, p);
        return lerp(1.70, 1.15, t);
      }
    }

    function getFocalPoint(p) {
      let fx, fy;
      if (p < 0.35) {
        const t = smoothstep(0, 0.35, p);
        fx = lerp(0.52, 0.74, t);
        fy = lerp(0.50, 0.44, t);
      } else if (p < 0.75) {
        const t = smoothstep(0.35, 0.75, p);
        fx = lerp(0.74, 0.68, t);
        fy = lerp(0.44, 0.62, t);
      } else {
        const t = smoothstep(0.75, 1.0, p);
        fx = lerp(0.68, 0.56, t);
        fy = lerp(0.62, 0.50, t);
      }
      return { fx, fy };
    }

    function getRotation(p) {
      return Math.sin(p * Math.PI * 1.5) * 0.035;
    }

    function resizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    function onScroll() {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        targetProgress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      }
    }

    function onPointerMove(e) {
      const x = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : window.innerWidth / 2);
      const y = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : window.innerHeight / 2);
      targetMouseX = (x / window.innerWidth - 0.5) * 2;
      targetMouseY = (y / window.innerHeight - 0.5) * 2;
    }

    function draw() {
      if (!isImageLoaded) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.save();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = w / h;
      let baseW, baseH;

      if (canvasAspect > imgAspect) {
        baseW = w;
        baseH = w / imgAspect;
      } else {
        baseH = h;
        baseW = h * imgAspect;
      }

      const rotSafety = 1.06;
      const scale = getScale(currentProgress) * rotSafety;
      const rotation = getRotation(currentProgress) + currentMouseX * 0.012;

      let { fx, fy } = getFocalPoint(currentProgress);

      const minFx = (w / (2 * baseW * scale));
      const maxFx = 1 - minFx;
      if (minFx < maxFx) {
        fx = Math.max(minFx, Math.min(maxFx, fx));
      } else {
        fx = 0.5;
      }

      const minFy = (h / (2 * baseH * scale));
      const maxFy = 1 - minFy;
      if (minFy < maxFy) {
        fy = Math.max(minFy, Math.min(maxFy, fy));
      } else {
        fy = 0.5;
      }

      const mouseOffsetX = currentMouseX * (18 * dpr);
      const mouseOffsetY = currentMouseY * (14 * dpr);

      ctx.translate(w / 2 + mouseOffsetX, h / 2 + mouseOffsetY);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);

      const drawX = -fx * baseW;
      const drawY = -fy * baseH;
      ctx.drawImage(img, drawX, drawY, baseW, baseH);

      // Subtle dynamic sunlight glow
      const sunProgress = Math.sin(currentProgress * Math.PI);
      if (sunProgress > 0.01) {
        const sunCenterX = (1 - fx) * baseW;
        const sunCenterY = -fy * baseH * 0.3;
        const glow = ctx.createRadialGradient(
          sunCenterX, sunCenterY, 30 * dpr,
          sunCenterX, sunCenterY, baseW * 0.75
        );
        glow.addColorStop(0, `rgba(255, 255, 255, ${0.12 * sunProgress})`);
        glow.addColorStop(0.6, `rgba(240, 253, 244, ${0.06 * sunProgress})`);
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = glow;
        ctx.fillRect(drawX, drawY, baseW, baseH);
      }

      ctx.restore();
    }

    function loop() {
      currentProgress += (targetProgress - currentProgress) * ease;
      if (Math.abs(targetProgress - currentProgress) < 0.00001) {
        currentProgress = targetProgress;
      }

      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      draw();

      requestAnimationFrame(loop);
    }

    window.addEventListener('resize', () => {
      resizeCanvas();
      onScroll();
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });

    img.onload = () => {
      isImageLoaded = true;
      resizeCanvas();
      onScroll();
      requestAnimationFrame(loop);
    };

    if (img.complete && img.naturalWidth !== 0) {
      img.onload();
    }
  }

  // 2. Navigation Scrollspy
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  function highlightNavOnScroll() {
    const scrollPos = window.scrollY + 180;
    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      const id = sec.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }
  window.addEventListener('scroll', highlightNavOnScroll, { passive: true });

  // 3. Mobile Navigation Drawer Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinksContainer = document.getElementById('nav-links');
  if (mobileToggle && navLinksContainer) {
    mobileToggle.addEventListener('click', () => {
      navLinksContainer.classList.toggle('mobile-open');
    });
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navLinksContainer.classList.remove('mobile-open');
      });
    });
  }

  // 4. Interactive ETP Wastewater Parameter Simulator
  const btnSimulate = document.getElementById('btn-simulate-test');
  if (btnSimulate) {
    btnSimulate.addEventListener('click', () => {
      const newPh = (6.8 + Math.random() * 0.8).toFixed(1);
      const newCod = Math.floor(55 + Math.random() * 40);
      const newBod = Math.floor(18 + Math.random() * 15);
      const newTss = Math.floor(25 + Math.random() * 30);
      const newTds = Math.floor(1250 + Math.random() * 350);

      const elPh = document.getElementById('val-ph');
      const elCod = document.getElementById('val-cod');
      const elBod = document.getElementById('val-bod');
      const elTss = document.getElementById('val-tss');
      const elTds = document.getElementById('val-tds');

      if (elPh) elPh.textContent = `${newPh} pH (Std: 6.5 - 8.5)`;
      if (elCod) elCod.textContent = `${newCod} mg/L (Limit: < 200 mg/L)`;
      if (elBod) elBod.textContent = `${newBod} mg/L (Limit: < 50 mg/L)`;
      if (elTss) elTss.textContent = `${newTss} mg/L (Limit: < 100 mg/L)`;
      if (elTds) elTds.textContent = `${newTds} mg/L (Limit: < 2100 mg/L)`;

      showToast('New ETP effluent lab test calibrated: 100% compliant!');
    });
  }

  // 5. Toast Notification & Copy Actions
  const toast = document.getElementById('toast-notice');
  const toastMsg = document.getElementById('toast-msg');

  function showToast(text) {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = text;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  const emailAddr = 'rabiulislam186@gmail.com';
  const linkedinUrl = 'https://www.linkedin.com/in/raibul-islam-tony-24171515b';
  const copyBtns = [
    document.getElementById('hero-copy-email-btn'),
    document.getElementById('contact-copy-btn')
  ];

  copyBtns.forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(emailAddr);
        showToast(`Email copied: ${emailAddr}`);
      } catch (err) {
        showToast(`Email: ${emailAddr}`);
      }
    });
  });

})();
