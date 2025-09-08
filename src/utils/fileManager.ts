import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";

export interface FileManagerConfig {
  appName: string;
  userDataPath: string;
}

export class FileManager {
  private userDataPath: string;

  constructor() {
    this.userDataPath = app.getPath("userData");
  }

  /**
   * Получить путь к файлу в userData директории
   */
  getUserDataFilePath(filename: string): string {
    return path.join(this.userDataPath, filename);
  }

  /**
   * Получить путь к директории userData
   */
  getUserDataPath(): string {
    return this.userDataPath;
  }

  /**
   * Проверить существование файла
   */
  async fileExists(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Создать директорию если она не существует
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if ((error as { code?: string }).code !== "EEXIST") {
        throw error;
      }
    }
  }

  /**
   * Прочитать JSON файл с валидацией
   */
  async readJsonFile<T>(
    filepath: string,
    validator?: (data: unknown) => data is T
  ): Promise<T | null> {
    try {
      const data = await fs.readFile(filepath, "utf-8");
      const parsed = JSON.parse(data);

      if (validator && !validator(parsed)) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Записать JSON файл
   */
  async writeJsonFile<T>(filepath: string, data: T): Promise<void> {
    const dirPath = path.dirname(filepath);
    await this.ensureDirectory(dirPath);

    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filepath, jsonString, "utf-8");
  }

  /**
   * Создать резервную копию файла
   */
  async backupFile(filepath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${filepath}.backup.${timestamp}`;

    try {
      await fs.copyFile(filepath, backupPath);
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to backup file ${filepath}: ${error}`);
    }
  }

  /**
   * Удалить старые резервные копии (старше указанных дней)
   */
  async cleanupBackups(
    dirPath: string,
    pattern: string,
    maxAgeDays: number = 30
  ): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      const backupFiles = files.filter((file) => file.includes(".backup."));
      const cutoffDate = new Date(
        Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
      );

      for (const file of backupFiles) {
        if (!file.includes(pattern)) continue;

        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
        }
      }
    } catch {
      // Игнорируем ошибки при очистке
    }
  }

  /**
   * Получить статистику файла
   */
  async getFileStats(filepath: string) {
    try {
      const stats = await fs.stat(filepath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Безопасная запись файла с атомарностью
   */
  async writeFileSafe(filepath: string, content: string): Promise<void> {
    const tempPath = `${filepath}.tmp`;

    try {
      await fs.writeFile(tempPath, content, "utf-8");
      await fs.rename(tempPath, filepath);
    } catch (error) {
      // Очистка временного файла при ошибке
      try {
        await fs.unlink(tempPath);
      } catch {
        // Игнорируем ошибку очистки
      }
      throw error;
    }
  }
}

// Синглтон экземпляр
export const fileManager = new FileManager();
