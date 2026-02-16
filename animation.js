class ASCIIBlobAnimation {
    constructor() {
        this.intro = document.getElementById('intro');
        this.content = document.getElementById('content');
        this.asciiText = document.getElementById('ascii-text');

        this.maskCanvas = document.createElement('canvas');
        this.maskCtx = this.maskCanvas.getContext('2d');

        this.cols = 0;
        this.rows = 0;
        this.charWidth = 8;
        this.charHeight = 16;
        this.width = 0;
        this.height = 0;

        this.pointerX = 0.5;
        this.pointerY = 0.5;
        this.pointerSmoothX = 0.5;
        this.pointerSmoothY = 0.5;
        this.lastTouchX = null;

        this.maskOffset = null;
        this.maskVelocity = 0;
        this.autoScroll = 0;

        this.lastFrameTime = 0;
        this.isExploding = false;
        this.explodeStart = 0;
        this.explosionDuration = 1450;
        this.explosionParticles = [];
        this.hideTimer = null;

        this.brightness = new Float32Array(0);
        this.depth = new Float32Array(0);
        this.tmp = new Float32Array(0);
        this.maskAlpha = new Uint8ClampedArray(0);

        this.asciiRamp = 'NNN@O$0A869#452I3=7+1/:-.` ';

        this.onResize = this.onResize.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
        this.onClick = this.onClick.bind(this);
        this.animate = this.animate.bind(this);

        this.onResize();
        this.attachEvents();
        requestAnimationFrame(this.animate);
    }

    attachEvents() {
        window.addEventListener('resize', this.onResize);
        this.intro.addEventListener('mousemove', this.onMouseMove);
        this.intro.addEventListener('wheel', this.onWheel, { passive: true });
        this.intro.addEventListener('touchstart', this.onTouchStart, { passive: true });
        this.intro.addEventListener('touchmove', this.onTouchMove, { passive: false });
        this.intro.addEventListener('touchend', this.onTouchEnd, { passive: true });
        this.intro.addEventListener('click', this.onClick);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        let charWidth = 7;
        if (width > 900) {
            charWidth = 8;
        }
        if (width > 1200) {
            charWidth = 8.8;
        }
        if (width < 768) {
            charWidth = 7.8;
        }

        const lineFactor = width < 500 ? 2 : 2.05;
        let cols = Math.floor(width / charWidth);
        let rows = Math.floor((height - charWidth * 2) / (charWidth * lineFactor));
        rows = Math.max(22, rows);
        cols = Math.max(42, cols);

        charWidth = width / cols;
        const lineHeightPx = height / rows;

        this.width = width;
        this.height = height;
        this.cols = cols;
        this.rows = rows;
        this.charWidth = charWidth;
        this.charHeight = lineHeightPx;
        this.autoScroll = Math.max(0.015, this.cols * 0.00004);

        const fontSize = Math.max(8, charWidth / 0.62);
        const letterSpacing = Math.max(0, (charWidth / 0.62 - fontSize) * 0.6);

        this.asciiText.style.fontSize = `${fontSize}px`;
        this.asciiText.style.lineHeight = `${lineHeightPx}px`;
        this.asciiText.style.letterSpacing = `${letterSpacing}px`;
        this.asciiText.style.width = `${width}px`;
        this.asciiText.style.height = `${height}px`;

        this.maskCanvas.width = cols;
        this.maskCanvas.height = rows;

        const size = cols * rows;
        this.brightness = new Float32Array(size);
        this.depth = new Float32Array(size);
        this.tmp = new Float32Array(size);
        this.maskAlpha = new Uint8ClampedArray(size);
        this.maskOffset = null;
    }

    onMouseMove(event) {
        if (this.isExploding) {
            return;
        }
        this.pointerX = event.clientX / this.width;
        this.pointerY = event.clientY / this.height;
    }

    onWheel(event) {
        if (this.isExploding) {
            return;
        }
        this.maskVelocity += event.deltaY * 0.00018;
    }

    onTouchStart(event) {
        if (!event.touches || !event.touches[0] || this.isExploding) {
            return;
        }
        this.lastTouchX = event.touches[0].clientX;
    }

    onTouchMove(event) {
        if (!event.touches || !event.touches[0] || this.isExploding) {
            return;
        }
        const touch = event.touches[0];
        this.pointerX = touch.clientX / this.width;
        this.pointerY = touch.clientY / this.height;

        if (this.lastTouchX !== null) {
            const deltaX = touch.clientX - this.lastTouchX;
            if (Math.abs(deltaX) > 2) {
                this.maskVelocity -= deltaX * 0.0009;
                event.preventDefault();
            }
        }
        this.lastTouchX = touch.clientX;
    }

    onTouchEnd() {
        this.lastTouchX = null;
    }

    onClick() {
        if (this.isExploding) {
            return;
        }
        this.startExplosion(performance.now());
    }

    startExplosion(now) {
        this.isExploding = true;
        this.explodeStart = now;
        this.intro.classList.add('exploding');
        this.buildExplosionParticles();

        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
        }
        this.hideTimer = setTimeout(() => {
            this.intro.classList.add('hidden');
            this.content.classList.add('visible');
        }, this.explosionDuration);
    }

    buildExplosionParticles() {
        const lines = this.asciiText.textContent.split('\n');
        const points = [];
        const maxParticles = 2200;

        for (let y = 0; y < lines.length; y += 1) {
            const line = lines[y];
            for (let x = 0; x < line.length; x += 1) {
                const char = line[x];
                if (char === ' ') {
                    continue;
                }
                points.push({ x, y, char });
            }
        }

        if (points.length > maxParticles) {
            const sampled = [];
            const step = points.length / maxParticles;
            for (let i = 0; i < maxParticles; i += 1) {
                sampled.push(points[Math.floor(i * step)]);
            }
            points.length = 0;
            points.push(...sampled);
        }

        const total = points.length;
        const cx = this.cols * 0.5;
        const cy = this.rows * 0.5;
        this.explosionParticles = [];

        for (let i = 0; i < total; i += 1) {
            const source = points[i];

            const dx = source.x - cx;
            const dy = source.y - cy;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const speed = 0.05 + Math.random() * 0.1;
            const particle = {
                x: source.x,
                y: source.y,
                vx: (dx / dist) * speed + (Math.random() - 0.5) * 0.03,
                vy: (dy / dist) * speed + (Math.random() - 0.5) * 0.03,
                char: source.char,
                seed: Math.random() * Math.PI * 2
            };
            this.explosionParticles.push(particle);
        }
    }

    clearBuffers() {
        const base = 242;
        this.brightness.fill(base);
        this.tmp.fill(base);
        this.depth.fill(Number.POSITIVE_INFINITY);
    }

    drawTorusField(timeMs) {
        this.clearBuffers();

        this.pointerSmoothX += (this.pointerX - this.pointerSmoothX) * 0.045;
        this.pointerSmoothY += (this.pointerY - this.pointerSmoothY) * 0.045;

        const rMajor = 1.0;
        const rMinor = 0.45;
        const uSteps = Math.max(110, Math.floor(this.cols * 0.9));
        const vSteps = Math.max(48, Math.floor(this.rows * 0.9));
        const cameraZ = 2.0;
        const scale = Math.min(this.cols, this.rows) * 8;
        const aspectY = 1.03;

        const rotX = timeMs * 0.00038 + (this.pointerSmoothY - 0.5) * 1.7;
        const rotY = timeMs * 0.00031 + (this.pointerSmoothX - 0.5) * 2.3;
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);

        for (let u = 0; u < uSteps; u += 1) {
            const theta = (u / uSteps) * Math.PI * 2;
            const cTheta = Math.cos(theta);
            const sTheta = Math.sin(theta);

            for (let v = 0; v < vSteps; v += 1) {
                const phi = (v / vSteps) * Math.PI * 2;
                const cPhi = Math.cos(phi);
                const sPhi = Math.sin(phi);

                let x = (rMajor + rMinor * cPhi) * cTheta;
                let y = (rMajor + rMinor * cPhi) * sTheta;
                let z = rMinor * sPhi;

                let ny = cPhi * sTheta;
                let nz = sPhi;

                const ry = x * cosY + z * sinY;
                const rz = -x * sinY + z * cosY;
                x = ry;
                z = rz;

                const nny = ny * cosY + nz * sinY;
                const nnz = -ny * sinY + nz * cosY;
                ny = nny;
                nz = nnz;

                const rx = y * cosX - z * sinX;
                const rz2 = y * sinX + z * cosX;
                y = rx;
                z = rz2;

                const nny2 = ny * cosX - nz * sinX;
                const nnz2 = ny * sinX + nz * cosX;
                ny = nny2;
                nz = nnz2;

                const depth = z + cameraZ;
                if (depth <= 0.001) {
                    continue;
                }

                const invDepth = 1 / depth;
                const sx = Math.floor(this.cols * 0.5 + x * invDepth * scale);
                const sy = Math.floor(this.rows * 0.5 + y * invDepth * scale * aspectY);

                if (sx < 1 || sy < 1 || sx >= this.cols - 1 || sy >= this.rows - 1) {
                    continue;
                }

                const idx = sy * this.cols + sx;
                if (depth < this.depth[idx]) {
                    this.depth[idx] = depth;

                    const baseLight = (nz * 0.5 + 0.5) * 180 + 26;
                    this.brightness[idx] = baseLight;
                }
            }
        }

        for (let y = 1; y < this.rows - 1; y += 1) {
            for (let x = 1; x < this.cols - 1; x += 1) {
                const idx = y * this.cols + x;
                this.tmp[idx] = (
                    this.brightness[idx] * 5 +
                    this.brightness[idx - 1] +
                    this.brightness[idx + 1] +
                    this.brightness[idx - this.cols] +
                    this.brightness[idx + this.cols]
                ) / 9;
            }
        }

        this.brightness.set(this.tmp);
    }

    applyTextMask(deltaMs) {
        this.maskCtx.clearRect(0, 0, this.cols, this.rows);
        this.maskCtx.fillStyle = '#fff';

        const text = 'stvn.wang';
        const fontSize = Math.max(12, Math.floor(this.rows * 0.95));
        this.maskCtx.font = `900 ${fontSize}px "Helvetica Neue", "Arial Black", Helvetica, Arial, sans-serif`;
        this.maskCtx.textBaseline = 'middle';

        const textWidth = this.maskCtx.measureText(text).width;

        if (this.maskOffset === null) {
            this.maskOffset = (this.cols - textWidth) * 0.5;
        }

        this.maskOffset -= this.autoScroll * deltaMs;
        this.maskOffset += this.maskVelocity * deltaMs;
        this.maskVelocity *= 0.95;

        const wrapWidth = this.cols + textWidth + 12;
        while (this.maskOffset < -textWidth - 6) {
            this.maskOffset += wrapWidth;
        }
        while (this.maskOffset > this.cols + 6) {
            this.maskOffset -= wrapWidth;
        }

        const y = this.rows * 0.52;
        const drawFatText = (x, yy) => {
            this.maskCtx.fillText(text, x, yy);
            this.maskCtx.fillText(text, x + 0.5, yy);
            this.maskCtx.fillText(text, x - 0.5, yy);
        };
        drawFatText(this.maskOffset, y);
        drawFatText(this.maskOffset - wrapWidth, y);
        drawFatText(this.maskOffset + wrapWidth, y);

        const maskData = this.maskCtx.getImageData(0, 0, this.cols, this.rows).data;
        for (let i = 0; i < this.maskAlpha.length; i += 1) {
            this.maskAlpha[i] = maskData[i * 4 + 3];
            if (this.maskAlpha[i] === 0) {
                this.brightness[i] = 250;
            } else {
                this.brightness[i] *= this.maskAlpha[i] / 255;
            }
        }
    }

    renderAscii() {
        const lines = new Array(this.rows);
        const maxChar = this.asciiRamp.length - 1;

        for (let y = 0; y < this.rows; y += 1) {
            let line = '';
            const rowOffset = y * this.cols;
            for (let x = 0; x < this.cols; x += 1) {
                const idx = rowOffset + x;
                const value = Math.max(0, Math.min(255, this.brightness[idx]));
                const charIndex = Math.ceil((value / 255) * maxChar);
                line += this.asciiRamp[charIndex];
            }
            lines[y] = line;
        }

        this.asciiText.textContent = lines.join('\n');
    }

    renderExplosion(now, deltaMs) {
        const progress = Math.min(1, (now - this.explodeStart) / this.explosionDuration);
        if (progress >= 1) {
            this.asciiText.textContent = '';
            return;
        }

        const dt = Math.max(0.25, Math.min(2.2, deltaMs / 16));
        const wobble = (1 - progress) * 0.015;

        for (let i = 0; i < this.explosionParticles.length; i += 1) {
            const particle = this.explosionParticles[i];

            particle.vx *= 0.992;
            particle.vy *= 0.992;
            particle.vy += 0.0011 * dt;
            particle.vx += Math.sin(now * 0.0012 + particle.seed) * wobble * dt;
            particle.vy += Math.cos(now * 0.001 + particle.seed) * wobble * 0.65 * dt;

            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
        }

        const grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(' '));
        for (let i = 0; i < this.explosionParticles.length; i += 1) {
            if (progress > 0.42 && Math.random() < (progress - 0.42) * 0.95) {
                continue;
            }
            const particle = this.explosionParticles[i];
            const x = Math.round(particle.x);
            const y = Math.round(particle.y);
            if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) {
                continue;
            }
            grid[y][x] = particle.char;
        }

        this.asciiText.textContent = grid.map((row) => row.join('')).join('\n');
        const tailFade = progress < 0.72 ? 0.96 : Math.max(0, 0.96 - (progress - 0.72) / 0.28);
        this.asciiText.style.opacity = `${tailFade}`;
    }

    animate(timeMs) {
        if (!this.lastFrameTime) {
            this.lastFrameTime = timeMs;
        }
        const deltaMs = Math.min(34, timeMs - this.lastFrameTime);
        this.lastFrameTime = timeMs;

        if (this.isExploding) {
            this.renderExplosion(timeMs, deltaMs);
        } else {
            this.asciiText.style.opacity = '1';
            this.drawTorusField(timeMs);
            this.applyTextMask(deltaMs);
            this.renderAscii();
        }

        requestAnimationFrame(this.animate);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ASCIIBlobAnimation();
});
