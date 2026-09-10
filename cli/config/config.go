package config

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
)

type Config struct {
	ClientID     string `json:"clientId"`
	Subdomain    string `json:"subdomain,omitempty"`
	CustomDomain string `json:"customDomain,omitempty"`
}

var configPath string

func init() {
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	configPath = filepath.Join(home, ".portshare", "config.json")
}

func LoadConfig() (*Config, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return &Config{}, nil
		}
		return nil, err
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func SaveConfig(cfg *Config) error {
	dir := filepath.Dir(configPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(configPath, data, 0644)
}

func EnsureIdentity(serverURL string) (*Config, error) {
	cfg, err := LoadConfig()
	if err != nil {
		return nil, err
	}

	payload := map[string]string{"id": cfg.ClientID}
	payloadBytes, _ := json.Marshal(payload)

	resp, err := http.Post(serverURL+"/client/identity", "application/json", bytes.NewReader(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to contact server: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var result Config
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if result.ClientID != cfg.ClientID {
		cfg.ClientID = result.ClientID
		cfg.Subdomain = result.Subdomain
		cfg.CustomDomain = result.CustomDomain
		if err := SaveConfig(cfg); err != nil {
			return nil, fmt.Errorf("failed to save config: %w", err)
		}
	}

	return cfg, nil
}
