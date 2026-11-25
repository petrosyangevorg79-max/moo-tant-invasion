export const beamVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = -mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`;

export const beamFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  void main() {
    // Scrolling upward tractor stripes + fine scanlines
    float scrollUp = fract(vUv.y * 5.0 - uTime * 2.4);
    float stripes = smoothstep(0.15, 0.55, scrollUp) * (1.0 - smoothstep(0.65, 0.95, scrollUp));
    float scanlines = 0.72 + 0.28 * sin(vUv.y * 70.0 - uTime * 16.0);
    float spiral = 0.6 + 0.4 * sin(vUv.x * 18.84955 + vUv.y * 12.0 - uTime * 5.0);

    // Soft Fresnel edge glow so cone silhouettes stay smooth
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vViewPos);
    float edge = 1.0 - abs(dot(n, v));
    float rim = pow(clamp(edge, 0.0, 1.0), 1.35);

    // Fade gently at top and bottom extremes
    float verticalFade = smoothstep(0.0, 0.14, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y));

    vec3 col = mix(uColorA, uColorB, stripes * 0.7 + rim * 0.5);
    float alpha = (0.16 + stripes * 0.34 + rim * 0.36) * scanlines * spiral * verticalFade * uIntensity;

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
  }
`;
