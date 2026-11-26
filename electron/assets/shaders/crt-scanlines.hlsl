// Antigravity Themes — Clean CRT Scanlines shader for Windows Terminal
// Subtle horizontal scanlines and edge vignette without heavy distortion.

Texture2D shaderTexture : register(t0);
SamplerState samplerState : register(s0);

cbuffer PixelShaderSettings : register(b0) {
  float Time;
  float Scale;
  float2 Resolution;
  float4 Background;
};

float4 main(float4 pos : SV_POSITION, float2 tex : TEXCOORD) : SV_TARGET {
  float4 color = shaderTexture.Sample(samplerState, tex);
  float scan = sin(pos.y * 3.14159265) * 0.5 + 0.5;
  float lineShade = lerp(0.90, 1.0, scan);
  float2 centered = tex - 0.5;
  float vig = lerp(0.82, 1.0, smoothstep(0.9, 0.35, length(centered)));
  return float4(color.rgb * lineShade * vig, color.a);
}
