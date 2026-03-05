package storage

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/AniP-gt/learning-english/pkg/core"
)

type FileStorage struct {
	baseDir string
}

func NewFileStorage(baseDir string) *FileStorage {
	return &FileStorage{baseDir: baseDir}
}

func (fs *FileStorage) EnsureWeekDir(path core.WeekPath) error {
	dir := filepath.Join(fs.baseDir, path.Path())
	return os.MkdirAll(dir, 0755)
}

func (fs *FileStorage) GetWeekDir(path core.WeekPath) string {
	return filepath.Join(fs.baseDir, path.Path())
}

func (fs *FileStorage) ReadFile(path core.WeekPath, filename string) ([]byte, error) {
	fullPath := filepath.Join(fs.GetWeekDir(path), filename)
	return os.ReadFile(fullPath)
}

func (fs *FileStorage) WriteFile(path core.WeekPath, filename string, data []byte) error {
	if err := fs.EnsureWeekDir(path); err != nil {
		return fmt.Errorf("failed to ensure directory: %w", err)
	}
	fullPath := filepath.Join(fs.GetWeekDir(path), filename)
	return os.WriteFile(fullPath, data, 0644)
}

func CurrentWeekPath() core.WeekPath {
	now := time.Now()
	weekInMonth := (now.Day()-1)/7 + 1
	return core.WeekPath{
		Year:  now.Year(),
		Month: int(now.Month()),
		Week:  weekInMonth,
	}
}

func (fs *FileStorage) ListWeeks() ([]core.WeekPath, error) {
	var weeks []core.WeekPath

	entries, err := os.ReadDir(fs.baseDir)
	if err != nil {
		if os.IsNotExist(err) {
			return weeks, nil
		}
		return nil, err
	}

	for _, yearEntry := range entries {
		if !yearEntry.IsDir() {
			continue
		}
		yearPath := filepath.Join(fs.baseDir, yearEntry.Name())
		monthEntries, err := os.ReadDir(yearPath)
		if err != nil {
			continue
		}
		for _, monthEntry := range monthEntries {
			if !monthEntry.IsDir() {
				continue
			}
			monthPath := filepath.Join(yearPath, monthEntry.Name())
			weekEntries, err := os.ReadDir(monthPath)
			if err != nil {
				continue
			}
			for _, weekEntry := range weekEntries {
				if !weekEntry.IsDir() {
					continue
				}
				name := weekEntry.Name()
				if !strings.HasPrefix(name, "week") {
					continue
				}
				var year, month, week int
				fmt.Sscanf(yearEntry.Name(), "%d", &year)
				fmt.Sscanf(monthEntry.Name(), "%d", &month)
				fmt.Sscanf(strings.TrimPrefix(name, "week"), "%d", &week)
				if year > 0 && month > 0 && week > 0 {
					weeks = append(weeks, core.WeekPath{Year: year, Month: month, Week: week})
				}
			}
		}
	}
	return weeks, nil
}

func (fs *FileStorage) FileExists(path core.WeekPath, filename string) bool {
	fullPath := filepath.Join(fs.GetWeekDir(path), filename)
	_, err := os.Stat(fullPath)
	return err == nil
}
