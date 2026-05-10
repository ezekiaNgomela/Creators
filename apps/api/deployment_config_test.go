package main

import "testing"

func TestPortPrefersRenderPort(t *testing.T) {
	t.Setenv("PORT", "10000")
	t.Setenv("APP_PORT", "18000")
	if got := firstEnv("PORT", "APP_PORT", "API_PORT"); got != "10000" {
		t.Fatalf("expected Render PORT to win, got %q", got)
	}
}

func TestMinioHealthCanBeDisabledForHostedSmokeTests(t *testing.T) {
	t.Setenv("DISABLE_MINIO_HEALTH", "true")
	if got := minioHealthURL(); got != "" {
		t.Fatalf("expected disabled MinIO health URL, got %q", got)
	}
}

func TestAllowedOriginSupportsCommaSeparatedHostedFrontends(t *testing.T) {
	t.Setenv("FRONTEND_ORIGIN", "https://creators-web.onrender.com, https://creators-mobile-web.onrender.com/")
	if !isAllowedOrigin("https://creators-web.onrender.com") {
		t.Fatal("expected Vite Render origin to be allowed")
	}
	if !isAllowedOrigin("https://creators-mobile-web.onrender.com") {
		t.Fatal("expected Expo web Render origin to be allowed")
	}
	if isAllowedOrigin("https://example.com") {
		t.Fatal("did not expect unrelated origin to be allowed")
	}
}
