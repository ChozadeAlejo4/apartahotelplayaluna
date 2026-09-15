/* ==========================================================================
   APARTAHOTEL PLAYA LUNA — script.js
   Sticky nav · carruseles · WhatsApp · caída de textos al scrollear abajo
   ========================================================================== */

(function bootPlayaLuna() {
    if (window.__playaLunaV2) return;
    window.__playaLunaV2 = true;

    function start() {
        /* Siempre arrancar arriba al recargar */
        if ("scrollRestoration" in history) history.scrollRestoration = "manual";
        window.scrollTo(0, 0);

        const WHATSAPP_NUMBER = "50689413632";
        const MENSAJE_FLOTANTE = "Hola, vi su página del Apartahotel Playa Luna y quisiera más información.";
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const header = document.getElementById("siteHeader");
        const UMBRAL_SCROLL = 40;

        function actualizarEstadoHeader() {
            if (header) header.classList.toggle("is-scrolled", window.scrollY > UMBRAL_SCROLL);
        }
        actualizarEstadoHeader();
        window.addEventListener("scroll", actualizarEstadoHeader, { passive: true });

        const navToggle = document.getElementById("navToggle");
        const siteNav = document.getElementById("siteNav");
        if (navToggle && siteNav) {
            const abrirMenu = () => {
                siteNav.classList.add("is-open");
                navToggle.setAttribute("aria-expanded", "true");
            };
            const cerrarMenu = () => {
                siteNav.classList.remove("is-open");
                navToggle.setAttribute("aria-expanded", "false");
            };
            navToggle.addEventListener("click", () => {
                siteNav.classList.contains("is-open") ? cerrarMenu() : abrirMenu();
            });
            siteNav.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", cerrarMenu));
            document.addEventListener("click", (evento) => {
                if (siteNav.classList.contains("is-open") && !siteNav.contains(evento.target) && !navToggle.contains(evento.target)) {
                    cerrarMenu();
                }
            });
        }

        const secciones = document.querySelectorAll("main section[id]");
        const enlacesNav = document.querySelectorAll(".nav-link");
        const observadorSecciones = new IntersectionObserver((entradas) => {
            entradas.forEach((entrada) => {
                if (entrada.isIntersecting) {
                    const id = entrada.target.getAttribute("id");
                    enlacesNav.forEach((enlace) => {
                        enlace.classList.toggle("is-active", enlace.getAttribute("href") === "#" + id);
                    });
                }
            });
        }, { rootMargin: "-45% 0px -45% 0px" });
        secciones.forEach((seccion) => observadorSecciones.observe(seccion));

        /* —— Palabras que caen desde sitios distintos, sin superponerse ——
           Cada palabra es inline-block en el flujo, así al aterrizar ocupan
           su lugar natural. Solo se disparan scrolleando HACIA ABAJO. */
        const DIR = [
            { x: -18, y: -72, r: -6 },
            { x: 22, y: -88, r: 5 },
            { x: -12, y: -104, r: 3 },
            { x: 16, y: -64, r: -4 },
            { x: -24, y: -80, r: 4 },
            { x: 10, y: -96, r: -3 },
            { x: 8, y: -56, r: 6 },
        ];

        function wrapWords(el) {
            if (!el || el.dataset.fallReady) return;
            const nodes = Array.from(el.childNodes);
            const frag = document.createDocumentFragment();
            let i = 0;
            nodes.forEach((node) => {
                if (node.nodeType !== Node.TEXT_NODE) {
                    frag.appendChild(node);
                    return;
                }
                const parts = node.textContent.split(/(\s+)/);
                parts.forEach((part) => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) {
                        const sp = document.createElement("span");
                        sp.className = "fall-space";
                        sp.textContent = part;
                        frag.appendChild(sp);
                        return;
                    }
                    const span = document.createElement("span");
                    span.className = "fall-word";
                    const d = DIR[i % DIR.length];
                    /* desfase extra por índice para que no salgan del mismo punto */
                    const jitter = ((i * 17) % 16) - 8;
                    span.style.setProperty("--fx", d.x + jitter + "px");
                    span.style.setProperty("--fy", d.y + ((i * 13) % 30) + "px");
                    span.style.setProperty("--fr", d.r + "deg");
                    span.style.transitionDelay = i * 70 + "ms";
                    span.textContent = part;
                    frag.appendChild(span);
                    i += 1;
                });
            });
            el.textContent = "";
            el.appendChild(frag);
            el.dataset.fallReady = "1";
        }

        document.querySelectorAll("[data-fall]").forEach(wrapWords);

        let lastY = 0;
        let goingDown = true;
        window.addEventListener("scroll", () => {
            const y = window.scrollY;
            goingDown = y >= lastY - 1;
            lastY = y;
        }, { passive: true });

        function land(el) {
            el.querySelectorAll(".fall-word").forEach((w) => w.classList.add("is-landed"));
        }

        const elementosReveal = document.querySelectorAll(".reveal");
        if (reduce) {
            elementosReveal.forEach((el) => el.classList.add("is-visible"));
            document.querySelectorAll("[data-fall]").forEach(land);
        } else {
            const observadorReveal = new IntersectionObserver((entradas, observador) => {
                entradas.forEach((entrada) => {
                    if (!entrada.isIntersecting) return;
                    if (!goingDown && entrada.boundingClientRect.top < 0) return;
                    entrada.target.classList.add("is-visible");
                    land(entrada.target);
                    observador.unobserve(entrada.target);
                });
            }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
            elementosReveal.forEach((el) => observadorReveal.observe(el));

            /* Hero: sí anima al cargar (está al inicio) */
            const hero = document.querySelector(".hero-content");
            if (hero) {
                requestAnimationFrame(() => {
                    hero.classList.add("is-visible");
                    land(hero);
                });
            }
        }

        class Carrusel {
            constructor(elemento) {
                this.elemento = elemento;
                this.track = elemento.querySelector(".apt-gallery-track");
                this.slides = Array.from(elemento.querySelectorAll(".apt-slide"));
                this.contenedorDots = elemento.querySelector(".apt-dots");
                this.botonPrev = elemento.querySelector(".apt-nav--prev");
                this.botonNext = elemento.querySelector(".apt-nav--next");
                this.indiceActual = 0;
                this.timer = null;
                if (this.slides.length < 2) return;
                if (this.contenedorDots) this.crearDots();
                this.irASlide(0);
                if (this.botonPrev) this.botonPrev.addEventListener("click", () => { this.anterior(); this.reiniciarAuto(); });
                if (this.botonNext) this.botonNext.addEventListener("click", () => { this.siguiente(); this.reiniciarAuto(); });
                this.elemento.setAttribute("tabindex", "0");
                this.elemento.addEventListener("keydown", (evento) => {
                    if (evento.key === "ArrowLeft") this.anterior();
                    if (evento.key === "ArrowRight") this.siguiente();
                });
                this.habilitarDeslizarConElDedo();
                this.elemento.addEventListener("mouseenter", () => this.pararAuto());
                this.elemento.addEventListener("mouseleave", () => this.iniciarAuto());
                this.iniciarAuto();
            }
            crearDots() {
                this.slides.forEach((_, indice) => {
                    const boton = document.createElement("button");
                    boton.type = "button";
                    boton.className = "apt-dot";
                    boton.setAttribute("aria-label", "Ir a la foto " + (indice + 1));
                    boton.addEventListener("click", () => { this.irASlide(indice); this.reiniciarAuto(); });
                    this.contenedorDots.appendChild(boton);
                });
                this.dots = Array.from(this.contenedorDots.children);
            }
            irASlide(indice) {
                this.indiceActual = (indice + this.slides.length) % this.slides.length;
                this.track.style.transform = "translateX(-" + this.indiceActual * 100 + "%)";
                if (this.dots) this.dots.forEach((dot, i) => dot.classList.toggle("is-active", i === this.indiceActual));
            }
            anterior() { this.irASlide(this.indiceActual - 1); }
            siguiente() { this.irASlide(this.indiceActual + 1); }
            iniciarAuto() {
                if (reduce || this.slides.length < 2) return;
                this.pararAuto();
                this.timer = setInterval(() => this.siguiente(), 4200);
            }
            pararAuto() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
            reiniciarAuto() { this.pararAuto(); this.iniciarAuto(); }
            habilitarDeslizarConElDedo() {
                let posicionInicioX = 0;
                this.elemento.addEventListener("touchstart", (evento) => {
                    posicionInicioX = evento.touches[0].clientX;
                }, { passive: true });
                this.elemento.addEventListener("touchend", (evento) => {
                    const distancia = evento.changedTouches[0].clientX - posicionInicioX;
                    if (distancia > 40) this.anterior();
                    else if (distancia < -40) this.siguiente();
                    this.reiniciarAuto();
                }, { passive: true });
            }
        }
        document.querySelectorAll("[data-carousel]").forEach((el) => new Carrusel(el));

        const selectApartamento = document.getElementById("apartamento");
        const inputNombre = document.getElementById("nombre");
        document.querySelectorAll(".apt-select").forEach((boton) => {
            boton.addEventListener("click", () => {
                selectApartamento.value = boton.getAttribute("data-apartamento");
                document.getElementById("reserva").scrollIntoView({ behavior: "smooth" });
                window.setTimeout(() => inputNombre && inputNombre.focus(), 500);
            });
        });

        const inputLlegada = document.getElementById("llegada");
        const inputSalida = document.getElementById("salida");
        if (inputLlegada && inputSalida) {
            const hoyISO = new Date().toISOString().split("T")[0];
            inputLlegada.setAttribute("min", hoyISO);
            inputSalida.setAttribute("min", hoyISO);
            inputLlegada.addEventListener("change", () => {
                inputSalida.setAttribute("min", inputLlegada.value);
                if (inputSalida.value && inputSalida.value < inputLlegada.value) {
                    inputSalida.value = inputLlegada.value;
                }
            });
        }

        const formularioReserva = document.getElementById("reservaForm");
        function formatearFecha(fechaISO) {
            if (!fechaISO) return "Por confirmar";
            const [anio, mes, dia] = fechaISO.split("-");
            return dia + "/" + mes + "/" + anio;
        }
        if (formularioReserva) {
            formularioReserva.addEventListener("submit", (evento) => {
                evento.preventDefault();
                if (!formularioReserva.checkValidity()) {
                    formularioReserva.reportValidity();
                    return;
                }
                const datos = {
                    nombre: document.getElementById("nombre").value.trim(),
                    personas: document.getElementById("personas").value,
                    apartamento: document.getElementById("apartamento").value,
                    llegada: inputLlegada.value,
                    salida: inputSalida.value,
                    comentarios: document.getElementById("comentarios").value.trim(),
                };
                let mensaje = "¡Hola Armando! Vi la página del Apartahotel Playa Luna y quiero consultar disponibilidad.\n\n";
                mensaje += "Nombre: " + datos.nombre + "\n";
                mensaje += "Personas: " + datos.personas + "\n";
                mensaje += "Apartamento de interés: " + datos.apartamento + "\n";
                mensaje += "Llegada: " + formatearFecha(datos.llegada) + "\n";
                mensaje += "Salida: " + formatearFecha(datos.salida) + "\n";
                if (datos.comentarios) mensaje += "Comentarios: " + datos.comentarios + "\n";
                mensaje += "\n¡Quedo atento a la disponibilidad, gracias!";
                window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(mensaje), "_blank");
                formularioReserva.reset();
            });
        }

        const whatsappFloat = document.getElementById("whatsappFloat");
        if (whatsappFloat) {
            whatsappFloat.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(MENSAJE_FLOTANTE);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();