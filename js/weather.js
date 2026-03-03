// js/weather.js — Day/Night cycle + weather system
import * as THREE from 'three';

const WEATHERS = ['clear', 'cloudy', 'rain', 'fog', 'storm'];
const WEATHER_DUR = { clear: [120, 240], cloudy: [60, 120], rain: [60, 90], fog: [40, 80], storm: [30, 60] };

export class WeatherSystem {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.time = 8;          // 0–24 hour
        this.day = 1;
        this.daySpeed = 0.01;    // game hours per real second (~1h real day)
        this.weather = 'clear';
        this.weatherTimer = 120;
        this.ambientTemp = 20;   // Celsius
        this.rainParticles = null;
    }

    init() {
        this._buildSky();
        this._buildRainParticles();
        this._applyWeather('clear');
    }

    _buildSky() {
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);
    }

    _buildRainParticles() {
        const geo = new THREE.BufferGeometry();
        const count = 2000;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 80;
            pos[i * 3 + 1] = Math.random() * 40;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0xadd8e6, size: 0.08, transparent: true, opacity: 0.6 });
        this.rainParticles = new THREE.Points(geo, mat);
        this.rainParticles.visible = false;
        this.scene.add(this.rainParticles);
    }

    _applyWeather(w) {
        const world = this.game.world;
        this.weather = w;
        switch (w) {
            case 'clear':
                this.scene.fog.density = 0.002;
                this.ambientTemp = 18;
                this.rainParticles.visible = false;
                break;
            case 'cloudy':
                this.scene.fog.density = 0.003;
                this.ambientTemp = 14;
                this.rainParticles.visible = false;
                break;
            case 'rain':
                this.scene.fog.density = 0.004;
                this.ambientTemp = 10;
                this.rainParticles.visible = true;
                break;
            case 'fog':
                this.scene.fog.density = 0.012;
                this.ambientTemp = 12;
                this.rainParticles.visible = false;
                break;
            case 'storm':
                this.scene.fog.density = 0.006;
                this.ambientTemp = 6;
                this.rainParticles.visible = true;
                break;
        }
    }

    _selectNextWeather() {
        const options = WEATHERS.filter(w => w !== this.weather);
        // weight towards clear/cloudy most of the time
        const weighted = [...options, 'clear', 'clear', 'cloudy', 'cloudy'];
        return weighted[Math.floor(Math.random() * weighted.length)];
    }

    update(delta) {
        // Advance time
        this.time += this.daySpeed * delta;
        if (this.time >= 24) { this.time -= 24; this.day++; }

        // Transition weather timer
        this.weatherTimer -= delta;
        if (this.weatherTimer <= 0) {
            const next = this._selectNextWeather();
            this._applyWeather(next);
            const [min, max] = WEATHER_DUR[next];
            this.weatherTimer = min + Math.random() * (max - min);
            this.game.ui.notify(`Weather: ${next.charAt(0).toUpperCase() + next.slice(1)}`, 'info');
        }

        // Update sun/sky based on time
        this._updateDayNight();

        // Move rain with player
        if (this.rainParticles.visible && this.game.player) {
            const pp = this.game.player.getPosition();
            this.rainParticles.position.set(pp.x, pp.y, pp.z);
            // Animate rain falling
            const pos = this.rainParticles.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                let y = pos.getY(i) - (3 + Math.random() * 2) * delta;
                if (y < -2) y = 40;
                pos.setY(i, y);
            }
            pos.needsUpdate = true;
        }
    }

    _updateDayNight() {
        const t = this.time;
        const world = this.game.world;
        const sun = world?.sun;
        const ambient = world?.ambient;
        if (!sun) return;

        // Sun angle: noon at t=12
        const angle = ((t - 6) / 12) * Math.PI;
        sun.position.set(Math.cos(angle) * 200, Math.sin(angle) * 200, 100);

        // Sky and light colors
        let skyColor, sunIntensity, ambIntensity, fogColor;
        if (t < 5 || t > 21) {
            // Night
            skyColor = new THREE.Color(0x050a1a);
            fogColor = new THREE.Color(0x050a1a);
            sunIntensity = 0;
            ambIntensity = 0.08;
        } else if (t < 7) {
            // Dawn
            const p = (t - 5) / 2;
            skyColor = new THREE.Color().lerpColors(new THREE.Color(0x050a1a), new THREE.Color(0xffa040), p);
            fogColor = skyColor.clone();
            sunIntensity = p * 0.8;
            ambIntensity = 0.08 + p * 0.4;
        } else if (t < 18) {
            // Day
            let p = 1;
            if (this.weather === 'storm') { skyColor = new THREE.Color(0x3a3a4a); sunIntensity = 0.4; }
            else if (this.weather === 'cloudy' || this.weather === 'rain') { skyColor = new THREE.Color(0x8898aa); sunIntensity = 0.7; }
            else { skyColor = new THREE.Color(0x87ceeb); sunIntensity = 1.4; }
            fogColor = skyColor.clone();
            ambIntensity = 0.5;
        } else if (t < 21) {
            // Dusk
            const p = (t - 18) / 3;
            skyColor = new THREE.Color().lerpColors(new THREE.Color(0x87ceeb), new THREE.Color(0xff6030), p);
            fogColor = skyColor.clone();
            sunIntensity = (1 - p) * 1.4;
            ambIntensity = 0.5 - p * 0.42;
        }

        this.scene.background = skyColor;
        this.scene.fog.color.copy(fogColor);
        sun.intensity = sunIntensity ?? sun.intensity;
        ambient.intensity = ambIntensity ?? ambient.intensity;
    }

    isNight() { return this.time < 6 || this.time > 20; }
    isRaining() { return this.weather === 'rain' || this.weather === 'storm'; }
    getTimeStr() {
        const h = Math.floor(this.time);
        const m = Math.floor((this.time % 1) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    getIcon() { return this.isNight() ? '🌙' : this.time < 8 || this.time > 18 ? '🌅' : '☀️'; }
    getWeatherIcon() {
        return { clear: '☀️', cloudy: '⛅', rain: '🌧️', fog: '🌫️', storm: '⛈️' }[this.weather] || '☀️';
    }
    getTempModifier() {
        let t = this.ambientTemp;
        if (this.isNight()) t -= 8;
        return t;
    }
}
