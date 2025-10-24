// Lightweight ripple utility. Clickable elements need data-ripple attribute.
// Based on common ripple patterns: position-aware span + transform/opacity transition. [web:56][web:63]
export function attachRipple(el) {
  el.style.position = el.style.position || "relative";
  el.style.overflow = el.style.overflow || "hidden";
  el.addEventListener("pointerdown", (event) => {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.2;
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    el.appendChild(ripple);
    requestAnimationFrame(() => {
      ripple.classList.add("run");
    });
    const cleanup = () => {
      ripple.classList.add("fade");
      setTimeout(() => ripple.remove(), 300);
      el.removeEventListener("pointerup", cleanup);
      el.removeEventListener("pointerleave", cleanup);
    };
    el.addEventListener("pointerup", cleanup);
    el.addEventListener("pointerleave", cleanup);
  });
}
