export const grassVertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uBeamPos;
  uniform float uBeamActive;
  uniform float uBeamRadius;

  varying float vTip;
  varying float vShade;

  void main() {
    vTip = clamp(position.y / 0.9, 0.0, 1.0);

    // Instance transform gives world position of blade root
    vec4 worldPos = instanceMatrix * vec4(position, 1.0);

    // Wind wave across field
    float windPhase = worldPos.x * 0.22 + worldPos.z * 0.18 + uTime * 2.6;
    float sway = (sin(windPhase) * 0.22 + cos(windPhase * 1.7) * 0.08) * vTip * vTip;
    worldPos.x += sway;
    worldPos.z += sway * 0.55;

    // Push grass outward around tractor beam ground ring
    if (uBeamActive > 0.01) {
      vec2 delta = worldPos.xz - uBeamPos.xz;
      float dist = length(delta);
      float outer = uBeamRadius * 1.45;
      if (dist < outer && dist > 0.05) {
        float force = (1.0 - dist / outer) * uBeamActive * vTip * 1.15;
        vec2 dir = delta / dist;
        worldPos.xz += dir * force;
        worldPos.y -= force * 0.28;
      }
    }

    vShade = 0.78 + 0.22 * sin(worldPos.x * 0.15 + worldPos.z * 0.15);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const grassFragmentShader = /* glsl */ `
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform vec3 uFogColor;
  uniform float uFogDensity;

  varying float vTip;
  varying float vShade;

  void main() {
    vec3 col = mix(uBaseColor, uTipColor, pow(vTip, 1.25)) * vShade;

    // Exponential squared fog matching Three.js FogExp2
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
    col = mix(col, uFogColor, clamp(fogFactor, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;
