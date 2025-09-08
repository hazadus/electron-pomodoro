import { PlaySoundPlayer, SoundConfig } from "@/types/sound";
import { promises as fs } from "fs";
import { soundLogger } from "../utils/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: (id: string) => any;

export class SoundService {
  private player: PlaySoundPlayer | null = null;
  private settings: SoundConfig;

  constructor() {
    this.settings = {
      enabled: true,
      volume: 1.0,
      soundFile: "",
    };
    this.initializePlayer();
  }

  private initializePlayer(): void {
    try {
      const playSound = require("play-sound");
      this.player = playSound({});
      soundLogger.info("Play-sound player initialized successfully");
    } catch (error) {
      this.player = null;
      soundLogger.error("Failed to initialize play-sound player:", {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
    }
  }

  async initialize(): Promise<void> {
    // Initialization will be implemented
  }

  async loadSound(filePath: string): Promise<void> {
    soundLogger.info("Loading sound file:", { filePath });

    try {
      await fs.access(filePath);
      this.settings.soundFile = filePath;
      soundLogger.info("Sound file loaded successfully:", { filePath });
    } catch (error) {
      soundLogger.error("Failed to access sound file:", {
        filePath,
        error: (error as Error).message,
      });
      throw new Error(`Failed to load sound file: ${(error as Error).message}`);
    }
  }

  async playNotificationSound(): Promise<void> {
    soundLogger.info("Attempting to play notification sound", {
      enabled: this.settings.enabled,
      soundFile: this.settings.soundFile,
      audioAvailable: this.isAudioAvailable(),
    });

    if (!this.settings.enabled) {
      soundLogger.debug("Sound disabled, skipping playback");
      return;
    }

    if (!this.settings.soundFile) {
      soundLogger.warn("No sound file loaded");
      throw new Error("No sound file loaded");
    }

    if (!this.isAudioAvailable()) {
      soundLogger.error("Audio system not available");
      throw new Error("Audio system not available");
    }

    try {
      await this.playSound();
      soundLogger.info("Notification sound played successfully");
    } catch (error) {
      soundLogger.warn("Primary sound playback failed, trying fallback:", {
        error: (error as Error).message,
      });

      try {
        await this.playSystemSound();
        soundLogger.info("Fallback system sound played successfully");
      } catch (fallbackError) {
        soundLogger.error("Both primary and fallback sound playback failed:", {
          primaryError: (error as Error).message,
          fallbackError: (fallbackError as Error).message,
        });
        throw new Error(
          `Failed to play notification sound: ${(error as Error).message}`
        );
      }
    }
  }

  isAudioAvailable(): boolean {
    if (!this.player) {
      soundLogger.debug("Audio not available: player not initialized");
      return false;
    }

    try {
      const available = this.checkSystemAudioUtilities();
      soundLogger.debug("Audio availability check:", {
        available,
        platform: process.platform,
      });
      return available;
    } catch (error) {
      soundLogger.warn("Audio availability check failed:", {
        error: (error as Error).message,
      });
      return false;
    }
  }

  private checkSystemAudioUtilities(): boolean {
    const { execSync } = require("child_process");
    const platform = process.platform;

    try {
      switch (platform) {
        case "darwin":
          execSync("which afplay", { stdio: "ignore" });
          return true;
        case "win32":
          execSync("where powershell", { stdio: "ignore" });
          return true;
        case "linux":
          try {
            execSync("which aplay", { stdio: "ignore" });
            return true;
          } catch {
            try {
              execSync("which paplay", { stdio: "ignore" });
              return true;
            } catch {
              execSync("which mpg123", { stdio: "ignore" });
              return true;
            }
          }
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  setVolume(volume: number): void {
    this.settings.volume = Math.max(0, Math.min(1, volume));
  }

  updateSettings(settings: Partial<SoundConfig>): void {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...settings };

    soundLogger.info("Sound settings updated:", {
      oldSettings,
      newSettings: this.settings,
    });
  }

  getSettings(): Readonly<SoundConfig> {
    return { ...this.settings };
  }

  private async playSound(): Promise<void> {
    if (!this.player) {
      throw new Error("Audio player not initialized");
    }

    return new Promise((resolve, reject) => {
      const options = {
        timeout: 10000,
      };

      this.player!.play(
        this.settings.soundFile,
        options,
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  private async playSystemSound(): Promise<void> {
    const { execSync } = require("child_process");
    const platform = process.platform;

    soundLogger.info("Playing system sound fallback", { platform });

    try {
      switch (platform) {
        case "darwin":
          execSync("afplay /System/Library/Sounds/Glass.aiff", {
            stdio: "ignore",
          });
          soundLogger.debug("macOS system sound played");
          break;
        case "win32":
          execSync(
            'powershell -c (New-Object Media.SoundPlayer "C:\\Windows\\Media\\chimes.wav").PlaySync()',
            { stdio: "ignore" }
          );
          soundLogger.debug("Windows system sound played");
          break;
        case "linux":
          execSync(
            "paplay /usr/share/sounds/alsa/Front_Left.wav || aplay /usr/share/sounds/alsa/Front_Left.wav",
            { stdio: "ignore", shell: true }
          );
          soundLogger.debug("Linux system sound played");
          break;
        default:
          soundLogger.error("System sound not supported", { platform });
          throw new Error("System sound not supported on this platform");
      }
    } catch (error) {
      soundLogger.error("System sound playback failed:", {
        platform,
        error: (error as Error).message,
      });
      throw new Error(
        `Failed to play system sound: ${(error as Error).message}`
      );
    }
  }
}
