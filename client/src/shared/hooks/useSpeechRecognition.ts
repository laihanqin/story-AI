import { useRef, useCallback, useState, useEffect } from 'react';

// Web Speech API 类型声明
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: { transcript: string; confidence: number };
    length: number;
    isFinal: boolean;
  }[];
  length: number;
}

interface SpeechRecognitionError {
  error: string;
  message: string;
}

declare class SpeechRecognitionClass extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionError) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onsoundstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognitionClass;
    webkitSpeechRecognition?: typeof SpeechRecognitionClass;
  }
}

type SpeechRecognition = SpeechRecognitionClass;

interface UseSpeechRecognitionOptions {
  onResult: (text: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onStop: (finalText: string) => void;
  maxDuration?: number;
  silenceTimeout?: number;
  lang?: string;
}

export function useSpeechRecognition({
  onResult,
  onError,
  onStop,
  maxDuration = 8000,
  silenceTimeout = 4000,
  lang = 'zh-CN',
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);
  const latestTextRef = useRef('');
  const stoppingRef = useRef(false);
  const onStopRef = useRef(onStop);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // keep callbacks fresh
  useEffect(() => { onStopRef.current = onStop; }, [onStop]);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = window.setTimeout(() => {
      stop();
    }, silenceTimeout);
  }, [silenceTimeout]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    clearTimers();
    stoppingRef.current = true;
    try { recognitionRef.current.stop(); } catch { /* already stopped */ }
    recognitionRef.current = null;
    setIsListening(false);
    stoppingRef.current = false;

    const finalText = latestTextRef.current.trim();
    if (finalText) {
      onStopRef.current(finalText);
    } else {
      onErrorRef.current('我没有听清楚哦，可以再说一次吗？');
    }
  }, [clearTimers]);

  const start = useCallback(async () => {
    // If already listening, stop instead
    if (recognitionRef.current) {
      stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onErrorRef.current('您的浏览器不支持语音识别，请使用 Chrome 或 Edge');
      return;
    }

    // Request mic permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      onErrorRef.current('请先在浏览器设置中允许麦克风权限');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    latestTextRef.current = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      if (text.trim()) {
        latestTextRef.current = text;
        onResultRef.current(text, event.results[event.results.length - 1]?.isFinal ?? false);
        resetSilenceTimer();
      }
    };

    recognition.onerror = (event: SpeechRecognitionError) => {
      console.error('语音识别错误:', event.error, event.message);
      if (event.error === 'not-allowed') {
        onErrorRef.current('麦克风权限被拒绝');
      } else if (event.error === 'network') {
        onErrorRef.current('网络不稳定，请重试');
      }
      // no-speech, aborted → let onend handle it
    };

    recognition.onend = () => {
      setIsListening(false);
      // Only auto-stop if we didn't initiate it (browser timeout)
      if (!stoppingRef.current && recognitionRef.current) {
        stop();
      }
    };

    recognitionRef.current = recognition;
    setIsListening(true);

    // Max duration timer
    maxTimerRef.current = window.setTimeout(() => {
      stop();
    }, maxDuration);

    recognition.start();
  }, [lang, maxDuration, resetSilenceTimer, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      if (rec) {
        try { rec.abort(); } catch { /* */ }
      }
    };
  }, [clearTimers]);

  return { isListening, start, stop };
}
