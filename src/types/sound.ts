export interface SoundConfig {
  enabled: boolean;
  volume: number;
  soundFile: string;
}

export interface PlaySoundPlayer {
  play: (
    filePath: string,
    options?: PlaySoundOptions,
    callback?: (error: Error | null) => void
  ) => PlaySoundProcess;
}

export interface PlaySoundOptions {
  timeout?: number;
}

export interface PlaySoundProcess {
  kill: () => void;
  pid?: number;
}
