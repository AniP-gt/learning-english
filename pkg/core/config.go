package core

import (
	"os"
	"path/filepath"
)

// Config holds application configuration
type Config struct {
	DataDir      string
	GeminiAPIKey string
	GitEnabled   bool
	GitRepo      string
}

// LoadConfig creates a new configuration from environment
func LoadConfig() (*Config, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}

	dataDir := os.Getenv("LEARNING_DATA_DIR")
	if dataDir == "" {
		dataDir = filepath.Join(homeDir, "artifacts", "english-learning", "data")
	}

	return &Config{
		DataDir:      dataDir,
		GeminiAPIKey: os.Getenv("GEMINI_API_KEY"),
		GitEnabled:   os.Getenv("GIT_ENABLED") == "true",
		GitRepo:      os.Getenv("GIT_REPO"),
	}, nil
}
