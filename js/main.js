const WHATSAPP_NUMBER = "34614823021";

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
    urgente ? "🚨 *URGENCIA* - Solicitud desde la web" : "Solicitud desde la web",
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
