// Antigravity Themes — Subtle Vignette shader for Windows Terminal
// Gently darkens outer edges to improve text contrast over bright wallpapers and GIFs.

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
  float2 centered = tex - 0.5;
  float dist = length(centered);
  float vignette = smoothstep(0.88, 0.32, dist);
  float factor = lerp(0.76, 1.0, vignette);
  return float4(color.rgb * factor, color.a);
}
