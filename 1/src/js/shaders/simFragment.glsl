varying vec2 vUv;
uniform sampler2D uCurrentPosition;
uniform sampler2D uOriginalPosition;
uniform sampler2D uOriginalPosition1;
uniform float uProgress;
uniform vec3 uMousePos;
uniform float uTime;

float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
    float offset = rand(vUv);
    vec4 positionColors = texture2D(uCurrentPosition, vUv);
    vec2 position = positionColors.xy;
    vec2 originalPosition = texture2D(uOriginalPosition, vUv).xy;
    vec2 originalPosition1= texture2D(uOriginalPosition1, vUv).xy;

    vec2 velocity = texture2D(uCurrentPosition, vUv).zw;

    vec2 finalOriginal = mix(originalPosition, originalPosition1, uProgress);
//? Friction
    velocity *= 0.99;
//? Particle attraction to shape 
    vec2 direction = normalize(finalOriginal - position);
    float dist = length(finalOriginal - position);
    if(dist > 0.005) {
        velocity += direction * 0.0001;
    }
    
//? Mouse repel force. 
    float mouseDistance = distance(position, uMousePos.xy);
    float maxDistance = 0.07;
    if(mouseDistance < maxDistance) {
        vec2 direction = normalize(position - uMousePos.xy);
        velocity += direction * (1.0 - mouseDistance /maxDistance) * 0.001;
    }

//? Adding lifespan of particle
    float lifespan = 5.;
    float age = mod(uTime + lifespan * offset, lifespan);
    if(age < 0.1) {
        velocity = vec2(0.0,0.001);
        position.xy = finalOriginal;
    }
    position.xy += velocity;
    gl_FragColor = vec4(position, 0.0,1.0);
    gl_FragColor = vec4(position, velocity);
}