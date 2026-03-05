package core

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	DataDir      string
	GeminiAPIKey string
	GitEnabled   bool
}

func ConfigFilePath() string {
	homeDir, _ := os.UserHomeDir()
	return filepath.Join(homeDir, ".config", "learning-english", "config.toml")
}

func LoadConfig() (*Config, error) {
	return LoadConfigWithFlags("")
}

func LoadConfigWithFlags(dataDirFlag string) (*Config, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}

	cfg := &Config{
		DataDir:      filepath.Join(homeDir, "artifacts", "english-learning", "data"),
		GeminiAPIKey: os.Getenv("GEMINI_API_KEY"),
		GitEnabled:   os.Getenv("GIT_ENABLED") == "true",
	}

	if err := loadTOML(ConfigFilePath(), cfg); err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("config file error: %w", err)
	}

	if v := os.Getenv("LEARNING_DATA_DIR"); v != "" {
		cfg.DataDir = v
	}
	if dataDirFlag != "" {
		cfg.DataDir = dataDirFlag
	}

	if cfg.GeminiAPIKey == "" {
		if key := os.Getenv("GEMINI_API_KEY"); key != "" {
			cfg.GeminiAPIKey = key
		}
	}

	return cfg, nil
}

func loadTOML(path string, cfg *Config) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "[") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		val = strings.Trim(val, `"'`)

		switch key {
		case "data_dir":
			cfg.DataDir = expandHome(val)
		case "gemini_api_key":
			cfg.GeminiAPIKey = val
		case "git_enabled":
			cfg.GitEnabled = val == "true"
		}
	}
	return scanner.Err()
}

func expandHome(path string) string {
	if strings.HasPrefix(path, "~/") {
		homeDir, _ := os.UserHomeDir()
		return filepath.Join(homeDir, path[2:])
	}
	return path
}

func SaveConfig(cfg *Config) error {
	path := ConfigFilePath()
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	content := fmt.Sprintf(`data_dir = "%s"
gemini_api_key = "%s"
git_enabled = "%v"
`, cfg.DataDir, cfg.GeminiAPIKey, cfg.GitEnabled)
	return os.WriteFile(path, []byte(content), 0644)
}

func WriteDefaultConfig() error {
	path := ConfigFilePath()
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	homeDir, _ := os.UserHomeDir()
	defaultDataDir := filepath.Join(homeDir, "artifacts", "english-learning", "data")
	content := fmt.Sprintf(`# learning-english config
# See: https://github.com/AniP-gt/learning-english

data_dir = "%s"
gemini_api_key = ""
git_enabled = "false"
`, defaultDataDir)
	return os.WriteFile(path, []byte(content), 0644)
}
