package storage

import (
	"fmt"
	"os"
	"path/filepath"

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
