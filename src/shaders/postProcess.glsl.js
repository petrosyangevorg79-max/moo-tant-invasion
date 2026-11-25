/**
 * Custom full-screen shader for vignette, damage chromatic aberration, and level color grading.
 */
export const PostGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uGradeTint: { value: [1.0, 1.0, 1.0] },
    uSaturation: { value: 1.08 },
    uVignette: { value: 0.36 },
    uAberration: { value: 0.0 }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3 uGradeTint;
    uniform float uSaturation;
    uniform float uVignette;
    uniform float uAberration;
    varying vec2 vUv;

    void main() {
      vec2 centered = vUv - 0.5;
      float dist = length(centered);

      // Chromatic aberration burst when UFO takes damage
      vec2 offset = centered * uAberration * 0.025;
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      vec3 col = vec3(r, g, b);

      // Saturation & theme color grade
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(luma), col, uSaturation) * uGradeTint;

      // Subtle arcade vignette
      float vig = smoothstep(0.88, 0.25, dist * (1.0 + uVignette));
      col *= mix(1.0 - uVignette, 1.0, vig);

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
