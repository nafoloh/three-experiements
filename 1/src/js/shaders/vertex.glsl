varying vec2 vUv;
uniform float uTime;
uniform sampler2D uTexture;

void main() {
    vUv = uv;
    vec3 newpos = position;
    vec4 color = texture2D(uTexture, vUv);
    newpos.xy = color.xy;
    //newpos.z += 1.;
    //newpos.z += sin( uTime + position.x*10. ) * 0.5;
    vec4 mvPosition = modelViewMatrix * vec4( newpos, 1.0 );
    gl_PointSize =  ( 2.0 / -mvPosition.z );
    gl_Position = projectionMatrix * mvPosition;

}
