export const ufoGlassVertexShader = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const ufoGlassFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uBeamActive;
  uniform vec3 uTint;

  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    float fresnel = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0), 2.3);
    float shimmer = 0.5 + 0.5 * sin(uTime * 3.0 + vNormalW.y * 6.0);
    vec3 rimCol = mix(uTint, vec3(0.45, 1.0, 0.85), shimmer * 0.45 + uBeamActive * 0.45);
    vec3 col = mix(vec3(0.08, 0.18, 0.35), rimCol, fresnel * 0.95);
    float alpha = clamp(0.24 + fresnel * 0.62, 0.22, 0.82);
    gl_FragColor = vec4(col, alpha);
  }
`;
