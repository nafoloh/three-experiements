varying vec2 vUv;
uniform float uTime;

void main() {
    vUv = uv;
    vec3 newpos = position;
    vec4 mvPosition = modelViewMatrix * vec4( newpos, 1.0 );
    gl_Position = projectionMatrix * mvPosition;

}
