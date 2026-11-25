export const skyVertexShader = /* glsl */ `
  varying vec3 vWorldDirection;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldDirection = normalize(worldPosition.xyz - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const skyFragmentShader = /* glsl */ `
  uniform vec3 uTopColor;
  uniform vec3 uMidColor;
  uniform vec3 uHorizonColor;
  uniform float uStarsOpacity;
  uniform float uTime;
  varying vec3 vWorldDirection;

  // Lightweight deterministic 3D hash for crisp starfield without textures
  float hash31(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p, p.yxz + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  void main() {
    vec3 dir = normalize(vWorldDirection);
    float h = clamp(dir.y, 0.0, 1.0);

    vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
    col = mix(col, uTopColor, smoothstep(0.24, 0.88, h));

    // Procedural twinkling stars above the horizon
    if (h > 0.03 && uStarsOpacity > 0.01) {
      vec3 grid = floor(dir * 190.0);
      float n = hash31(grid);
      if (n > 0.9925) {
        float twinkle = 0.65 + 0.35 * sin(uTime * (2.5 + n * 6.0) + n * 100.0);
        float starMask = smoothstep(0.03, 0.25, h) * uStarsOpacity * twinkle;
        col += vec3(0.92, 0.96, 1.0) * starMask * 1.4;
      }
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;
