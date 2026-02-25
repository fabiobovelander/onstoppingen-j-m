// ========== NAVIGATION ==========
  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  function toggleMenu() {
    const menu = document.getElementById('mobile-menu');
    const hamburger = document.getElementById('hamburger');
    menu.classList.toggle('open');
    hamburger.classList.toggle('open');
  }

  // Close mobile menu on outside click
  document.addEventListener('click', function(e) {
    const menu = document.getElementById('mobile-menu');
    const hamburger = document.getElementById('hamburger');
    if (menu.classList.contains('open') &&
        !menu.contains(e.target) &&
        !hamburger.contains(e.target)) {
      menu.classList.remove('open');
      hamburger.classList.remove('open');
    }
  });

  // ========== HERO CANVAS SHADER ==========
  (function() {
    const canvas = document.getElementById('hero-canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    let mouse = { x: 0.5, y: 0.5 };
    let targetMouse = { x: 0.5, y: 0.5 };

    document.getElementById('hero').addEventListener('mousemove', function(e) {
      const rect = canvas.getBoundingClientRect();
      targetMouse.x = (e.clientX - rect.left) / rect.width;
      targetMouse.y = 1.0 - (e.clientY - rect.top) / rect.height;
    });

    const vsSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;

      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = noise(i);
        float b = noise(i + vec2(1.0, 0.0));
        float c = noise(i + vec2(0.0, 1.0));
        float d = noise(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 5; i++) {
          v += amp * smoothNoise(p);
          p = p * 2.0 + vec2(1.3, 1.7);
          amp *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 mv = u_mouse - 0.5;

        float t = u_time * 0.3;
        vec2 p = uv * 3.0 + vec2(t * 0.2, t * 0.1);
        p += mv * 0.4;

        float f = fbm(p + fbm(p + fbm(p)));

        // Navy base with lightblue/orange highlights
        vec3 navy = vec3(0.039, 0.114, 0.4);
        vec3 deepnavy = vec3(0.024, 0.059, 0.2);
        vec3 lightblue = vec3(0.498, 0.686, 0.831);
        vec3 orange = vec3(0.957, 0.478, 0.125);

        vec3 col = mix(deepnavy, navy, f);

        // Wavy ripple from mouse
        float dist = length(uv - u_mouse);
        float ripple = sin(dist * 18.0 - t * 4.0) * 0.5 + 0.5;
        ripple *= exp(-dist * 4.0);

        col = mix(col, lightblue, ripple * 0.18);
        col = mix(col, orange, ripple * 0.06 * step(0.92, ripple));

        // Vignette
        float vig = 1.0 - dot(uv - 0.5, (uv - 0.5) * 2.0);
        col *= clamp(vig, 0.3, 1.0);

        // Dithering
        float dither = (noise(uv * u_resolution * 0.5) - 0.5) * 0.02;
        col += dither;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function compileShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    function resize() {
      const hero = document.getElementById('hero');
      canvas.width = hero.clientWidth;
      canvas.height = hero.clientHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);

    let startTime = performance.now();
    function render() {
      // Smooth mouse
      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;

      const elapsed = (performance.now() - startTime) / 1000;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    }
    render();
  })();



  // ========== CONTACT FORM ==========
  function handleFormSubmit(e) {
    const form = document.getElementById('contact-form');
    const btn = document.getElementById('form-submit-btn');
    const btnText = document.getElementById('btn-text');
    const successMsg = document.getElementById('form-success');

    // Check if Formspree ID has been set
    if (form.action.includes('xdalybpa')) {
      e.preventDefault();
      alert('Formspree nog niet ingesteld. Vervang xdalybpa in de HTML met uw Formspree form ID van formspree.io');
      return;
    }

    btnText.textContent = 'Versturen...';
    btn.disabled = true;

    // Let Formspree handle the actual submission via fetch
    e.preventDefault();
    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(function(response) {
      if (response.ok) {
        form.style.display = 'none';
        successMsg.style.display = 'block';
      } else {
        btnText.textContent = 'Er ging iets mis. Probeer opnieuw.';
        btn.disabled = false;
      }
    }).catch(function() {
      btnText.textContent = 'Er ging iets mis. Probeer opnieuw.';
      btn.disabled = false;
    });
  }

  // ========== MODALS ==========
  function openModal(id) {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('modal-' + id).classList.add('active');
    document.body.style.ov