/* =========================================================
   Zeeshan Ali — Portfolio Scripts
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* ---- 1. Footer year ---- */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---- 2. Navbar background on scroll ---- */
  const nav = document.getElementById("nav");
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  });

  /* ---- 3. Mobile menu toggle ---- */
  const burger = document.getElementById("burger");
  const navLinks = document.getElementById("navLinks");
  burger.addEventListener("click", () => {
    burger.classList.toggle("open");
    navLinks.classList.toggle("open");
  });
  // Close menu when a link is clicked
  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      burger.classList.remove("open");
      navLinks.classList.remove("open");
    });
  });

  /* ---- 4. Button ripple click animation ---- */
  document.querySelectorAll(".btn").forEach(btn => {
    btn.addEventListener("click", function (e) {
      const circle = document.createElement("span");
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      circle.style.width = circle.style.height = size + "px";
      circle.style.left = e.clientX - rect.left - size / 2 + "px";
      circle.style.top = e.clientY - rect.top - size / 2 + "px";
      circle.classList.add("ripple");
      this.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    });
  });

  /* ---- 5. Reveal-on-scroll animation ---- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // small stagger for nicer effect
        setTimeout(() => entry.target.classList.add("visible"), i * 60);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

  /* ---- 6. Active nav link highlighting ---- */
  const sections = document.querySelectorAll("section[id]");
  const navItems = document.querySelectorAll(".nav__link");
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navItems.forEach(item => {
          item.classList.toggle("is-active", item.getAttribute("href") === "#" + id);
        });
      }
    });
  }, { threshold: 0.5 });
  sections.forEach(s => sectionObserver.observe(s));

  /* ---- 7. Animated counters in hero ---- */
  const counters = document.querySelectorAll(".stat__num");
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = +el.dataset.count;
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 40));
      const tick = () => {
        current += step;
        if (current >= target) { el.textContent = target; }
        else { el.textContent = current; requestAnimationFrame(tick); }
      };
      tick();
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.6 });
  counters.forEach(c => counterObserver.observe(c));

  /* ---- 8. Contact form validation ---- */
  const form = document.getElementById("contactForm");
  const success = document.getElementById("formSuccess");

  const showError = (id, msg) => {
    const input = document.getElementById(id);
    const errEl = document.querySelector(`.field__error[data-for="${id}"]`);
    input.classList.add("invalid");
    errEl.textContent = msg;
  };
  const clearError = (id) => {
    const input = document.getElementById(id);
    const errEl = document.querySelector(`.field__error[data-for="${id}"]`);
    input.classList.remove("invalid");
    errEl.textContent = "";
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    ["name", "email", "message"].forEach(clearError);
    success.classList.remove("show");

    if (name.length < 2) { showError("name", "Please enter your name."); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError("email", "Enter a valid email."); valid = false; }
    if (message.length < 10) { showError("message", "Message is a bit short."); valid = false; }

    if (valid) {
      // No backend — simulate a successful send.
      form.reset();
      success.classList.add("show");
      setTimeout(() => success.classList.remove("show"), 5000);
    }
  });

  // Clear an error as soon as the user starts fixing the field
  ["name", "email", "message"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => clearError(id));
  });

});
