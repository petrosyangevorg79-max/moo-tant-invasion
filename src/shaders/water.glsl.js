export const waterVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave = sin(pos.x * 1.1 + uTime * 2.4) * 0.06 + cos(pos.y * 1.3 - uTime * 1.9) * 0.05;
    pos.z += wave;
    vWave = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const waterFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uFoamColor;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vec2 centered = vUv * 2.0 - 1.0;
    float r = length(centered);
    float ring = sin(r * 16.0 - uTime * 3.2) * 0.5 + 0.5;
    float spec = smoothstep(0.75, 0.98, ring) * (1.0 - r * 0.65);
    vec3 col = mix(uDeepColor, uFoamColor, spec * 0.45 + clamp(vWave * 4.0 + 0.25, 0.0, 0.3));
    float alpha = 0.88 * (1.0 - smoothstep(0.88, 1.0, r));
    gl_FragColor = vec4(col, alpha);
  }
`;
