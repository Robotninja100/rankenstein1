
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Props {
  onStart: () => void;
}

const IntroScreen: React.FC<Props> = ({ onStart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Clean up existing children to handle strict mode double-mount
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
        console.error("WebGL initialization failed:", e);
        setWebGLSupported(false);
        return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float iTime;
        uniform vec2 iResolution;

        #define NUM_OCTAVES 3

        // Polyfill for tanh which is missing in GLSL ES 1.0 (WebGL 1)
        vec4 tanh_impl(vec4 x) {
          vec4 ex = exp(x);
          vec4 emx = exp(-x);
          return (ex - emx) / (ex + emx);
        }

        float rand(vec2 n) {
          return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 ip = floor(p);
          vec2 u = fract(p);
          u = u*u*(3.0-2.0*u);

          float res = mix(
            mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
            mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
          return res * res;
        }

        float fbm(vec2 x) {
          float v = 0.0;
          float a = 0.3;
          vec2 shift = vec2(100);
          mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
          for (int i = 0; i < NUM_OCTAVES; ++i) {
            v += a * noise(x);
            x = rot * x * 2.0 + shift;
            a *= 0.4;
          }
          return v;
        }

        void main() {
          vec2 shake = vec2(sin(iTime * 1.2) * 0.005, cos(iTime * 2.1) * 0.005);
          vec2 p = ((gl_FragCoord.xy + shake * iResolution.xy) - iResolution.xy * 0.5) / iResolution.y * mat2(6.0, -4.0, 4.0, 6.0);
          vec2 v;
          vec4 o = vec4(0.0);

          float f = 2.0 + fbm(p + vec2(iTime * 5.0, 0.0)) * 0.5;

          for (float i = 0.0; i < 35.0; i++) {
            v = p + cos(i * i + (iTime + p.x * 0.08) * 0.025 + i * vec2(13.0, 11.0)) * 3.5 + vec2(sin(iTime * 3.0 + i) * 0.003, cos(iTime * 3.5 - i) * 0.003);
            float tailNoise = fbm(v + vec2(iTime * 0.5, i)) * 0.3 * (1.0 - (i / 35.0));
            vec4 auroraColors = vec4(
              0.1 + 0.3 * sin(i * 0.2 + iTime * 0.4),
              0.3 + 0.5 * cos(i * 0.3 + iTime * 0.5),
              0.7 + 0.3 * sin(i * 0.4 + iTime * 0.3),
              1.0
            );
            vec4 currentContribution = auroraColors * exp(sin(i * i + iTime * 0.8)) / length(max(v, vec2(v.x * f * 0.015, v.y * 1.5)));
            float thinnessFactor = smoothstep(0.0, 1.0, i / 35.0) * 0.6;
            o += currentContribution * (1.0 + tailNoise * 0.8) * thinnessFactor;
          }

          // Use custom tanh implementation and ensure safe power operation
          o = tanh_impl(pow(max(o / 100.0, vec4(0.0)), vec4(1.6)));
          gl_FragColor = o * 1.5;
        }
      `
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let frameId: number;
    const animate = () => {
      material.uniforms.iTime.value += 0.016;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      {/* Shader Background */}
      <div ref={containerRef} className="absolute inset-0 z-0">
         {!webGLSupported && (
             <div className="w-full h-full bg-gradient-to-br from-slate-900 to-black" />
         )}
      </div>
      
      {/* Content Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[1px]">
        <div className="animate-fade-in flex flex-col items-center">
            {/* Logo Link */}
            <a 
              href="https://www.skool.com/ai-marketing-hub" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mb-6 transition-transform hover:scale-105 duration-300"
            >
                <img 
                    src="https://pub-6c18de93037f44df9146bef79e7b3f68.r2.dev/logo%20hub%20pro%20white.png" 
                    alt="AI Marketing Hub Pro Logo" 
                    className="h-16 md:h-24 w-auto drop-shadow-lg"
                />
            </a>

            <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight text-center text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-300 drop-shadow-lg">
            Rankenstein v9 <span className="text-2xl md:text-4xl font-normal text-indigo-300 align-top ml-1">mini</span>
            </h1>
            <p className="text-xl md:text-2xl text-indigo-100 mb-12 font-light tracking-wide text-center max-w-lg opacity-90">
            Create blogs that <span className="font-semibold text-indigo-300">Rank</span>.
            </p>
            
            <button 
                onClick={onStart} 
                className="group relative px-10 py-4 bg-indigo-600/80 hover:bg-indigo-500 backdrop-blur-md border border-indigo-400/30 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-95 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/0 via-indigo-400/30 to-indigo-400/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                <span className="relative text-lg font-semibold tracking-wide flex items-center gap-3">
                    Start Creating 
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </span>
            </button>
        </div>
        
        <div className="absolute bottom-8 text-indigo-200/40 text-xs tracking-widest uppercase">
            Powered by Gemini 3.0 and Nano Banana !
        </div>
      </div>
    </div>
  );
};

export default IntroScreen;
