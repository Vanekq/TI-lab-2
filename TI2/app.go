package main

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// Функция для форматирования только оригинального и зашифрованного файлов
func print_biniry(data []byte) string {
	if len(data) == 0 {
		return "Нет данных"
	}

	var result strings.Builder
	if len(data) > 20 {
		for i := 0; i < 10; i++ {
			fmt.Fprintf(&result, "%08b", data[i])
			if i < 9 {
				result.WriteString(" ")
			}
		}
		result.WriteString(" ........... ")
		for i := len(data) - 10; i < len(data); i++ {
			fmt.Fprintf(&result, "%08b", data[i])
			if i < len(data)-1 {
				result.WriteString(" ")
			}
		}
	} else {
		for i, b := range data {
			fmt.Fprintf(&result, "%08b", b)
			if i < len(data)-1 {
				result.WriteString(" ")
			}
		}
	}
	return result.String()
}

func lfsr_generate_key(key string, length int) []byte {
	num, _ := strconv.ParseUint(key, 2, 32)
	register := uint32(num) & 0x07FFFFFF

	extendedRegister := []byte{}
	var (
		currentByte byte
		countBits   int
	)

	for i := 0; i < length; {
		outBit := (register >> 26) & 1
		currentByte = (currentByte << 1) | byte(outBit)
		countBits++

		if countBits == 8 {
			extendedRegister = append(extendedRegister, currentByte)
			currentByte = 0
			countBits = 0
			i++
		}

		newBit := ((register >> 6) & 1) ^ ((register >> 7) & 1) ^ ((register >> 26) & 1) ^ (register & 1)
		register = ((register << 1) & 0x07FFFFFF) | uint32(newBit)
	}

	if countBits > 0 {
		currentByte <<= 8 - countBits
		extendedRegister = append(extendedRegister, currentByte)
	}

	return extendedRegister
}

func (a *App) EncryptFile(bits string, fileData []int, filename string) (map[string]interface{}, error) {
	if len(bits) != 27 {
		return nil, fmt.Errorf("необходимо ввести ровно 27 бит")
	}

	data := make([]byte, len(fileData))
	for i, val := range fileData {
		data[i] = byte(val)
	}

	key_arr := lfsr_generate_key(bits, len(data))
	if key_arr == nil {
		return nil, fmt.Errorf("ошибка генерации ключа")
	}

	result := make([]byte, len(data))
	for i := 0; i < len(key_arr); i++ {
		result[i] = key_arr[i] ^ data[i]
	}

	currentDir, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("ошибка получения текущей директории: %v", err)
	}

	ext := filepath.Ext(filename)
	baseName := strings.TrimSuffix(filepath.Base(filename), ext)

	var outputFilename string

	if strings.Contains(baseName, "encrypted") {
		newBaseName := strings.Replace(baseName, "encrypted", "decrypted", -1)
		outputFilename = filepath.Join(currentDir, newBaseName+ext)
	} else {
		outputFilename = filepath.Join(currentDir, "encrypted_"+baseName+ext)
	}

	err = ioutil.WriteFile(outputFilename, result, 0644)
	if err != nil {
		return nil, fmt.Errorf("ошибка сохранения файла: %v", err)
	}

	response := map[string]interface{}{
		"original":  print_biniry(data),
		"key":       print_biniry(key_arr), 
		"encrypted": print_biniry(result),
		"saved_as":  filepath.Base(outputFilename),
	}

	return response, nil
}
