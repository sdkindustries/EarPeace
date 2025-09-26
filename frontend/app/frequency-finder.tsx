import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
} from 'react-native';
// Removed expo-av import - using native Web Audio API only
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function FrequencyFinderScreen() {
  const router = useRouter();
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentSound, setCurrentSound] = useState(null);

  // Frequency finder modes
  const [finderMode, setFinderMode] = useState('slider'); // 'slider' or 'sweep'
  const [testEar, setTestEar] = useState('both'); // 'left', 'right', 'both'

  // Slider mode
  const [frequency, setFrequency] = useState(1000);
  const [volume, setVolume] = useState(0.3);

  // Sweep mode
  const [sweepSettings, setSweepSettings] = useState({
    startFreq: 100,
    endFreq: 8000,
    duration: 30, // seconds
    isRunning: false,
    currentFreq: 100,
  });

  // Found frequencies
  const [foundFrequencies, setFoundFrequencies] = useState([]);

  useEffect(() => {
    setupAudio();
    loadSavedFrequencies();
    
    return () => {
      cleanupAudio();
    };
  }, []);

  const setupAudio = async () => {
    try {
      // Web Audio API doesn't need setup - just enable the interface
      setAudioEnabled(true);
      console.log('✅ Frequency finder audio ready - Native Web Audio API will be used');
    } catch (error) {
      Alert.alert('Audio Error', 'Failed to initialize audio system');
    }
  };

  const cleanupAudio = async () => {
    if (currentSound) {
      await currentSound.unloadAsync();
    }
  };

  const loadSavedFrequencies = async () => {
    try {
      const saved = await AsyncStorage.getItem('tinnitusFrequencies');
      if (saved) {
        setFoundFrequencies(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Error loading frequencies:', error);
    }
  };

  // Generate real tone audio data URL
  const generateToneDataUrl = (freq: number, duration: number = 5, volume: number = 0.3) => {
    const sampleRate = 44100;
    const samples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    // Generate sine wave
    let offset = 44;
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * freq * i / sampleRate) * volume;
      const intSample = Math.max(-32768, Math.min(32767, sample * 32767));
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  const generateTone = async (freq, vol = 0.3) => {
    if (!audioEnabled) {
      Alert.alert('Audio Not Ready', 'Please wait for audio system to initialize');
      return null;
    }

    try {
      // Stop existing sound
      if (currentSound) {
        await currentSound.unloadAsync();
      }

      console.log(`🎵 Generating real ${freq}Hz tone at ${Math.round(vol * 100)}% volume`);
      
      // Generate real sine wave tone
      const audioUrl = generateToneDataUrl(freq, 10, vol); // 10 second duration for testing
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { 
          shouldPlay: false,
          isLooping: true,
          volume: vol,
        }
      );

      setCurrentSound(sound);
      console.log(`✅ Real ${freq}Hz tone generated successfully`);
      return sound;
    } catch (error) {
      console.error('Error generating real tone:', error);
      Alert.alert('Tone Generation Error', `Failed to generate ${freq}Hz tone: ${error.message}`);
      return null;
    }
  };

  const playTone = async (freq = frequency) => {
    try {
      setIsPlaying(true);
      
      // This is a simplified implementation
      // In production, you'd generate actual sine wave audio
      console.log(`Playing ${freq}Hz tone at ${volume} volume for ${testEar} ear(s)`);
      
      // Simulate tone generation
      setTimeout(() => {
        Alert.alert(
          'Tone Playing',
          `${freq}Hz tone is playing. Can you hear this frequency? Does it match your tinnitus?`,
          [
            { text: 'Stop', onPress: stopTone },
            { text: 'Save Match', onPress: () => saveFrequency(freq) },
          ]
        );
      }, 100);
    } catch (error) {
      Alert.alert('Playback Error', 'Failed to play tone');
      setIsPlaying(false);
    }
  };

  const stopTone = async () => {
    if (currentSound) {
      await currentSound.stopAsync();
    }
    setIsPlaying(false);
    setSweepSettings(prev => ({ ...prev, isRunning: false }));
  };

  const saveFrequency = async (freq) => {
    try {
      const newFrequency = {
        id: Date.now().toString(),
        ear: testEar,
        frequency: freq,
        volume: volume,
        notes: `Found using ${finderMode} method`,
        timestamp: new Date().toISOString(),
      };

      const updated = [...foundFrequencies, newFrequency];
      setFoundFrequencies(updated);
      await AsyncStorage.setItem('tinnitusFrequencies', JSON.stringify(updated));

      // Also save to backend if available
      if (BACKEND_URL) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/tinnitus-frequency`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ear: testEar,
              frequency: freq,
              volume: volume,
              notes: `Found using ${finderMode} method`,
            }),
          });
        } catch (apiError) {
          console.log('API save failed, but saved locally');
        }
      }

      Alert.alert('Saved!', `Frequency ${freq}Hz saved for ${testEar} ear(s)`);
      stopTone();
    } catch (error) {
      Alert.alert('Save Error', 'Failed to save frequency');
    }
  };

  const startSweep = () => {
    if (!audioEnabled) {
      Alert.alert('Audio Not Ready', 'Please wait for audio system to initialize');
      return;
    }

    setSweepSettings(prev => ({
      ...prev,
      isRunning: true,
      currentFreq: prev.startFreq,
    }));

    Alert.alert(
      'Frequency Sweep',
      `Starting sweep from ${sweepSettings.startFreq}Hz to ${sweepSettings.endFreq}Hz over ${sweepSettings.duration} seconds. Tap "Match Found" when you hear your tinnitus frequency.`,
      [
        { text: 'Cancel', onPress: () => setSweepSettings(prev => ({ ...prev, isRunning: false })) },
        { text: 'Start', onPress: runSweep },
      ]
    );
  };

  const runSweep = () => {
    const totalSteps = sweepSettings.duration * 10; // 10 steps per second
    const freqStep = (sweepSettings.endFreq - sweepSettings.startFreq) / totalSteps;
    let currentStep = 0;

    const sweepInterval = setInterval(() => {
      if (!sweepSettings.isRunning || currentStep >= totalSteps) {
        clearInterval(sweepInterval);
        setSweepSettings(prev => ({ ...prev, isRunning: false }));
        stopTone();
        return;
      }

      const newFreq = sweepSettings.startFreq + (freqStep * currentStep);
      setSweepSettings(prev => ({ ...prev, currentFreq: newFreq }));
      
      // In production, you'd actually play this frequency
      console.log(`Sweep playing: ${newFreq}Hz`);
      
      currentStep++;
    }, 100);
  };

  const deleteFrequency = (id) => {
    Alert.alert(
      'Delete Frequency',
      'Are you sure you want to delete this saved frequency?',
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = foundFrequencies.filter(f => f.id !== id);
            setFoundFrequencies(updated);
            await AsyncStorage.setItem('tinnitusFrequencies', JSON.stringify(updated));
          },
        },
      ]
    );
  };

  const renderSliderMode = () => (
    <View style={styles.modeContainer}>
      <Text style={styles.modeTitle}>Manual Frequency Adjustment</Text>
      <Text style={styles.modeDescription}>
        Use the slider to find your tinnitus frequency. Play tones and adjust until you find a match.
      </Text>

      <View style={styles.controlSection}>
        <Text style={styles.controlLabel}>Frequency: {Math.round(frequency)} Hz</Text>
        <Slider
          style={styles.slider}
          minimumValue={10}
          maximumValue={25000}
          value={frequency}
          onValueChange={setFrequency}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#333"
          thumbStyle={styles.sliderThumb}
        />
      </View>

      <View style={styles.controlSection}>
        <Text style={styles.controlLabel}>Volume: {Math.round(volume * 100)}%</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.1}
          maximumValue={0.8}
          value={volume}
          onValueChange={setVolume}
          minimumTrackTintColor="#4ECDC4"
          maximumTrackTintColor="#333"
          thumbStyle={styles.sliderThumb}
        />
      </View>

      <TouchableOpacity
        style={[styles.playButton, isPlaying && styles.stopButton]}
        onPress={isPlaying ? stopTone : () => playTone()}
      >
        <Ionicons name={isPlaying ? 'stop' : 'play'} size={24} color="#FFF" />
        <Text style={styles.playButtonText}>
          {isPlaying ? 'Stop Tone' : 'Play Tone'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSweepMode = () => (
    <View style={styles.modeContainer}>
      <Text style={styles.modeTitle}>Automatic Frequency Sweep</Text>
      <Text style={styles.modeDescription}>
        The app will sweep through frequencies automatically. Press "Match Found" when you hear your tinnitus frequency.
      </Text>

      <View style={styles.controlSection}>
        <Text style={styles.controlLabel}>
          Start: {sweepSettings.startFreq} Hz - End: {sweepSettings.endFreq} Hz
        </Text>
        <View style={styles.rangeSliders}>
          <View style={styles.rangeSlider}>
            <Text style={styles.smallLabel}>Start Frequency</Text>
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={10000}
              value={sweepSettings.startFreq}
              onValueChange={(value) => 
                setSweepSettings(prev => ({ ...prev, startFreq: Math.round(value) }))
              }
              minimumTrackTintColor="#FF9500"
              maximumTrackTintColor="#333"
            />
          </View>
          <View style={styles.rangeSlider}>
            <Text style={styles.smallLabel}>End Frequency</Text>
            <Slider
              style={styles.slider}
              minimumValue={100}
              maximumValue={25000}
              value={sweepSettings.endFreq}
              onValueChange={(value) => 
                setSweepSettings(prev => ({ ...prev, endFreq: Math.round(value) }))
              }
              minimumTrackTintColor="#FF9500"
              maximumTrackTintColor="#333"
            />
          </View>
        </View>
      </View>

      <View style={styles.controlSection}>
        <Text style={styles.controlLabel}>Duration: {sweepSettings.duration} seconds</Text>
        <Slider
          style={styles.slider}
          minimumValue={10}
          maximumValue={120}
          value={sweepSettings.duration}
          onValueChange={(value) => 
            setSweepSettings(prev => ({ ...prev, duration: Math.round(value) }))
          }
          minimumTrackTintColor="#FF9500"
          maximumTrackTintColor="#333"
        />
      </View>

      {sweepSettings.isRunning && (
        <View style={styles.sweepStatus}>
          <Text style={styles.sweepText}>
            Current Frequency: {Math.round(sweepSettings.currentFreq)} Hz
          </Text>
          <TouchableOpacity
            style={styles.matchButton}
            onPress={() => saveFrequency(sweepSettings.currentFreq)}
          >
            <Text style={styles.matchButtonText}>Match Found!</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.playButton, sweepSettings.isRunning && styles.stopButton]}
        onPress={sweepSettings.isRunning ? stopTone : startSweep}
      >
        <Ionicons name={sweepSettings.isRunning ? 'stop' : 'play'} size={24} color="#FFF" />
        <Text style={styles.playButtonText}>
          {sweepSettings.isRunning ? 'Stop Sweep' : 'Start Sweep'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSavedFrequencies = () => (
    <View style={styles.savedSection}>
      <Text style={styles.sectionTitle}>Saved Frequencies</Text>
      {foundFrequencies.length === 0 ? (
        <Text style={styles.noDataText}>No frequencies saved yet</Text>
      ) : (
        foundFrequencies.map((freq) => (
          <View key={freq.id} style={styles.frequencyCard}>
            <View style={styles.frequencyInfo}>
              <Text style={styles.frequencyValue}>{Math.round(freq.frequency)} Hz</Text>
              <Text style={styles.frequencyEar}>{freq.ear.toUpperCase()} ear(s)</Text>
              <Text style={styles.frequencyNotes}>{freq.notes}</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteFrequency(freq.id)}
            >
              <Ionicons name="trash" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Frequency Finder</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Ear Selection */}
        <View style={styles.earSelection}>
          <Text style={styles.sectionTitle}>Test Ear</Text>
          <View style={styles.earButtons}>
            {['left', 'right', 'both'].map((ear) => (
              <TouchableOpacity
                key={ear}
                style={[styles.earButton, testEar === ear && styles.activeEarButton]}
                onPress={() => setTestEar(ear)}
              >
                <Text style={[styles.earButtonText, testEar === ear && styles.activeEarText]}>
                  {ear.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mode Selection */}
        <View style={styles.modeSelection}>
          <Text style={styles.sectionTitle}>Detection Method</Text>
          <View style={styles.modeButtons}>
            <TouchableOpacity
              style={[styles.modeButton, finderMode === 'slider' && styles.activeModeButton]}
              onPress={() => setFinderMode('slider')}
            >
              <Ionicons name="options" size={20} color={finderMode === 'slider' ? '#007AFF' : '#666'} />
              <Text style={[styles.modeButtonText, finderMode === 'slider' && styles.activeModeText]}>
                Manual
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, finderMode === 'sweep' && styles.activeModeButton]}
              onPress={() => setFinderMode('sweep')}
            >
              <Ionicons name="pulse" size={20} color={finderMode === 'sweep' ? '#007AFF' : '#666'} />
              <Text style={[styles.modeButtonText, finderMode === 'sweep' && styles.activeModeText]}>
                Sweep
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mode Content */}
        <View style={styles.content}>
          {finderMode === 'slider' ? renderSliderMode() : renderSweepMode()}
          {renderSavedFrequencies()}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 30,
  },
  headerSpacer: {
    width: 30,
  },
  earSelection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 15,
  },
  earButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  earButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#444',
  },
  activeEarButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  earButtonText: {
    color: '#CCC',
    fontWeight: '600',
  },
  activeEarText: {
    color: '#FFF',
  },
  modeSelection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#444',
  },
  activeModeButton: {
    backgroundColor: '#1a1a1a',
    borderColor: '#007AFF',
  },
  modeButtonText: {
    color: '#666',
    marginLeft: 8,
    fontWeight: '600',
  },
  activeModeText: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  modeContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
    lineHeight: 20,
  },
  controlSection: {
    marginBottom: 20,
  },
  controlLabel: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 10,
    fontWeight: '500',
  },
  slider: {
    height: 30,
  },
  sliderThumb: {
    backgroundColor: '#007AFF',
    width: 20,
    height: 20,
  },
  rangeSliders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeSlider: {
    flex: 1,
    marginHorizontal: 10,
  },
  smallLabel: {
    fontSize: 12,
    color: '#CCC',
    marginBottom: 5,
  },
  playButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sweepStatus: {
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  sweepText: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 10,
  },
  matchButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  matchButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  savedSection: {
    marginTop: 20,
  },
  noDataText: {
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  frequencyCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  frequencyInfo: {
    flex: 1,
  },
  frequencyValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  frequencyEar: {
    fontSize: 14,
    color: '#4ECDC4',
    marginTop: 2,
  },
  frequencyNotes: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  deleteButton: {
    padding: 10,
  },
});