package ui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

func visibleBoxLines(style lipgloss.Style, boxHeight int) int {
	visible := boxHeight - style.GetVerticalFrameSize()
	if visible < 1 {
		return 1
	}
	return visible
}

func visibleBoxWidth(style lipgloss.Style, boxWidth int) int {
	visible := boxWidth - style.GetHorizontalFrameSize()
	if visible < 1 {
		return 1
	}
	return visible
}

func wrapPlainTextLines(text string, width int) []string {
	wrapped := lipgloss.NewStyle().Width(width).Render(text)
	return strings.Split(wrapped, "\n")
}

func sliceVisibleLines(lines []string, offset, visible int) string {
	if len(lines) == 0 {
		return ""
	}
	if visible < 1 {
		visible = 1
	}
	maxOffset := max(0, len(lines)-visible)
	if offset < 0 {
		offset = 0
	}
	if offset > maxOffset {
		offset = maxOffset
	}
	end := min(len(lines), offset+visible)
	return strings.Join(lines[offset:end], "\n")
}

func maxScrollOffset(lines []string, visible int) int {
	if visible < 1 {
		visible = 1
	}
	return max(0, len(lines)-visible)
}

func cropRenderedHeight(content string, height int) string {
	if height < 1 {
		return ""
	}
	lines := strings.Split(content, "\n")
	if len(lines) <= height {
		return content
	}
	return strings.Join(lines[:height], "\n")
}
