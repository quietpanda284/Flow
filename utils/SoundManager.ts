
export type SoundType = 'START' | 'COMPLETE' | 'BREAK_FINISHED';

class SoundManager {
    private sounds: Record<SoundType, HTMLAudioElement | null>;
    private muted: boolean;

    constructor() {
        this.sounds = {
            START: null,
            COMPLETE: null,
            BREAK_FINISHED: null
        };
        // Check localStorage for persisted mute preference
        this.muted = localStorage.getItem('flowstate_muted') === 'true';
    }

    private getPath(type: SoundType): string {
        switch (type) {
            case 'START': return '/sounds/keyboard_click.wav';
            case 'COMPLETE': return '/sounds/chime.wav';
            case 'BREAK_FINISHED': return '/sounds/bubble.wav';
        }
    }

    public preload() {
        const types: SoundType[] = ['START', 'COMPLETE', 'BREAK_FINISHED'];
        
        types.forEach(type => {
            if (!this.sounds[type]) {
                const audio = new Audio(this.getPath(type));
                audio.preload = 'auto';
                this.sounds[type] = audio;
            }
        });
    }

    public play(type: SoundType) {
        if (this.muted) return;

        const sound = this.sounds[type];
        if (sound) {
            // Reset time to 0 to allow rapid replays
            sound.currentTime = 0;
            sound.play().catch(err => {
                console.warn(`Failed to play sound ${type}:`, err);
            });
        } else {
            // Lazy load if not preloaded
            const audio = new Audio(this.getPath(type));
            this.sounds[type] = audio;
            audio.play().catch(err => console.warn(err));
        }
    }

    public toggleMute(): boolean {
        this.muted = !this.muted;
        localStorage.setItem('flowstate_muted', String(this.muted));
        return this.muted;
    }

    public get isMuted(): boolean {
        return this.muted;
    }
}

export const soundManager = new SoundManager();
