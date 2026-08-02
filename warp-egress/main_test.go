package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadProfileRequiresTunnelFields(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	if err := os.WriteFile(path, []byte(`{"private_key":"key"}`), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := loadProfile(path); err == nil {
		t.Fatal("expected incomplete profile to be rejected")
	}
}

func TestParsePrivateKeyRejectsMalformedInput(t *testing.T) {
	if _, err := parsePrivateKey("not-base64"); err == nil {
		t.Fatal("expected malformed key to be rejected")
	}
}
