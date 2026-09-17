const WHATSAPP_NUMBER = "34614823021";

document.documentElement.classList.remove("no-js");

// Menú móvil
const toggle = document.getElementById("menuToggle");
const nav = document.getElementById("nav");

toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});

nav.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  })
);

// Año actual en el pie
document.getElementById("year").textContent = new Date().getFullYear();

// Formulario de urgencias -> WhatsApp
const form = document.getElementById("urgentForm");

function setError(input, message) {
  const field = input.closest(".field");
  field.classList.toggle("invalid", Boolean(message));
  field.querySelector(".error").textContent = message;
}

function validate() {
  let valid = true;
  const checks = [
    ["nombre", (v) => v.length >= 2, "Escribe tu nombre."],
    ["telefono", (v) => v.replace(/\D/g, "").length >= 9, "Escribe un teléfono válido."],
    ["zona", (v) => v.length >= 2, "Indica tu zona o dirección."],
    ["averia", (v) => v !== "", "Selecciona el tipo de avería."],
  ];

  for (const [id, test, message] of checks) {
    const input = document.getElementById(id);
    const ok = test(input.value.trim());
    setError(input, ok ? "" : message);
    if (!ok && valid) input.focus();
    valid = valid && ok;
  }
  return valid;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validate()) return;

  const data = new FormData(form);
  const urgente = document.getElementById("urgente").checked;
  const lines = [
    urgente ? "*URGENCIA* - Solicitud desde la web" : "Solicitud desde la web",
    "",
    `*Nombre:* ${data.get("nombre").trim()}`,
    `*Teléfono:* ${data.get("telefono").trim()}`,
    `*Zona:* ${data.get("zona").trim()}`,
    `*Avería:* ${data.get("averia")}`,
  ];
  const descripcion = data.get("descripcion").trim();
  if (descripcion) lines.push(`*Descripción:* ${descripcion}`);

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url, "_blank", "noopener");
});

form.querySelectorAll("input, select").forEach((input) =>
  input.addEventListener("input", () => {
    if (input.closest(".field")?.classList.contains("invalid")) setError(input, "");
  })
);

// Aparición al hacer scroll
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
  el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 5) * 70}ms`;
  revealObserver.observe(el);
});

// Inclinación 3D de tarjetas
const canTilt =
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canTilt) {
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.transition = "transform .08s, box-shadow .3s, border-color .3s";
      card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 12}deg) translateZ(0)`;
      card.style.setProperty("--mx", `${x * 100}%`);
      card.style.setProperty("--my", `${y * 100}%`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.transition = "transform .6s cubic-bezier(.2,.8,.2,1), box-shadow .3s, border-color .3s";
      card.style.transform = "";
    });
  });
}
