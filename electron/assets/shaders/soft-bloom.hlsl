// Antigravity Themes — Soft Bloom shader for Windows Terminal
// Adds a restrained ambient glow around bright ANSI text and accent glyphs.

Texture2D shaderTexture : register(t0);
SamplerState samplerState : register(s0);

cbuffer PixelShaderSettings : register(b0) {
  float Time;
  float Scale;
  float2 Resolution;
  float4 Background;
};

float4 main(float4 pos : SV_POSITION, float2 tex : TEXCOORD) : SV_TARGET {
  float4 base = shaderTexture.Sample(samplerState, tex);
  float2 px = 1.5 / max(Resolution, float2(1.0, 1.0));

  float4 blur = 0;
  blur += shaderTexture.Sample(samplerState, tex + float2(px.x, 0));
  blur += shaderTexture.Sample(samplerState, tex - float2(px.x, 0));
  blur += shaderTexture.Sample(samplerState, tex + float2(0, px.y));
  blur += shaderTexture.Sample(samplerState, tex - float2(0, px.y));
  blur += shaderTexture.Sample(samplerState, tex + float2(px.x, px.y));
  blur += shaderTexture.Sample(samplerState, tex - float2(px.x, px.y));
  blur += shaderTexture.Sample(samplerState, tex + float2(px.x, -px.y));
  blur += shaderTexture.Sample(samplerState, tex - float2(px.x, -px.y));
  blur /= 8.0;

  float lum = dot(blur.rgb, float3(0.299, 0.587, 0.114));
  float glowMask = smoothstep(0.45, 0.95, lum);
  float3 rgb = saturate(base.rgb + blur.rgb * glowMask * 0.22);
  return float4(rgb, base.a);
}
