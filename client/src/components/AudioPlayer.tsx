import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

type AudioPlayerProps = {
  src: string;
  volume: number;
};

export type AudioPlayerHandle = {
  play: () => void;
  stop: () => void;
};

// 1. Wrap the component with forwardRef to receive a ref
const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(({ src, volume }, ref) => {
  // Use a ref to store the Audio object instance internally
  const audioRef = useRef<HTMLAudioElement>(null);

   // Function to create or retrieve the audio instance
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      // Create and store a new Audio instance if it doesn't exist
      audioRef.current = new Audio(src);
      audioRef.current.volume = volume; 
      audioRef.current.preload = 'auto'; // Preload the audio
    }

    audioRef.current.src = src; // Update source if it changes
    audioRef.current.volume = volume; // Update volume if it changes
    return audioRef.current;
  }, [src, volume]);

  // Define the play function
  const playAudio = useCallback(() => {
    const audio = getAudio();
    
    // Always stop and reset before playing to ensure the start
    audio.pause();
    audio.currentTime = 0;

    audio.play()
      .catch(error => {
        console.error("Error playing audio:", error);
      });
  }, [getAudio]);


  // Define the stop/reset function
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause(); // Pause playback
      audioRef.current.currentTime = 0; // Reset time to the start
      console.log('Audio stopped and reset.');
    }
  }, []);

  // 2. Expose the playAudio function to the parent component via the ref
  useImperativeHandle(ref, () => ({
    // The parent can now call playerRef.current.play()
    play: playAudio,
    // The parent can call playerRef.current.stop()
    stop: stopAudio 
  }));

  // The component renders nothing, only manages the audio logic
  return (
    <div style={{ display: 'none' }}>
      {/* This component is hidden, it only holds the audio logic */}
    </div>
  );
});

export default AudioPlayer;