package main

import (
	"flag"
	"fmt"
	"os"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/AniP-gt/learning-english/internal/ui"
	"github.com/AniP-gt/learning-english/pkg/core"
)

func main() {
	var dataDirFlag string
	var initConfig bool

	flag.StringVar(&dataDirFlag, "data-dir", "", "path to learning data directory")
	flag.BoolVar(&initConfig, "init-config", false, "write default config to ~/.config/learning-english/config.toml")
	flag.Parse()

	if initConfig {
		if err := core.WriteDefaultConfig(); err != nil {
			fmt.Printf("Failed to write config: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("Config written to: %s\n", core.ConfigFilePath())
		return
	}

	config, err := core.LoadConfigWithFlags(dataDirFlag)
	if err != nil {
		fmt.Printf("Failed to load config: %v\n", err)
		os.Exit(1)
	}

	model := ui.NewModel(config)

	p := tea.NewProgram(model, tea.WithAltScreen())

	if _, err := p.Run(); err != nil {
		fmt.Printf("Error running program: %v\n", err)
		os.Exit(1)
	}
}
