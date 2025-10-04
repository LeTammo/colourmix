
import { forwardRef, useCallback, useImperativeHandle, useRef, useEffect } from "react";

type AudioPlayerProps = {
  src: string;
  volume: number;
};

export type AudioPlayerHandle = {
  play: () => void;
  stop: () => void;
};

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(({ src, volume }, ref) => {
  // Ref to the <audio> DOM element
  const audioRef = useRef<HTMLAudioElement>(null);

  // Set volume via ref when src or volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, src]);

  // Play function
  const playAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused || audio.currentTime === 0 || audio.ended) {
      audio.play().catch((error: unknown) => {
        console.error("Error playing audio:", error);
      });
    }
  }, []);

  // Stop function
  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  useImperativeHandle(ref, () => ({
    play: playAudio,
    stop: stopAudio,
  }));

  // Render a hidden <audio> element
  return (
    <audio
      ref={audioRef}
      src={src}
      preload="auto"
      style={{ display: "none" }}
    />
  );
});

export default AudioPlayer;